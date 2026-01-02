import { VM } from 'vm2';
import axios from 'axios';
import { logger } from './logger.js';
import AutoTestResult from '../Models/AutoTestResult.js';
import AutoTestTask from '../Models/AutoTestTask.js';
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
      // 优先使用环境的 base_url，如果没有则使用任务的 base_url，如果都为空则使用主机地址
      // 优先级：task.base_url > environment.base_url
      // 因为任务的 base_url 是针对特定流水线的配置，应该优先于环境变量的通用配置
      // 处理 Mongoose 文档：使用 .get() 方法或直接访问属性
      const taskBaseUrl = task?.base_url || (task?.get ? task.get('base_url') : null) || '';
      const envBaseUrl = environment?.base_url || (environment?.get ? environment.get('base_url') : null) || '';
      let baseUrl = (taskBaseUrl || envBaseUrl || '').trim();
      
      // 如果 base_url 为空，使用主机地址作为默认值
      if (!baseUrl) {
        const config = (await import('./config.js')).default;
        // 优先使用 APP_URL，如果没有则使用 localhost:PORT
        baseUrl = config.APP_URL || `http://localhost:${config.PORT || 3000}`;
        logger.info({ 
          taskId: task._id,
          defaultBaseUrl: baseUrl
        }, 'Using default host address as base_url');
      }
      
      // 记录环境信息用于调试
      logger.info({ 
        taskId: task._id, 
        environmentId: environment?._id,
        environmentName: environment?.name,
        hasEnvironment: !!environment,
        taskBaseUrl: taskBaseUrl || '(empty)',
        environmentBaseUrl: envBaseUrl || '(empty)',
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
          // 使用 populate 获取 project_id，以便后续路径参数解析
          const interfaces = await Interface.find({ _id: { $in: validIds } })
            .populate('project_id', '_id')
            .lean();
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
        // 优先使用 title，如果没有则使用 method + path 的组合，最后才使用 'Unknown Interface'
        const interfaceName = interfaceData 
          ? (interfaceData.title || 
             (interfaceData.method && interfaceData.path 
               ? `${interfaceData.method} ${interfaceData.path}`.trim()
               : interfaceData.path) ||
             'Unknown Interface')
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
          
          // 如果接口数据没有 populate project_id，尝试获取
          if (interfaceData && !interfaceData.project_id && interfaceIdStr) {
            try {
              const populatedInterface = await Interface.findById(interfaceIdStr).populate('project_id', '_id').lean();
              if (populatedInterface && populatedInterface.project_id) {
                interfaceData.project_id = populatedInterface.project_id;
              }
            } catch (e) {
              logger.warn({ error: e.message, interfaceId: interfaceIdStr }, 'Failed to populate project_id for interface');
            }
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
          // 只有在接口名称未设置或者是占位符时才更新
          // 优先使用 title，如果没有则使用 method + path 的组合，最后才使用 'Unknown Interface'
          if (!resultItem.interface_name || 
              resultItem.interface_name === 'Unknown Interface' || 
              resultItem.interface_name === 'Interface Not Found' ||
              resultItem.interface_name === '未知接口') {
            const interfaceName = interfaceData.title || 
                                 (interfaceData.method && interfaceData.path 
                                   ? `${interfaceData.method} ${interfaceData.path}`.trim()
                                   : interfaceData.path) ||
                                 'Unknown Interface';
            resultItem.interface_name = interfaceName;
            
            // 记录接口名称设置情况，用于调试
            if (interfaceName === 'Unknown Interface') {
              logger.warn({ 
                taskId: task._id,
                testCaseIndex: i,
                interfaceId: interfaceIdStr,
                interfaceData: {
                  _id: interfaceData._id,
                  title: interfaceData.title,
                  path: interfaceData.path,
                  method: interfaceData.method,
                  hasTitle: !!interfaceData.title,
                  hasPath: !!interfaceData.path,
                  hasMethod: !!interfaceData.method
                }
              }, 'Interface name set to Unknown Interface - interface data may be incomplete');
            }
          }
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

          // 提取路径中的所有参数占位符
          const pathParamNames = [];
          const pathParamRegex = /\{(\w+)\}/g;
          let match;
          while ((match = pathParamRegex.exec(path)) !== null) {
            if (!pathParamNames.includes(match[1])) {
              pathParamNames.push(match[1]);
            }
          }

          // 替换路径参数
          const pathParams = this.resolveVariables(testCase.path_params || {}, envVars);
          
          // 尝试从任务或接口数据中获取项目ID（如果路径参数需要projectId）
          let projectId = null;
          if (task.project_id) {
            if (typeof task.project_id === 'object' && task.project_id._id) {
              projectId = task.project_id._id.toString();
            } else {
              projectId = task.project_id.toString();
            }
          } else if (interfaceData.project_id) {
            if (typeof interfaceData.project_id === 'object' && interfaceData.project_id._id) {
              projectId = interfaceData.project_id._id.toString();
            } else {
              projectId = interfaceData.project_id.toString();
            }
          }
          
          // 对于未设置的路径参数，尝试从多个来源获取
          for (const paramName of pathParamNames) {
            // 检查参数是否存在且有效（不为空字符串）
            if (!pathParams[paramName] || pathParams[paramName] === '' || pathParams[paramName] === null || pathParams[paramName] === undefined) {
              let paramValue = null;
              let source = '';
              
              // 1. 尝试从环境变量中获取（支持多种命名方式）
              paramValue = envVars[paramName] || 
                          envVars[paramName.toLowerCase()] || 
                          envVars[paramName.toUpperCase()] ||
                          envVars[`${paramName}Id`] ||
                          envVars[`${paramName.toLowerCase()}Id`] ||
                          envVars[`${paramName}_id`] ||
                          envVars[`${paramName.toLowerCase()}_id`];
              
              if (paramValue !== undefined && paramValue !== null && paramValue !== '') {
                source = 'environment variable';
              }
              
              // 2. 如果是 projectId 且还没有值，尝试从任务或接口中获取
              if (!paramValue && (paramName === 'projectId' || paramName === 'project_id' || paramName.toLowerCase() === 'projectid') && projectId) {
                paramValue = projectId;
                source = 'task/interface project_id';
              }
              
              if (paramValue !== undefined && paramValue !== null && paramValue !== '') {
                pathParams[paramName] = String(paramValue);
                logger.info({ 
                  taskId: task._id,
                  testCaseIndex: i,
                  paramName, 
                  value: String(paramValue).substring(0, 50),
                  source: source
                }, `Using path param ${paramName} from ${source}`);
              } else {
                // 如果仍然没有值，记录错误
                logger.error({ 
                  taskId: task._id,
                  testCaseIndex: i,
                  paramName, 
                  path, 
                  availableEnvVars: Object.keys(envVars),
                  testCasePathParams: Object.keys(testCase.path_params || {}),
                  pathParams: pathParams,
                  hasProjectId: !!projectId,
                  projectId: projectId ? projectId.substring(0, 50) : null
                }, `Path parameter ${paramName} not found in path_params or environment variables - request will fail`);
              }
            } else {
              logger.debug({ 
                taskId: task._id,
                testCaseIndex: i,
                paramName,
                value: String(pathParams[paramName]).substring(0, 50),
                source: 'test case path_params'
              }, 'Using path param from test case');
            }
          }
          
          // 使用全局替换确保所有匹配的参数都被替换
          Object.keys(pathParams).forEach((key) => {
            const value = pathParams[key];
            if (value !== undefined && value !== null && value !== '') {
              path = path.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
              path = path.replace(new RegExp(`:${key}`, 'g'), String(value));
            }
          });
          
          // 检查是否还有未替换的参数
          const remainingParams = path.match(/\{(\w+)\}/g);
          if (remainingParams && remainingParams.length > 0) {
            logger.warn({ 
              taskId: task._id,
              testCaseIndex: i,
              remainingParams, 
              path, 
              pathParams,
              hasProjectId: !!projectId,
              projectId: projectId ? projectId.substring(0, 50) : null
            }, 'Some path parameters were not replaced');
            
            // 尝试从环境变量或任务数据中获取缺失的参数（支持多种命名方式）
            for (const paramMatch of remainingParams) {
              const paramName = paramMatch.replace(/[{}]/g, '');
              let paramValue = null;
              
              // 1. 尝试从环境变量中获取（支持多种命名方式）
              paramValue = envVars[paramName] || 
                          envVars[paramName.toLowerCase()] || 
                          envVars[paramName.toUpperCase()] ||
                          envVars[`${paramName}Id`] ||
                          envVars[`${paramName.toLowerCase()}Id`] ||
                          envVars[`${paramName}_id`] ||
                          envVars[`${paramName.toLowerCase()}_id`];
              
              // 2. 如果是 projectId 且还没有值，尝试从任务或接口中获取
              if (!paramValue && (paramName === 'projectId' || paramName === 'project_id' || paramName.toLowerCase() === 'projectid') && projectId) {
                paramValue = projectId;
              }
              
              if (paramValue !== undefined && paramValue !== null && paramValue !== '') {
                path = path.replace(new RegExp(`\\{${paramName}\\}`, 'g'), String(paramValue));
                pathParams[paramName] = String(paramValue);
                logger.info({ 
                  taskId: task._id,
                  testCaseIndex: i,
                  paramName, 
                  value: String(paramValue).substring(0, 50),
                  source: paramValue === projectId ? 'task/interface project_id (fallback)' : 'environment variable (fallback)'
                }, `Using path param ${paramName} from fallback source`);
              } else {
                logger.error({ 
                  taskId: task._id,
                  testCaseIndex: i,
                  paramName, 
                  path, 
                  availableEnvVars: Object.keys(envVars),
                  testCasePathParams: Object.keys(testCase.path_params || {}),
                  hasProjectId: !!projectId,
                  projectId: projectId ? projectId.substring(0, 50) : null
                }, `Cannot find value for path parameter ${paramName} - URL will contain placeholder`);
              }
            }
          }

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
          
          // 获取任务的通用 headers
          let commonHeaders = task.common_headers || {};
          // 如果 common_headers 是字符串，尝试解析为对象
          if (typeof commonHeaders === 'string') {
            try {
              commonHeaders = JSON.parse(commonHeaders);
            } catch (e) {
              logger.warn({ taskId: task._id, testCaseIndex: i, error: e.message }, 'Failed to parse task common_headers as JSON');
              commonHeaders = {};
            }
          }
          const resolvedCommonHeaders = this.resolveVariables(commonHeaders, envVars);
          
          // 合并请求头：环境变量头 -> 通用头 -> 自定义头（自定义头优先级最高）
          const headers = {
            ...envHeaders,
            ...resolvedCommonHeaders,
            ...resolvedCustomHeaders,
          };

          // 对于需要 body 的请求方法，设置 Content-Type
          // GET、HEAD、OPTIONS 等请求不需要 Content-Type
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            // 如果用户没有自定义 Content-Type，则设置默认值
            if (!headers['Content-Type'] && !headers['content-type']) {
              headers['Content-Type'] = 'application/json';
            }
          }
          
          // 处理 Authorization 头（不区分大小写）
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
              
              // 尝试从环境变量中获取认证令牌
              let tokenFromEnv = envVars.token || envVars.authToken || envVars.AUTH_TOKEN || envVars.TOKEN;
              
              // 如果环境变量中没有，尝试从通用 headers 中获取
              if (!tokenFromEnv && resolvedCommonHeaders && resolvedCommonHeaders['Authorization']) {
                const commonAuth = resolvedCommonHeaders['Authorization'];
                const commonAuthStr = String(commonAuth || '');
                // 检查通用 headers 中的 Authorization 是否是有效的 token（不是占位符）
                if (commonAuthStr && 
                    commonAuthStr !== 'Bearer token' && 
                    commonAuthStr !== 'Bearer <token>' &&
                    !commonAuthStr.toLowerCase().includes('token') &&
                    commonAuthStr.trim() !== '') {
                  tokenFromEnv = commonAuthStr.replace(/^Bearer\s+/i, '');
                }
              }
              
              if (tokenFromEnv) {
                headers['Authorization'] = tokenFromEnv.startsWith('Bearer ') 
                  ? tokenFromEnv 
                  : `Bearer ${tokenFromEnv}`;
                logger.debug({ 
                  taskId: task._id,
                  testCaseIndex: i,
                  source: tokenFromEnv === (envVars.token || envVars.authToken || envVars.AUTH_TOKEN || envVars.TOKEN) 
                    ? 'environment variable' 
                    : 'common headers'
                }, 'Using authentication token');
              } else {
                logger.warn({ 
                  taskId: task._id,
                  testCaseIndex: i,
                  availableEnvVars: Object.keys(envVars),
                  availableHeaders: Object.keys(envHeaders),
                  hasCommonHeaders: !!resolvedCommonHeaders && Object.keys(resolvedCommonHeaders).length > 0,
                  commonHeadersAuth: resolvedCommonHeaders?.['Authorization'] ? 'present' : 'missing'
                }, 'No authentication token found');
              }
            }
          }
          
          // 如果没有 Authorization 头，尝试从环境变量或通用 headers 中添加
          if (!headers['Authorization'] && !headers['authorization']) {
            let tokenFromEnv = envVars.token || envVars.authToken || envVars.AUTH_TOKEN || envVars.TOKEN;
            
            // 如果环境变量中没有，尝试从通用 headers 中获取
            if (!tokenFromEnv && resolvedCommonHeaders && resolvedCommonHeaders['Authorization']) {
              const commonAuth = resolvedCommonHeaders['Authorization'];
              const commonAuthStr = String(commonAuth || '');
              // 检查通用 headers 中的 Authorization 是否是有效的 token（不是占位符）
              if (commonAuthStr && 
                  commonAuthStr !== 'Bearer token' && 
                  commonAuthStr !== 'Bearer <token>' &&
                  !commonAuthStr.toLowerCase().includes('token') &&
                  commonAuthStr.trim() !== '') {
                tokenFromEnv = commonAuthStr.replace(/^Bearer\s+/i, '');
              }
            }
            
            if (tokenFromEnv) {
              headers['Authorization'] = tokenFromEnv.startsWith('Bearer ') 
                ? tokenFromEnv 
                : `Bearer ${tokenFromEnv}`;
              logger.debug({ 
                taskId: task._id,
                testCaseIndex: i,
                source: tokenFromEnv === (envVars.token || envVars.authToken || envVars.AUTH_TOKEN || envVars.TOKEN) 
                  ? 'environment variable' 
                  : 'common headers'
              }, 'Added authentication token');
            }
          }

          // 构建完整URL
          // 如果 baseUrl 为空，使用主机地址作为默认值
          let url;
          if (!baseUrl) {
            const config = (await import('./config.js')).default;
            baseUrl = config.APP_URL || `http://localhost:${config.PORT || 3000}`;
            logger.info({ 
              taskId: task._id, 
              interfaceId: interfaceData._id,
              defaultBaseUrl: baseUrl
            }, 'Using default host address as base_url');
          }
          
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
          
          // 记录构建的URL和请求头用于调试
          logger.info({ 
            taskId: task._id, 
            interfaceId: interfaceData._id,
            taskBaseUrl: task?.base_url || '(empty)',
            environmentBaseUrl: environment?.base_url || '(empty)',
            currentBaseUrl: baseUrl,
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
            // 构建 axios 请求配置
            const axiosConfig = {
              method,
              url,
              params: queryParams,
              headers,
              timeout: 30000,
              validateStatus: () => true, // 接受所有状态码
            };

            // 对于 GET、HEAD、OPTIONS 等请求，不应该发送 body
            // 只有 POST、PUT、PATCH、DELETE 等需要 body 的方法才设置 data
            if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && requestBody !== null && requestBody !== undefined) {
              axiosConfig.data = requestBody;
            }

            response = await axios(axiosConfig);

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

      // 如果配置了代码仓库和AI配置，执行AI分析
      if (task.code_repository_id && task.ai_config_provider) {
        try {
          const { testPipelineAIService } = await import('./testPipelineAIService.js');
          await testPipelineAIService.analyzeTestResult(resultId, task);
        } catch (error) {
          logger.error({ error, resultId, taskId: task._id }, 'Failed to run AI analysis after test completion');
          // 不抛出错误，避免影响测试流程
        }
      }

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
    // 优先级：task.base_url > environment.base_url
    // 因为任务的 base_url 是针对特定流水线的配置，应该优先于环境变量的通用配置
    // 处理 Mongoose 文档：使用 .get() 方法或直接访问属性
    const taskBaseUrl = task?.base_url || (task?.get ? task.get('base_url') : null) || '';
    const envBaseUrl = environment?.base_url || (environment?.get ? environment.get('base_url') : null) || '';
    let baseUrl = (taskBaseUrl || envBaseUrl || '').trim();

    // 如果 base_url 为空，使用主机地址作为默认值
    if (!baseUrl) {
      const config = (await import('./config.js')).default;
      // 优先使用 APP_URL，如果没有则使用 localhost:PORT
      baseUrl = config.APP_URL || `http://localhost:${config.PORT || 3000}`;
      logger.info({ 
        taskId: task._id?.toString(),
        testCaseIndex,
        defaultBaseUrl: baseUrl
      }, 'Using default host address as base_url');
    }

    // 规范化 baseUrl
    if (baseUrl) {
      if (!baseUrl.match(/^https?:\/\//)) {
        baseUrl = `http://${baseUrl}`;
      }
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

    // 如果接口数据没有 populate project_id，尝试获取
    if (!interfaceData.project_id && interfaceIdStr) {
      try {
        const populatedInterface = await Interface.findById(interfaceIdStr).populate('project_id', '_id');
        if (populatedInterface && populatedInterface.project_id) {
          interfaceData.project_id = populatedInterface.project_id;
        }
      } catch (e) {
        logger.warn({ error: e.message, interfaceId: interfaceIdStr }, 'Failed to populate project_id for interface');
      }
    }

    // 构建请求
    const method = interfaceData.method?.toUpperCase() || 'GET';
    let path = interfaceData.path || '';

    // 确保 path 以 / 开头
    if (path && !path.startsWith('/')) {
      path = `/${path}`;
    }

    // 提取路径中的所有参数占位符
    const pathParamNames = [];
    const pathParamRegex = /\{(\w+)\}/g;
    let match;
    while ((match = pathParamRegex.exec(path)) !== null) {
      if (!pathParamNames.includes(match[1])) {
        pathParamNames.push(match[1]);
      }
    }

    // 替换路径参数
    const pathParams = this.resolveVariables(testCase.path_params || {}, envVars);
    
    // 尝试从任务或接口数据中获取项目ID（如果路径参数需要projectId）
    let projectId = null;
    if (task.project_id) {
      if (typeof task.project_id === 'object' && task.project_id._id) {
        projectId = task.project_id._id.toString();
      } else {
        projectId = task.project_id.toString();
      }
    } else if (interfaceData.project_id) {
      if (typeof interfaceData.project_id === 'object' && interfaceData.project_id._id) {
        projectId = interfaceData.project_id._id.toString();
      } else {
        projectId = interfaceData.project_id.toString();
      }
    }
    
    // 对于未设置的路径参数，尝试从多个来源获取
    for (const paramName of pathParamNames) {
      // 检查参数是否存在且有效（不为空字符串）
      if (!pathParams[paramName] || pathParams[paramName] === '' || pathParams[paramName] === null || pathParams[paramName] === undefined) {
        let paramValue = null;
        let source = '';
        
        // 1. 尝试从环境变量中获取（支持多种命名方式）
        paramValue = envVars[paramName] || 
                    envVars[paramName.toLowerCase()] || 
                    envVars[paramName.toUpperCase()] ||
                    envVars[`${paramName}Id`] ||
                    envVars[`${paramName.toLowerCase()}Id`] ||
                    envVars[`${paramName}_id`] ||
                    envVars[`${paramName.toLowerCase()}_id`];
        
        if (paramValue !== undefined && paramValue !== null && paramValue !== '') {
          source = 'environment variable';
        }
        
        // 2. 如果是 projectId 且还没有值，尝试从任务或接口中获取
        if (!paramValue && (paramName === 'projectId' || paramName === 'project_id' || paramName.toLowerCase() === 'projectid') && projectId) {
          paramValue = projectId;
          source = 'task/interface project_id';
        }
        
        if (paramValue !== undefined && paramValue !== null && paramValue !== '') {
          pathParams[paramName] = String(paramValue);
          logger.info({ 
            taskId: task._id?.toString(),
            testCaseIndex,
            paramName, 
            value: String(paramValue).substring(0, 50),
            source: source
          }, `Using path param ${paramName} from ${source}`);
        } else {
          // 如果仍然没有值，记录错误
          logger.error({ 
            taskId: task._id?.toString(),
            testCaseIndex,
            paramName, 
            path, 
            availableEnvVars: Object.keys(envVars),
            testCasePathParams: Object.keys(testCase.path_params || {}),
            pathParams: pathParams,
            hasProjectId: !!projectId,
            projectId: projectId ? projectId.substring(0, 50) : null
          }, `Path parameter ${paramName} not found in path_params or environment variables - request will fail`);
        }
      } else {
        logger.debug({ 
          taskId: task._id?.toString(),
          testCaseIndex,
          paramName,
          value: String(pathParams[paramName]).substring(0, 50),
          source: 'test case path_params'
        }, 'Using path param from test case');
      }
    }
    
    Object.keys(pathParams).forEach((key) => {
      const value = pathParams[key];
      if (value !== undefined && value !== null && value !== '') {
        path = path.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
        path = path.replace(new RegExp(`:${key}`, 'g'), String(value));
      }
    });
    
    // 检查是否还有未替换的参数
    const remainingParams = path.match(/\{(\w+)\}/g);
    if (remainingParams && remainingParams.length > 0) {
      logger.error({ 
        remainingParams, 
        path, 
        pathParams,
        pathParamNames,
        availableEnvVars: Object.keys(envVars)
      }, 'Some path parameters were not replaced - this will cause request to fail');
      
      // 尝试从环境变量或任务数据中获取缺失的参数（支持多种命名方式）
      for (const paramMatch of remainingParams) {
        const paramName = paramMatch.replace(/[{}]/g, '');
        let paramValue = null;
        let source = '';
        
        // 1. 尝试从环境变量中获取
        paramValue = envVars[paramName] || 
                    envVars[paramName.toLowerCase()] || 
                    envVars[paramName.toUpperCase()] ||
                    envVars[`${paramName}Id`] ||
                    envVars[`${paramName.toLowerCase()}Id`] ||
                    envVars[`${paramName}_id`] ||
                    envVars[`${paramName.toLowerCase()}_id`];
        
        if (paramValue !== undefined && paramValue !== null && paramValue !== '') {
          source = 'environment variable (fallback)';
        }
        
        // 2. 如果是 projectId 且还没有值，尝试从任务或接口中获取
        if (!paramValue && (paramName === 'projectId' || paramName === 'project_id' || paramName.toLowerCase() === 'projectid') && projectId) {
          paramValue = projectId;
          source = 'task/interface project_id (fallback)';
        }
        
        if (paramValue !== undefined && paramValue !== null && paramValue !== '') {
          path = path.replace(new RegExp(`\\{${paramName}\\}`, 'g'), String(paramValue));
          pathParams[paramName] = String(paramValue);
          logger.info({ 
            taskId: task._id?.toString(),
            testCaseIndex,
            paramName, 
            value: String(paramValue).substring(0, 50),
            source: source
          }, `Replaced missing path parameter ${paramName} from ${source}`);
        } else {
          logger.error({ 
            taskId: task._id?.toString(),
            testCaseIndex,
            paramName,
            availableEnvVars: Object.keys(envVars),
            hasProjectId: !!projectId,
            projectId: projectId ? projectId.substring(0, 50) : null
          }, `Cannot find value for path parameter ${paramName} - URL will contain placeholder`);
        }
      }
    }

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
    
    // 获取任务的通用 headers
    let commonHeaders = task.common_headers || {};
    // 如果 common_headers 是字符串，尝试解析为对象
    if (typeof commonHeaders === 'string') {
      try {
        commonHeaders = JSON.parse(commonHeaders);
      } catch (e) {
        logger.warn({ taskId: task._id, error: e.message }, 'Failed to parse task common_headers as JSON');
        commonHeaders = {};
      }
    }
    const resolvedCommonHeaders = this.resolveVariables(commonHeaders, envVars);
    
    // 合并请求头：环境变量头 -> 通用头 -> 自定义头（自定义头优先级最高）
    const headers = {
      ...envHeaders,
      ...resolvedCommonHeaders,
      ...resolvedCustomHeaders,
    };
    
    // 调试日志：记录 headers 合并情况
    logger.info({ 
      taskId: task._id?.toString(),
      testCaseIndex,
      hasCommonHeaders: !!task.common_headers && Object.keys(commonHeaders).length > 0,
      commonHeadersKeys: Object.keys(commonHeaders),
      commonHeadersAuth: resolvedCommonHeaders?.['Authorization'] ? 
        String(resolvedCommonHeaders['Authorization']).substring(0, 50) + '...' : 'none',
      hasCustomHeaders: !!testCase.custom_headers && Object.keys(customHeaders).length > 0,
      customHeadersKeys: Object.keys(customHeaders),
      envHeadersKeys: Object.keys(envHeaders),
      mergedHeaders: Object.keys(headers),
      hasAuthHeader: !!(headers['Authorization'] || headers['authorization']),
      authHeaderValue: headers['Authorization'] || headers['authorization'] ? 
        String(headers['Authorization'] || headers['authorization']).substring(0, 50) + '...' : 'none'
    }, 'Headers merged for single test case');

    // 对于需要 body 的请求方法，设置 Content-Type
    // GET、HEAD、OPTIONS 等请求不需要 Content-Type
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      // 如果用户没有自定义 Content-Type，则设置默认值
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }
    }

    // 处理 Authorization 头
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
        // 尝试从环境变量中获取认证令牌
        let tokenFromEnv = envVars.token || envVars.authToken || envVars.AUTH_TOKEN || envVars.TOKEN;
        
        // 如果环境变量中没有，尝试从通用 headers 中获取
        if (!tokenFromEnv && resolvedCommonHeaders && resolvedCommonHeaders['Authorization']) {
          const commonAuth = resolvedCommonHeaders['Authorization'];
          const commonAuthStr = String(commonAuth || '').trim();
          // 检查通用 headers 中的 Authorization 是否是有效的 token（不是占位符）
          // 排除常见的占位符值
          const isPlaceholder = (
            !commonAuthStr ||
            commonAuthStr === 'Bearer token' ||
            commonAuthStr === 'Bearer <token>' ||
            commonAuthStr === 'token' ||
            commonAuthStr.toLowerCase() === 'bearer token' ||
            commonAuthStr.toLowerCase().trim() === 'bearer' ||
            (commonAuthStr.toLowerCase().startsWith('bearer') && commonAuthStr.toLowerCase().trim() === 'bearer token')
          );
          
          if (!isPlaceholder && commonAuthStr.length > 10) {
            // 提取 token（移除 Bearer 前缀）
            tokenFromEnv = commonAuthStr.replace(/^Bearer\s+/i, '').trim();
            logger.debug({ 
              taskId: task._id?.toString(),
              testCaseIndex,
              source: 'common headers',
              hasToken: !!tokenFromEnv
            }, 'Found token in common headers');
          }
        }
        
        if (tokenFromEnv) {
          headers['Authorization'] = tokenFromEnv.startsWith('Bearer ') 
            ? tokenFromEnv 
            : `Bearer ${tokenFromEnv}`;
          logger.debug({ 
            source: tokenFromEnv === (envVars.token || envVars.authToken || envVars.AUTH_TOKEN || envVars.TOKEN) 
              ? 'environment variable' 
              : 'common headers'
          }, 'Using authentication token');
        } else {
          logger.warn({ 
            availableEnvVars: Object.keys(envVars),
            availableHeaders: Object.keys(envHeaders),
            hasCommonHeaders: !!resolvedCommonHeaders && Object.keys(resolvedCommonHeaders).length > 0,
            commonHeadersAuth: resolvedCommonHeaders?.['Authorization'] ? 'present' : 'missing'
          }, 'No authentication token found');
        }
      }
    }
    
    // 如果没有 Authorization 头，尝试从环境变量或通用 headers 中添加
    if (!headers['Authorization'] && !headers['authorization']) {
      let tokenFromEnv = envVars.token || envVars.authToken || envVars.AUTH_TOKEN || envVars.TOKEN;
      
      // 如果环境变量中没有，尝试从通用 headers 中获取
      if (!tokenFromEnv && resolvedCommonHeaders && resolvedCommonHeaders['Authorization']) {
        const commonAuth = resolvedCommonHeaders['Authorization'];
        const commonAuthStr = String(commonAuth || '').trim();
        // 检查通用 headers 中的 Authorization 是否是有效的 token（不是占位符）
        // 排除常见的占位符值
        const isPlaceholder = (
          !commonAuthStr ||
          commonAuthStr === 'Bearer token' ||
          commonAuthStr === 'Bearer <token>' ||
          commonAuthStr === 'token' ||
          commonAuthStr.toLowerCase() === 'bearer token' ||
          commonAuthStr.toLowerCase().trim() === 'bearer' ||
          (commonAuthStr.toLowerCase().startsWith('bearer') && commonAuthStr.toLowerCase().trim() === 'bearer token')
        );
        
        if (!isPlaceholder && commonAuthStr.length > 10) {
          // 提取 token（移除 Bearer 前缀）
          tokenFromEnv = commonAuthStr.replace(/^Bearer\s+/i, '').trim();
          logger.info({ 
            taskId: task._id?.toString(),
            testCaseIndex,
            source: 'common headers',
            hasToken: !!tokenFromEnv,
            tokenLength: tokenFromEnv ? tokenFromEnv.length : 0
          }, 'Found token in common headers');
        } else {
          logger.warn({ 
            taskId: task._id?.toString(),
            testCaseIndex,
            commonAuthStr: commonAuthStr.substring(0, 50),
            isPlaceholder,
            length: commonAuthStr.length
          }, 'Common headers Authorization is placeholder or invalid');
        }
      }
      
      if (tokenFromEnv) {
        headers['Authorization'] = tokenFromEnv.startsWith('Bearer ') 
          ? tokenFromEnv 
          : `Bearer ${tokenFromEnv}`;
        logger.info({ 
          taskId: task._id?.toString(),
          testCaseIndex,
          source: tokenFromEnv === (envVars.token || envVars.authToken || envVars.AUTH_TOKEN || envVars.TOKEN) 
            ? 'environment variable' 
            : 'common headers',
          tokenLength: tokenFromEnv.length
        }, 'Added authentication token to headers');
      } else {
        logger.error({ 
          taskId: task._id?.toString(),
          testCaseIndex,
          hasCommonHeaders: !!resolvedCommonHeaders && Object.keys(resolvedCommonHeaders).length > 0,
          commonHeadersAuth: resolvedCommonHeaders?.['Authorization'] ? 'present' : 'missing',
          availableEnvVars: Object.keys(envVars)
        }, 'No authentication token found - request will fail with 401');
      }
    }

    // 构建完整URL
    // 如果 base_url 仍然为空（理论上不应该发生，因为上面已经设置了默认值），使用主机地址
    if (!baseUrl) {
      const config = (await import('./config.js')).default;
      baseUrl = config.APP_URL || `http://localhost:${config.PORT || 3000}`;
      logger.warn({ 
        taskId: task._id?.toString(),
        testCaseIndex,
        defaultBaseUrl: baseUrl
      }, 'Base URL was empty, using default host address');
    }

    const url = path ? `${baseUrl}${path}` : baseUrl;

    // 最终日志：记录将要发送的请求信息
    logger.info({ 
      taskId: task._id?.toString(),
      testCaseIndex,
      method,
      url,
      originalPath: interfaceData.path,
      pathParams: pathParams,
      hasHeaders: !!headers && Object.keys(headers).length > 0,
      headerKeys: headers ? Object.keys(headers) : [],
      hasAuthHeader: !!(headers['Authorization'] || headers['authorization']),
      authHeaderValue: headers['Authorization'] || headers['authorization'] ? 
        (String(headers['Authorization'] || headers['authorization']).substring(0, 30) + '...') : 'none',
      hasUnreplacedParams: url.includes('{') || url.includes('}')
    }, 'Final request configuration before sending');

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
      // 构建 axios 请求配置
      const axiosConfig = {
        method,
        url,
        params: queryParams,
        headers,
        timeout: 30000,
        validateStatus: () => true, // 接受所有状态码
      };

      // 对于 GET、HEAD、OPTIONS 等请求，不应该发送 body
      // 只有 POST、PUT、PATCH、DELETE 等需要 body 的方法才设置 data
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && requestBody !== null && requestBody !== undefined) {
        axiosConfig.data = requestBody;
      }

      response = await axios(axiosConfig);

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

