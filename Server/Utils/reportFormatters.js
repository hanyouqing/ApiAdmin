import { logger } from './logger.js';
import { XMLBuilder } from 'fast-xml-parser';

/**
 * Normalize TestRunner / AutoTestResult shapes into a common report for formatters.
 */
export function normalizeReportForFormatters(report) {
  if (!report || typeof report !== 'object') {
    return { summary: { total: 0, failed: 0, error: 0, duration: 0 }, results: [] };
  }

  const summary = report.summary
    ? {
        total: report.summary.total || 0,
        failed: report.summary.failed || 0,
        error: report.summary.error || report.summary.errors || 0,
        duration: report.summary.duration || report.duration || 0,
      }
    : {
        total: report.total || 0,
        failed: report.failed || 0,
        error: report.error || report.errors || 0,
        duration: report.duration || 0,
      };

  const results = (report.results || []).map((result) => {
    const assertion =
      result.assertion_result ||
      result.assertionResult ||
      null;
    const interfaceId =
      result.interface_id?.toString?.() ||
      result.interface_id ||
      result.interfaceId?.toString?.() ||
      result.interfaceId ||
      'unknown';
    const interfaceName =
      result.interface_name ||
      result.interfaceName ||
      result.testCaseName ||
      String(interfaceId);
    return {
      ...result,
      interface_id: interfaceId,
      interface_name: interfaceName,
      test_case_name:
        result.test_case_name ||
        result.testCaseName ||
        result.interface_name ||
        interfaceName,
      assertion_result: assertion
        ? {
            message: assertion.message,
            details: assertion.details || (assertion.errors || []).join('\n'),
            passed: assertion.passed,
          }
        : undefined,
      request: result.request
        ? {
            ...result.request,
            path: result.request.path || result.request.url || '',
            method: result.request.method || 'GET',
          }
        : undefined,
      response: result.response
        ? {
            ...result.response,
            status:
              result.response.status ??
              result.response.status_code ??
              result.response.statusCode,
          }
        : undefined,
    };
  });

  return { ...report, summary, results };
}

/**
 * 生成 JUnit XML 格式报告
 * @param {Object} report - 测试报告对象
 * @returns {String} JUnit XML 格式的字符串
 */
export function formatJUnitXML(report) {
  try {
    const normalized = normalizeReportForFormatters(report);
    const testsuites = {
      testsuites: {
        '@_name': 'ApiAdmin Test Results',
        '@_tests': normalized.summary.total || 0,
        '@_failures': normalized.summary.failed || 0,
        '@_errors': normalized.summary.error || 0,
        '@_time': (normalized.summary.duration || 0) / 1000,
        testsuite: [],
      },
    };

    // 按接口分组
    const interfaceMap = new Map();
    
    if (normalized.results && Array.isArray(normalized.results)) {
      for (const result of normalized.results) {
        const interfaceId = result.interface_id?.toString() || result.interface_id || 'unknown';
        const interfaceName = result.interface_name || result.interface_id || 'Unknown Interface';
        
        if (!interfaceMap.has(interfaceId)) {
          interfaceMap.set(interfaceId, {
            '@_name': interfaceName,
            '@_tests': 0,
            '@_failures': 0,
            '@_errors': 0,
            '@_time': 0,
            testcase: [],
          });
        }

        const testsuite = interfaceMap.get(interfaceId);
        testsuite['@_tests']++;
        testsuite['@_time'] += (result.duration || 0) / 1000;

        const testcase = {
          '@_name': result.test_case_name || result.interface_name || 'Test Case',
          '@_classname': interfaceName,
          '@_time': (result.duration || 0) / 1000,
        };

        if (result.status === 'failed') {
          testsuite['@_failures']++;
          testcase.failure = {
            '@_message': result.assertion_result?.message || 'Test failed',
            '@_type': 'AssertionError',
            '#text': result.assertion_result?.details || result.error?.message || 'Test assertion failed',
          };
        } else if (result.status === 'error') {
          testsuite['@_errors']++;
          testcase.error = {
            '@_message': result.error?.message || 'Test error',
            '@_type': result.error?.type || 'Error',
            '#text': result.error?.stack || result.error?.message || 'Test execution error',
          };
        }

        if (result.request) {
          testcase['system-out'] = {
            '#text': `Request: ${result.request.method} ${result.request.path}\nResponse: ${result.response?.status || 'N/A'}`,
          };
        }

        testsuite.testcase.push(testcase);
      }
    }

    testsuites.testsuites.testsuite = Array.from(interfaceMap.values());

    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      format: true,
      indentBy: '  ',
    });

    const xml = builder.build(testsuites);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
  } catch (error) {
    logger.error({ error }, 'Format JUnit XML error');
    throw new Error(`生成 JUnit XML 报告失败: ${error.message}`);
  }
}

/**
 * 生成 Allure JSON 格式报告
 * @param {Object} report - 测试报告对象
 * @returns {Array} Allure JSON 格式的测试结果数组
 */
export function formatAllureJSON(report) {
  try {
    const allureResults = [];

    if (report.results && Array.isArray(report.results)) {
      for (const result of report.results) {
        const allureResult = {
          uuid: result.id || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          historyId: result.interface_id?.toString() || 'unknown',
          fullName: `${result.interface_name || 'Unknown'}.${result.test_case_name || 'Test Case'}`,
          labels: [
            {
              name: 'suite',
              value: result.interface_name || 'Unknown Interface',
            },
            {
              name: 'testClass',
              value: result.interface_id?.toString() || 'unknown',
            },
            {
              name: 'method',
              value: result.test_case_name || 'Test Case',
            },
            {
              name: 'package',
              value: result.project_name || 'ApiAdmin',
            },
          ],
          links: [],
          name: result.test_case_name || result.interface_name || 'Test Case',
          status: mapStatusToAllure(result.status),
          statusDetails: result.status === 'failed' || result.status === 'error' ? {
            message: result.assertion_result?.message || result.error?.message || 'Test failed',
            trace: result.error?.stack || result.assertion_result?.details || '',
          } : undefined,
          stage: 'finished',
          description: result.description || '',
          steps: [],
          attachments: [],
          parameters: [],
          start: result.startTime || Date.now(),
          stop: result.endTime || Date.now(),
          duration: result.duration || 0,
        };

        // 添加请求参数
        if (result.request) {
          allureResult.parameters.push({
            name: 'method',
            value: result.request.method || 'GET',
          });
          allureResult.parameters.push({
            name: 'path',
            value: result.request.path || '',
          });

          if (result.request.query && Object.keys(result.request.query).length > 0) {
            allureResult.parameters.push({
              name: 'query',
              value: JSON.stringify(result.request.query),
            });
          }

          if (result.request.body) {
            allureResult.parameters.push({
              name: 'body',
              value: typeof result.request.body === 'string' ? result.request.body : JSON.stringify(result.request.body),
            });
          }
        }

        // 添加响应信息作为附件
        if (result.response) {
          allureResult.attachments.push({
            name: 'Response',
            source: Buffer.from(JSON.stringify(result.response, null, 2)).toString('base64'),
            type: 'application/json',
          });
        }

        // 添加步骤
        if (result.steps && Array.isArray(result.steps)) {
          for (const step of result.steps) {
            allureResult.steps.push({
              name: step.name || 'Step',
              status: mapStatusToAllure(step.status || 'passed'),
              start: step.startTime || Date.now(),
              stop: step.endTime || Date.now(),
              attachments: step.attachments || [],
            });
          }
        } else {
          // 如果没有步骤，创建默认步骤
          allureResult.steps.push({
            name: 'Execute Request',
            status: mapStatusToAllure(result.status),
            start: result.startTime || Date.now(),
            stop: result.endTime || Date.now(),
          });
        }

        allureResults.push(allureResult);
      }
    }

    return allureResults;
  } catch (error) {
    logger.error({ error }, 'Format Allure JSON error');
    throw new Error(`生成 Allure JSON 报告失败: ${error.message}`);
  }
}

/**
 * 将测试状态映射到 Allure 状态
 * @param {String} status - 测试状态
 * @returns {String} Allure 状态
 */
function mapStatusToAllure(status) {
  const statusMap = {
    passed: 'passed',
    failed: 'failed',
    error: 'broken',
    skipped: 'skipped',
    pending: 'skipped',
  };

  return statusMap[status] || 'unknown';
}

/**
 * 生成 Allure 报告目录结构
 * @param {Array} allureResults - Allure JSON 结果数组
 * @param {String} outputDir - 输出目录
 * @returns {Promise<void>}
 */
export async function generateAllureReport(allureResults, outputDir) {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // 确保输出目录存在
    await fs.mkdir(outputDir, { recursive: true });

    // 写入每个测试结果
    for (const result of allureResults) {
      const filename = `${result.uuid}-result.json`;
      const filepath = path.join(outputDir, filename);
      await fs.writeFile(filepath, JSON.stringify(result, null, 2), 'utf8');
    }

    logger.info({ count: allureResults.length, outputDir }, 'Allure results generated');
  } catch (error) {
    logger.error({ error, outputDir }, 'Generate Allure report error');
    throw new Error(`生成 Allure 报告失败: ${error.message}`);
  }
}


