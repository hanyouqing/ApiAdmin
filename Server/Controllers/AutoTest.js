import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import Interface from '../Models/Interface.js';
import TestCollection from '../Models/TestCollection.js';
import TestCase from '../Models/TestCase.js';
import { TestRunner } from '../Utils/testRunner.js';

class AutoTestController extends BaseController {
  static get ControllerName() { return 'AutoTestController'; }

  static async getConfig(ctx) {
    try {
      const { projectId } = ctx.query;

      // TODO: 从数据库获取自动测试配置
      // 临时返回默认配置
      ctx.body = AutoTestController.success({
        enabled: true,
        autoGenerate: true,
        autoExecute: false,
        dataGenerationStrategy: 'mock',
        assertionTemplate: null,
        timeout: 30000,
        retryCount: 0,
      });
    } catch (error) {
      logger.error({ error }, 'Get auto test config error');
      ctx.status = 500;
      ctx.body = AutoTestController.error(
        process.env.NODE_ENV === 'production'
          ? '获取自动测试配置失败'
          : error.message || '获取自动测试配置失败'
      );
    }
  }

  static async updateConfig(ctx) {
    try {
      const user = ctx.state.user;
      const { projectId, enabled, autoGenerate, autoExecute, dataGenerationStrategy, assertionTemplate, timeout, retryCount } = ctx.request.body;

      // TODO: 保存配置到数据库

      logger.info({ userId: user._id, projectId }, 'Auto test config updated');

      ctx.body = AutoTestController.success(null, '自动测试配置更新成功');
    } catch (error) {
      logger.error({ error }, 'Update auto test config error');
      ctx.status = 500;
      ctx.body = AutoTestController.error(
        process.env.NODE_ENV === 'production'
          ? '更新自动测试配置失败'
          : error.message || '更新自动测试配置失败'
      );
    }
  }

  static async generateTestCases(ctx) {
    try {
      const user = ctx.state.user;
      const { interfaceIds, projectId, strategy = 'mock' } = ctx.request.body;

      let query = {};
      if (projectId && validateObjectId(projectId)) {
        query.project_id = projectId;
      }
      if (interfaceIds && Array.isArray(interfaceIds) && interfaceIds.length > 0) {
        const validIds = interfaceIds.filter(id => validateObjectId(id));
        if (validIds.length > 0) {
          query._id = { $in: validIds };
        }
      }

      const interfaces = await Interface.find(query);

      const testCases = [];
      let generatedCount = 0;

      for (const interfaceData of interfaces) {
        try {
          // 根据接口类型生成测试用例
          const method = interfaceData.method?.toUpperCase();
          
          if (method === 'GET') {
            // 生成参数验证和响应格式验证用例
            const testCase1 = {
              interfaceId: interfaceData._id,
              name: `${interfaceData.title} - 参数验证`,
              type: 'parameter-validation',
              request: {
                query: interfaceData.req_query || [],
              },
              assertion: `
                assert.equal(status, 200);
                assert(body !== null);
              `,
            };
            testCases.push(testCase1);
            generatedCount++;

            const testCase2 = {
              interfaceId: interfaceData._id,
              name: `${interfaceData.title} - 响应格式验证`,
              type: 'response-validation',
              request: {},
              assertion: `
                assert.equal(status, 200);
                // TODO: 基于 JSON Schema 生成响应验证
              `,
            };
            testCases.push(testCase2);
            generatedCount++;
          } else if (method === 'POST' || method === 'PUT') {
            // 生成请求体验证和创建/更新成功用例
            const testCase1 = {
              interfaceId: interfaceData._id,
              name: `${interfaceData.title} - 请求体验证`,
              type: 'request-validation',
              request: {
                body: interfaceData.req_body || {},
              },
              assertion: `
                assert.equal(status, 200);
              `,
            };
            testCases.push(testCase1);
            generatedCount++;
          } else if (method === 'DELETE') {
            // 生成删除成功用例
            const testCase1 = {
              interfaceId: interfaceData._id,
              name: `${interfaceData.title} - 删除成功`,
              type: 'success',
              request: {},
              assertion: `
                assert.equal(status, 200);
              `,
            };
            testCases.push(testCase1);
            generatedCount++;
          }
        } catch (error) {
          logger.error({ error, interfaceId: interfaceData._id }, 'Generate test case error');
        }
      }

      logger.info({ userId: user._id, generatedCount, interfaceCount: interfaces.length }, 'Test cases generated');

      ctx.body = AutoTestController.success({
        generatedCount,
        testCases,
      }, '测试用例生成成功');
    } catch (error) {
      logger.error({ error }, 'Generate test cases error');
      ctx.status = 500;
      ctx.body = AutoTestController.error(
        process.env.NODE_ENV === 'production'
          ? '生成测试用例失败'
          : error.message || '生成测试用例失败'
      );
    }
  }

  static async runAutoTest(ctx) {
    try {
      const user = ctx.state.user;
      const { interfaceIds, projectId, collectionId } = ctx.request.body;

      // TODO: 实现自动测试执行逻辑
      // 1. 获取接口列表
      // 2. 执行测试
      // 3. 生成测试报告和质量报告

      ctx.body = AutoTestController.success({
        report: {
          total: 0,
          passed: 0,
          failed: 0,
          results: [],
        },
        qualityReport: {
          totalInterfaces: 0,
          testedInterfaces: 0,
          passedInterfaces: 0,
          failedInterfaces: 0,
          issues: [],
          suggestions: [],
        },
      }, '自动测试执行完成');
    } catch (error) {
      logger.error({ error }, 'Run auto test error');
      ctx.status = 500;
      ctx.body = AutoTestController.error(
        process.env.NODE_ENV === 'production'
          ? '执行自动测试失败'
          : error.message || '执行自动测试失败'
      );
    }
  }
}

export default AutoTestController;

