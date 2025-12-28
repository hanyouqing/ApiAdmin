import { VM } from 'vm2';
import axios from 'axios';
import { logger } from './logger.js';
import AutoTestResult from '../Models/AutoTestResult.js';
import Interface from '../Models/Interface.js';

export class AutoTestRunner {
  constructor() {
    this.records = [];
  }

  async runTask(task, environment, resultId) {
    const result = await AutoTestResult.findById(resultId);
    if (!result) {
      throw new Error('Test result not found');
    }

    try {
      // 记录任务和环境信息用于调试
      logger.info({ 
        taskId: task._id,
        taskName: task.name,
        testCasesCount: task.test_cases?.length || 0,
        hasEnvironment: !!environment,
        environmentId: environment?._id,
        environmentName: environment?.name,
        environmentBaseUrl: environment?.base_url,
      }, 'Starting auto test task execution');
      
      // 准备环境变量
      const envVars = environment?.variables || {};
      const envHeaders = environment?.headers || {};
      let baseUrl = (environment?.base_url || '').trim();
      
      // 记录环境信息用于调试
      logger.info({ 
        taskId: task._id, 
        environmentId: environment?._id,
        environmentName: environment?.name,
        hasEnvironment: !!environment,
        rawBaseUrl: baseUrl || '(empty)',
        environmentData: environment ? {
          _id: environment._id,
          name: environment.name,
          base_url: environment.base_url,
        } : null
      }, 'Auto test runner starting with environment');
      
      // 规范化 baseUrl
      if (baseUrl) {
        // 如果baseUrl只是 localhost:3000 这样的格式，添加协议
        if (!baseUrl.match(/^https?:\/\//)) {
          // 如果没有协议，添加 http:// 前缀（默认使用 http）
          baseUrl = `http://${baseUrl}`;
        }
        // 移除 baseUrl 末尾的斜杠（如果有）
        if (baseUrl.endsWith('/')) {
          baseUrl = baseUrl.slice(0, -1);
        }
      }
      
      // 如果没有配置baseUrl，记录错误
      if (!baseUrl) {
        const errorMsg = environment 
          ? `测试环境 "${environment.name}" 未配置 base_url`
          : '未配置测试环境，请在测试流水线中选择测试环境或在环境管理中创建默认环境';
        logger.error({ 
          taskId: task._id,
          environmentId: environment?._id,
          environmentName: environment?.name
        }, errorMsg);
      }

      // 按顺序执行测试用例
      const sortedCases = [...task.test_cases]
        .filter(tc => tc.enabled)
        .sort((a, b) => a.order - b.order);

      result.summary.total = sortedCases.length;
      
      // 检查接口是否已经被 populate（从 task 中）
      // 如果已经被 populate，直接使用；否则需要查询
      const interfaceMap = new Map();
      const interfaceIdsToQuery = [];
      
      for (const tc of sortedCases) {
        let interfaceId = null;
        let interfaceData = null;
        
        // 检查是否已经被 populate
        if (tc.interface_id && typeof tc.interface_id === 'object' && tc.interface_id._id) {
          // 已经被 populate，直接使用
          interfaceData = tc.interface_id;
          interfaceId = interfaceData._id.toString();
          interfaceMap.set(interfaceId, interfaceData);
        } else {
          // 需要查询
          if (typeof tc.interface_id === 'object') {
            interfaceId = tc.interface_id._id ? tc.interface_id._id.toString() : tc.interface_id.toString();
          } else {
            interfaceId = tc.interface_id.toString();
          }
          if (interfaceId && !interfaceMap.has(interfaceId)) {
            interfaceIdsToQuery.push(interfaceId);
          }
        }
      }
      
      // 查询未 populate 的接口
      if (interfaceIdsToQuery.length > 0) {
        const mongoose = (await import('mongoose')).default;
        const validIds = interfaceIdsToQuery.filter(id => mongoose.Types.ObjectId.isValid(id));
        
        if (validIds.length > 0) {
          const interfaces = await Interface.find({ _id: { $in: validIds } });
          for (const iface of interfaces) {
            interfaceMap.set(iface._id.toString(), iface);
          }
        }
      }
      
      logger.info({ 
        taskId: task._id,
        totalCases: sortedCases.length,
        populatedInterfaces: interfaceMap.size - interfaceIdsToQuery.length,
        queriedInterfaces: interfaceIdsToQuery.length,
        totalInterfaces: interfaceMap.size,
      }, 'Interfaces prepared for test cases');

      // 初始化结果数组，确保所有必需字段都有值
      result.results = sortedCases.map((tc, index) => {
        // 处理 interface_id 可能是对象的情况（populated）
        let interfaceIdStr = '';
        let interfaceIdObj = null;
        
        if (tc.interface_id) {
          if (typeof tc.interface_id === 'object') {
            // 处理 populated 对象
            interfaceIdObj = tc.interface_id;
            interfaceIdStr = tc.interface_id._id ? tc.interface_id._id.toString() : tc.interface_id.toString();
          } else {
            // 字符串或 ObjectId
            interfaceIdStr = tc.interface_id.toString();
          }
        }
        
        const interfaceData = interfaceIdStr ? interfaceMap.get(interfaceIdStr) : null;
        const interfaceName = interfaceData 
          ? (interfaceData.title || interfaceData.path || 'Unknown Interface')
          : 'Interface Not Found';
        const method = interfaceData?.method?.toUpperCase() || 'GET';
        let path = interfaceData?.path || '';
        
        // 记录接口信息用于调试
        if (!interfaceData && interfaceIdStr) {
          logger.error({ 
            taskId: task._id,
            testCaseIndex: index,
            testCaseOrder: tc.order,
            interfaceIdStr: interfaceIdStr,
            interfaceIdObj: interfaceIdObj,
            availableIds: Array.from(interfaceMap.keys()),
            totalInterfaces: interfaces.length,
          }, 'Interface not found in map during initialization');
        }
        
        // 确保 path 以 / 开头
        if (path && !path.startsWith('/')) {
          path = `/${path}`;
        }
        
        // 如果 path 为空，记录警告
        if (!path) {
          if (interfaceData) {
            logger.warn({ 
              taskId: task._id,
              interfaceId: interfaceIdStr,
              interfaceName: interfaceName,
              interfaceData: {
                _id: interfaceData._id,
                title: interfaceData.title,
                path: interfaceData.path,
                method: interfaceData.method,
              },
            }, 'Interface path is empty');
          } else {
            logger.error({ 
              taskId: task._id,
              interfaceId: interfaceIdStr,
              testCaseOrder: tc.order,
            }, 'Interface data not found, path will be empty');
          }
        }
        
        // 构建 URL：如果接口未找到，使用 baseUrl 作为 URL（会导致 404，但至少可以测试连接）
        const url = baseUrl 
          ? (path ? `${baseUrl}${path}` : baseUrl)
          : (path || '');
        
        logger.debug({ 
          taskId: task._id,
          testCaseIndex: index,
          interfaceId: interfaceIdStr,
          interfaceName: interfaceName,
          method: method,
          path: path || '(empty)',
          baseUrl: baseUrl || '(empty)',
          finalUrl: url,
        }, 'Initialized test case result');

        // 确保 interface_id 保存为字符串 ID
        let savedInterfaceId = interfaceIdStr;
        if (!savedInterfaceId && tc.interface_id) {
          if (typeof tc.interface_id === 'object' && tc.interface_id._id) {
            savedInterfaceId = tc.interface_id._id.toString();
          } else {
            savedInterfaceId = tc.interface_id.toString();
          }
        }
        
        return {
          interface_id: savedInterfaceId,
          interface_name: interfaceName,
          order: tc.order,
          status: 'pending',
          request: {
            method: method,
            url: url,
            headers: {},
            body: null,
            query: {},
          },
          response: {
            status_code: null,
            headers: {},
            body: null,
            duration: 0,
          },
          error: {
            message: '',
            stack: '',
            code: '',
          },
          assertion_result: {
            passed: false,
            message: '',
            errors: [],
          },
          duration: 0,
          started_at: null,
          completed_at: null,
        };
      });

      await result.save();

      // 执行每个测试用例
      for (let i = 0; i < sortedCases.length; i++) {
        const testCase = sortedCases[i];
        const resultItem = result.results[i];

        try {
          // 处理 interface_id 可能是对象的情况（populated）
          let interfaceIdStr = '';
          let interfaceData = null;
          
          if (testCase.interface_id) {
            if (typeof testCase.interface_id === 'object' && testCase.interface_id._id) {
              // 已经被 populate，直接使用
              interfaceData = testCase.interface_id;
              interfaceIdStr = interfaceData._id.toString();
            } else if (typeof testCase.interface_id === 'object') {
              // 对象但没有 _id，尝试 toString
              interfaceIdStr = testCase.interface_id.toString();
              interfaceData = interfaceMap.get(interfaceIdStr);
            } else {
              // 字符串或 ObjectId
              interfaceIdStr = testCase.interface_id.toString();
              interfaceData = interfaceMap.get(interfaceIdStr);
            }
          }
          
          // 如果还没有获取到接口数据，从 map 中查找
          if (!interfaceData && interfaceIdStr) {
            interfaceData = interfaceMap.get(interfaceIdStr);
          }
          
          if (!interfaceData) {
            const errorUrl = resultItem.request.url || baseUrl || 'unknown';
            logger.error({ 
              taskId: task._id,
              testCaseIndex: i,
              testCaseOrder: testCase.order,
              interfaceIdStr: interfaceIdStr || '(empty)',
              testCaseInterfaceId: testCase.interface_id,
              interfaceIdType: typeof testCase.interface_id,
              availableIds: Array.from(interfaceMap.keys()),
              mapSize: interfaceMap.size,
              errorUrl: errorUrl,
            }, 'Interface not found during execution');
            
            resultItem.status = 'error';
            resultItem.error = {
              message: `Interface Not Found ${resultItem.request.method} ${errorUrl}`,
              stack: `Interface ID: ${interfaceIdStr || 'unknown'}`,
              code: 'INTERFACE_NOT_FOUND',
            };
            resultItem.completed_at = new Date();
            result.summary.error++;
            await result.save();
            continue;
          }

          // 更新接口名称（可能已更新）
          resultItem.interface_name = interfaceData.title || interfaceData.path || 'Unknown Interface';
          resultItem.status = 'running';
          resultItem.started_at = new Date();
          await result.save();

          // 构建请求
          const method = interfaceData.method?.toUpperCase() || 'GET';
          let path = interfaceData.path || '';

          // 确保 path 以 / 开头
          if (path && !path.startsWith('/')) {
            path = `/${path}`;
          }

          // 替换路径参数
          const pathParams = this.resolveVariables(testCase.path_params || {}, envVars);
          Object.keys(pathParams).forEach((key) => {
            path = path.replace(`{${key}}`, pathParams[key]);
            path = path.replace(`:${key}`, pathParams[key]);
          });

          // 构建查询参数
          const queryParams = this.resolveVariables(testCase.query_params || {}, envVars);

          // 构建请求体
          let requestBody = null;
          if (['POST', 'PUT', 'PATCH'].includes(method)) {
            if (testCase.custom_data && Object.keys(testCase.custom_data).length > 0) {
              requestBody = this.resolveVariables(testCase.custom_data, envVars);
            } else if (interfaceData.req_body) {
              requestBody = this.resolveVariables(interfaceData.req_body, envVars);
            }
          }

          // 构建请求头
          // 处理 custom_headers：可能是对象或字符串（JSON）
          let customHeaders = testCase.custom_headers || {};
          if (typeof customHeaders === 'string') {
            try {
              customHeaders = JSON.parse(customHeaders);
            } catch (e) {
              logger.warn({ taskId: task._id, testCaseIndex: i, error: e.message }, 'Failed to parse custom_headers as JSON');
              customHeaders = {};
            }
          }
          
          // 先处理环境变量和自定义请求头，准备移除占位符
          const resolvedCustomHeaders = this.resolveVariables(customHeaders, envVars);
          
          // 合并请求头：环境变量头 -> 自定义头（自定义头优先级更高）
          const headers = {
            'Content-Type': 'application/json',
            ...envHeaders,
            ...resolvedCustomHeaders,
          };
          
          // 移除占位符 Authorization 头（不区分大小写）
          // 检查所有可能的 Authorization 头键名
          const authHeaderKeys = Object.keys(headers).filter(key => 
            key.toLowerCase() === 'authorization'
          );
          
          for (const key of authHeaderKeys) {
            const authValue = headers[key];
            // 移除以下占位符值：
            // - 'Bearer token'
            // - 'Bearer <token>'
            // - 'token'
            // - 空字符串或只包含空白字符
            const authValueStr = String(authValue || '');
            const shouldRemove = (
              !authValue || 
              authValueStr === '' ||
              authValueStr === 'Bearer token' ||
              authValueStr === 'Bearer <token>' ||
              authValueStr === 'token' ||
              authValueStr.trim() === '' ||
              authValueStr.toLowerCase() === 'bearer token' ||
              authValueStr.toLowerCase().trim() === 'bearer'
            );
            
            if (shouldRemove) {
              delete headers[key];
              logger.debug({ 
                taskId: task._id, 
                testCaseIndex: i,
                removedHeader: key,
                removedValue: authValue 
              }, 'Removed placeholder Authorization header');
            }
          }

          // 构建完整URL
          // 如果 baseUrl 为空，记录错误并标记测试用例为失败
          let url;
          if (baseUrl) {
            // 如果 path 为空，使用 baseUrl（会导致 404，但至少可以测试连接）
            url = path ? `${baseUrl}${path}` : baseUrl;
            
            // 如果 path 为空，记录警告
            if (!path) {
              logger.warn({ 
                taskId: task._id, 
                interfaceId: interfaceData._id,
                interfaceName: interfaceData.title || interfaceData.path,
                baseUrl: baseUrl,
                url: url,
              }, 'Interface path is empty, using baseUrl only');
            }
          } else {
            // 如果没有 baseUrl，标记为错误
            logger.error({ 
              taskId: task._id, 
              interfaceId: interfaceData._id,
              interfaceName: interfaceData.title || interfaceData.path,
              path: path
            }, 'No base URL configured for test environment. Cannot build request URL.');
            
            resultItem.status = 'error';
            resultItem.error = {
              message: '测试环境未配置base_url，无法构建请求URL。请在环境管理中配置测试环境的基础URL。',
              stack: '',
              code: 'NO_BASE_URL',
            };
            resultItem.completed_at = new Date();
            result.summary.error++;
            await result.save();
            continue;
          }
          
          // 记录构建的URL和请求头用于调试
          logger.debug({ 
            taskId: task._id, 
            interfaceId: interfaceData._id,
            baseUrl: baseUrl,
            path: path,
            finalUrl: url,
            headers: headers,
            hasAuthHeader: !!(headers['Authorization'] || headers['authorization'])
          }, 'Built request URL and headers');

          // 保存请求信息（使用最终处理后的请求头）
          resultItem.request = {
            method,
            url,
            headers,
            body: requestBody,
            query: queryParams,
          };

          await result.save();

          // 发送请求
          const startTime = Date.now();
          let response;

          try {
            response = await axios({
              method,
              url,
              params: queryParams,
              data: requestBody,
              headers,
              timeout: 30000,
              validateStatus: () => true, // 接受所有状态码
            });

            const duration = Date.now() - startTime;

            // 确保 status_code 是数字类型
            const statusCode = Number(response.status) || 0;
            
            // 记录请求和响应的详细信息用于调试
            logger.info({ 
              taskId: task._id,
              testCaseIndex: i,
              url: url,
              method: method,
              requestHeaders: headers,
              responseStatus: response.status,
              responseStatusType: typeof response.status,
              responseStatusCode: statusCode,
              responseHeaders: response.headers,
              responseData: response.data,
              responseDataType: typeof response.data,
              hasAssertionScript: !!(testCase.assertion_script && testCase.assertion_script.trim()),
              assertionScriptLength: testCase.assertion_script ? testCase.assertion_script.length : 0,
            }, 'HTTP request completed');

            resultItem.response = {
              status_code: statusCode,
              headers: response.headers,
              body: response.data,
              duration,
            };

            resultItem.duration = duration;

            // 记录响应信息用于调试
            logger.info({ 
              taskId: task._id,
              testCaseIndex: i,
              interfaceId: interfaceData._id,
              url: url,
              method: method,
              statusCode: statusCode,
              statusCodeType: typeof statusCode,
              responseBody: typeof response.data === 'object' ? JSON.stringify(response.data).substring(0, 200) : String(response.data).substring(0, 200),
            }, 'Test case response received');

            // 执行断言
            // 检查是否有有效的断言脚本（非空且非空白字符）
            const hasAssertionScript = testCase.assertion_script && 
                                      typeof testCase.assertion_script === 'string' && 
                                      testCase.assertion_script.trim().length > 0;
            
            logger.info({ 
              taskId: task._id,
              testCaseIndex: i,
              hasAssertionScript: hasAssertionScript,
              assertionScriptLength: testCase.assertion_script ? testCase.assertion_script.length : 0,
              assertionScriptPreview: testCase.assertion_script ? testCase.assertion_script.substring(0, 100) : null,
            }, 'Checking assertion script');
            
            if (hasAssertionScript) {
              logger.debug({ 
                taskId: task._id,
                testCaseIndex: i,
                assertionScript: testCase.assertion_script.substring(0, 200),
              }, 'Executing custom assertion script');
              
              const assertionResult = await this.executeAssertions(
                testCase.assertion_script,
                response,
                resultItem.request
              );
              
              logger.info({ 
                taskId: task._id,
                testCaseIndex: i,
                assertionPassed: assertionResult.passed,
                assertionMessage: assertionResult.message,
                assertionErrors: assertionResult.errors,
                statusCode: statusCode,
              }, 'Assertion result');
              
              resultItem.assertion_result = assertionResult;
              resultItem.status = assertionResult.passed ? 'passed' : 'failed';
            } else {
              // 默认断言：2xx 状态码为通过
              const passed = statusCode >= 200 && statusCode < 300;
              
              logger.info({ 
                taskId: task._id,
                testCaseIndex: i,
                statusCode: statusCode,
                statusCodeType: typeof statusCode,
                passed: passed,
                statusCheck: `${statusCode} >= 200 && ${statusCode} < 300`,
                responseBody: typeof response.data === 'object' ? JSON.stringify(response.data).substring(0, 200) : String(response.data).substring(0, 200),
              }, 'Default assertion check');
              
              resultItem.assertion_result = {
                passed,
                message: passed ? 'Request succeeded' : `Request failed with status ${statusCode}`,
                errors: passed ? [] : [`HTTP ${statusCode}`],
              };
              resultItem.status = passed ? 'passed' : 'failed';
              
              // 如果失败，记录详细信息
              if (!passed) {
                logger.warn({ 
                  taskId: task._id,
                  testCaseIndex: i,
                  interfaceId: interfaceData._id,
                  url: url,
                  method: method,
                  statusCode: statusCode,
                  statusCodeType: typeof statusCode,
                  originalStatus: response.status,
                  responseBody: typeof response.data === 'object' ? JSON.stringify(response.data).substring(0, 500) : String(response.data).substring(0, 500),
                  requestHeaders: headers,
                  responseHeaders: response.headers,
                }, 'Test case failed: non-2xx status code');
              } else {
                logger.info({ 
                  taskId: task._id,
                  testCaseIndex: i,
                  statusCode: statusCode,
                  url: url,
                }, 'Test case passed with default assertion');
              }
            }

            if (resultItem.status === 'passed') {
              result.summary.passed++;
            } else {
              result.summary.failed++;
            }
          } catch (error) {
            const duration = Date.now() - startTime;
            resultItem.status = 'error';
            resultItem.error = {
              message: error.message || 'Request failed',
              stack: error.stack || '',
              code: error.code || 'REQUEST_ERROR',
            };
            resultItem.duration = duration;
            result.summary.error++;
          }

          resultItem.completed_at = new Date();

          // 保存响应到记录中，供后续用例使用
          if (resultItem.response) {
            this.records.push({
              key: testCase.interface_id.toString(),
              request: resultItem.request,
              response: resultItem.response,
            });
          }
        } catch (error) {
          logger.error({ error, testCase: testCase.interface_id }, 'Test case execution error');
          resultItem.status = 'error';
          resultItem.error = {
            message: error.message || 'Unknown error',
            stack: error.stack || '',
            code: 'EXECUTION_ERROR',
          };
          resultItem.completed_at = new Date();
          result.summary.error++;
        }

        await result.save();
      }

      // 更新最终状态
      result.status = result.summary.failed > 0 || result.summary.error > 0 ? 'failed' : 'passed';
      result.completed_at = new Date();
      result.duration = result.completed_at - result.started_at;

      await result.save();

      logger.info({ taskId: task._id, resultId, status: result.status }, 'Auto test task completed');

      // TODO: 发送通知（如果配置了）
      if (task.notification?.enabled) {
        const shouldNotify =
          (task.notification.on_success && result.status === 'passed') ||
          (task.notification.on_failure && result.status === 'failed');

        if (shouldNotify && task.notification.webhook_url) {
          // TODO: 发送 webhook 通知
        }
      }
    } catch (error) {
      logger.error({ error, resultId }, 'Auto test task execution failed');
      const result = await AutoTestResult.findById(resultId);
      if (result) {
        result.status = 'error';
        result.completed_at = new Date();
        await result.save();
      }
    }
  }

  resolveVariables(data, envVars) {
    if (typeof data === 'string') {
      return this.resolveVariableExpression(data, envVars);
    } else if (Array.isArray(data)) {
      return data.map((item) => this.resolveVariables(item, envVars));
    } else if (data && typeof data === 'object') {
      const resolved = {};
      for (const [key, value] of Object.entries(data)) {
        resolved[key] = this.resolveVariables(value, envVars);
      }
      return resolved;
    }
    return data;
  }

  resolveVariableExpression(expression, envVars) {
    if (typeof expression !== 'string') {
      return expression;
    }

    // 替换环境变量 ${VAR_NAME}
    let resolved = expression;
    const envVarPattern = /\$\{([\w.]+)\}/g;
    resolved = resolved.replace(envVarPattern, (match, varName) => {
      const value = this.getNestedValue(envVars, varName);
      return value !== undefined ? String(value) : match;
    });

    // 替换前一个请求的响应数据 $.records[0].response.body.data.id
    const recordPattern = /\$\.records\[(\d+)\]\.(request|response)\.(body|headers|query)\.([\w.]+)/g;
    resolved = resolved.replace(recordPattern, (match, index, type, source, path) => {
      const record = this.records[parseInt(index)];
      if (!record) {
        return match;
      }

      let data;
      if (type === 'request') {
        if (source === 'body') {
          data = record.request.body;
        } else if (source === 'headers') {
          data = record.request.headers;
        } else if (source === 'query') {
          data = record.request.query;
        }
      } else if (type === 'response') {
        if (source === 'body') {
          data = record.response.body;
        } else if (source === 'headers') {
          data = record.response.headers;
        }
      }

      const value = this.getNestedValue(data, path);
      return value !== undefined ? String(value) : match;
    });

    // 尝试解析 JSON
    try {
      if (resolved.startsWith('{') || resolved.startsWith('[')) {
        return JSON.parse(resolved);
      }
    } catch (error) {
      // 不是 JSON，返回字符串
    }

    return resolved;
  }

  getNestedValue(obj, path) {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }

    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    return value;
  }

  // 执行单个测试用例
  async runSingleCase(task, testCaseIndex, environment) {
    if (!task || !task.test_cases || testCaseIndex < 0 || testCaseIndex >= task.test_cases.length) {
      throw new Error('Invalid test case index');
    }

    const testCase = task.test_cases[testCaseIndex];
    if (!testCase.enabled) {
      throw new Error('Test case is disabled');
    }

    // 准备环境变量
    const envVars = environment?.variables || {};
    const envHeaders = environment?.headers || {};
    let baseUrl = (environment?.base_url || '').trim();

    // 规范化 baseUrl
    if (baseUrl) {
      baseUrl = baseUrl.replace(/\/+$/, '');
    }

    // 获取接口数据
    let interfaceData = null;
    let interfaceIdStr = '';
    
    if (testCase.interface_id) {
      if (typeof testCase.interface_id === 'object' && testCase.interface_id._id) {
        interfaceData = testCase.interface_id;
        interfaceIdStr = interfaceData._id.toString();
      } else {
        interfaceIdStr = testCase.interface_id.toString();
        interfaceData = await Interface.findById(interfaceIdStr);
      }
    }

    if (!interfaceData) {
      throw new Error(`Interface not found: ${interfaceIdStr}`);
    }

    // 构建请求
    const method = interfaceData.method?.toUpperCase() || 'GET';
    let path = interfaceData.path || '';

    // 确保 path 以 / 开头
    if (path && !path.startsWith('/')) {
      path = `/${path}`;
    }

    // 替换路径参数
    const pathParams = this.resolveVariables(testCase.path_params || {}, envVars);
    Object.keys(pathParams).forEach((key) => {
      path = path.replace(`{${key}}`, pathParams[key]);
      path = path.replace(`:${key}`, pathParams[key]);
    });

    // 构建查询参数
    const queryParams = this.resolveVariables(testCase.query_params || {}, envVars);

    // 构建请求体
    let requestBody = null;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (testCase.custom_data && Object.keys(testCase.custom_data).length > 0) {
        requestBody = this.resolveVariables(testCase.custom_data, envVars);
      } else if (interfaceData.req_body) {
        requestBody = this.resolveVariables(interfaceData.req_body, envVars);
      }
    }

    // 构建请求头
    let customHeaders = testCase.custom_headers || {};
    if (typeof customHeaders === 'string') {
      try {
        customHeaders = JSON.parse(customHeaders);
      } catch (e) {
        customHeaders = {};
      }
    }

    const resolvedCustomHeaders = this.resolveVariables(customHeaders, envVars);
    const headers = {
      'Content-Type': 'application/json',
      ...envHeaders,
      ...resolvedCustomHeaders,
    };

    // 移除占位符 Authorization 头
    const authHeaderKeys = Object.keys(headers).filter(key => 
      key.toLowerCase() === 'authorization'
    );

    for (const key of authHeaderKeys) {
      const authValue = headers[key];
      const authValueStr = String(authValue || '');
      const shouldRemove = (
        !authValue || 
        authValueStr === '' ||
        authValueStr === 'Bearer token' ||
        authValueStr === 'Bearer <token>' ||
        authValueStr === 'token' ||
        authValueStr.trim() === '' ||
        authValueStr.toLowerCase() === 'bearer token' ||
        authValueStr.toLowerCase().trim() === 'bearer'
      );
      
      if (shouldRemove) {
        delete headers[key];
      }
    }

    // 构建完整URL
    if (!baseUrl) {
      throw new Error('测试环境未配置base_url，无法构建请求URL');
    }

    const url = path ? `${baseUrl}${path}` : baseUrl;

    const request = {
      method,
      url,
      headers,
      body: requestBody,
      query: queryParams,
    };

    // 发送请求
    const startTime = Date.now();
    let response;
    let error = null;

    try {
      response = await axios({
        method,
        url,
        params: queryParams,
        data: requestBody,
        headers,
        timeout: 30000,
        validateStatus: () => true, // 接受所有状态码
      });

      const duration = Date.now() - startTime;

      const responseData = {
        status_code: response.status,
        headers: response.headers,
        body: response.data,
        duration,
      };

      // 执行断言
      let assertionResult = null;
      if (testCase.assertion_script && testCase.assertion_script.trim()) {
        assertionResult = await this.executeAssertions(
          testCase.assertion_script,
          response,
          request
        );
      } else {
        // 默认断言：2xx 状态码为通过
        const passed = response.status >= 200 && response.status < 300;
        assertionResult = {
          passed,
          message: passed ? 'Request succeeded' : `Request failed with status ${response.status}`,
          errors: passed ? [] : [`HTTP ${response.status}`],
        };
      }

      return {
        success: true,
        request,
        response: responseData,
        assertion_result: assertionResult,
        duration: Date.now() - startTime,
        status: assertionResult.passed ? 'passed' : 'failed',
      };
    } catch (err) {
      const duration = Date.now() - startTime;
      error = {
        message: err.message || 'Request failed',
        stack: err.stack || '',
        code: err.code || 'REQUEST_ERROR',
      };

      return {
        success: false,
        request,
        response: null,
        error,
        duration: Date.now() - startTime,
        status: 'error',
      };
    }
  }

  async executeAssertions(script, response, request) {
    try {
      // 确保状态码是数字类型
      const statusCode = Number(response.status) || 0;
      
      // 创建断言函数
      const assertFunctions = {
        equal: (actual, expected, message) => {
          if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, but got ${actual}`);
          }
        },
        deepEqual: (actual, expected, message) => {
          if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(message || 'Objects are not deeply equal');
          }
        },
        ok: (value, message) => {
          if (!value) {
            throw new Error(message || 'Assertion failed');
          }
        },
        notEqual: (actual, expected, message) => {
          if (actual === expected) {
            throw new Error(message || `Expected not ${expected}, but got ${actual}`);
          }
        },
        status: (code, message) => {
          const expectedCode = Number(code) || 0;
          if (statusCode !== expectedCode) {
            throw new Error(message || `Expected status ${expectedCode}, but got ${statusCode}`);
          }
        },
      };

      const sandbox = {
        assert: assertFunctions,
        status: statusCode, // 使用数字类型的状态码
        body: response.data,
        headers: response.headers,
        request: {
          body: request.body,
          headers: request.headers,
          query: request.query,
        },
        records: this.records,
        log: (...args) => logger.info({ testAssertion: true }, ...args),
        console: {
          log: (...args) => logger.info({ testAssertion: true }, ...args),
          error: (...args) => logger.error({ testAssertion: true }, ...args),
          warn: (...args) => logger.warn({ testAssertion: true }, ...args),
        },
      };
      
      logger.debug({ 
        statusCode: statusCode,
        statusType: typeof statusCode,
        bodyType: typeof response.data,
        bodyKeys: typeof response.data === 'object' && response.data !== null ? Object.keys(response.data) : null,
      }, 'Assertion sandbox prepared');

      // 使用 VM2 安全执行断言脚本
      const vm = new VM({
        timeout: 10000,
        sandbox,
        eval: false,
        wasm: false,
      });

      const wrappedScript = `
        (function() {
          try {
            ${script}
            return { passed: true, message: 'All assertions passed' };
          } catch (error) {
            return { passed: false, message: error.message, errors: [error.message] };
          }
        })();
      `;

      const result = vm.run(wrappedScript);

      return {
        passed: result.passed || false,
        message: result.message || 'Assertion completed',
        errors: result.errors || [],
      };
    } catch (error) {
      logger.error({ error, script: script.substring(0, 100) }, 'Assertion script execution error');
      return {
        passed: false,
        message: `Assertion script execution failed: ${error.message}`,
        errors: [error.message],
      };
    }
  }
}

