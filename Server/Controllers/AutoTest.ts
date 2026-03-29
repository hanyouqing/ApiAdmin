import Koa from 'koa';
import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import Interface from '../Models/Interface.js';
import TestCollection from '../Models/TestCollection.js';
import TestCase from '../Models/TestCase.js';
import AutoTestTask from '../Models/AutoTestTask.js';
import AutoTestConfig from '../Models/AutoTestConfig.js';
import { TestRunner } from '../Utils/testRunner.js';
import { TestCaseGenerator } from '../Utils/testCaseGenerator.js';
import mongoose from 'mongoose';

// 定义经过认证的 Context 扩展
interface AuthenticatedContext extends Koa.Context {
  state: {
    user: {
      _id: mongoose.Types.ObjectId | string;
      role: string;
      username: string;
      email: string;
    };
  };
}

class AutoTestController extends BaseController {
  static get ControllerName() { return 'AutoTestController'; }

  static async getConfig(ctx: Koa.Context) {
    try {
      const { projectId } = ctx.query;

      if (!projectId || typeof projectId !== 'string' || !validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = AutoTestController.error('项目 ID 不能为空');
        return;
      }

      let config = await (AutoTestConfig as any).getConfig(projectId);
      if (!config) {
        config = {
          enabled: true,
          autoGenerate: true,
          autoExecute: false,
          dataGenerationStrategy: 'mock',
          assertionTemplate: null,
          timeout: 30000,
          retryCount: 0,
        };
      }

      ctx.body = AutoTestController.success(config);
    } catch (error: any) {
      logger.error({ error }, 'Get auto test config error');
      ctx.status = 500;
      ctx.body = AutoTestController.error(
        process.env.NODE_ENV === 'production' ? '获取自动测试配置失败' : error.message
      );
    }
  }

  static async updateConfig(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { projectId, enabled, autoGenerate, autoExecute, dataGenerationStrategy, assertionTemplate, timeout, retryCount } = ctx.request.body as any;

      if (!projectId || !validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = AutoTestController.error('项目 ID 不能为空');
        return;
      }

      const config = await (AutoTestConfig as any).getOrCreateConfig(projectId, {
        enabled: enabled !== undefined ? enabled : true,
        autoGenerate: autoGenerate !== undefined ? autoGenerate : true,
        autoExecute: autoExecute !== undefined ? autoExecute : false,
        dataGenerationStrategy: dataGenerationStrategy || 'mock',
        assertionTemplate: assertionTemplate || null,
        timeout: timeout || 30000,
        retryCount: retryCount !== undefined ? retryCount : 0,
        updatedBy: user._id,
      });

      if (enabled !== undefined) config.enabled = enabled;
      if (autoGenerate !== undefined) config.autoGenerate = autoGenerate;
      if (autoExecute !== undefined) config.autoExecute = autoExecute;
      if (dataGenerationStrategy) config.dataGenerationStrategy = dataGenerationStrategy;
      if (assertionTemplate !== undefined) config.assertionTemplate = assertionTemplate;
      if (timeout) config.timeout = timeout;
      if (retryCount !== undefined) config.retryCount = retryCount;
      config.updatedBy = user._id;
      
      await config.save();
      ctx.body = AutoTestController.success(config, '自动测试配置更新成功');
    } catch (error: any) {
      logger.error({ error }, 'Update auto test config error');
      ctx.status = 500;
      ctx.body = AutoTestController.error(error.message || '更新自动测试配置失败');
    }
  }

  static async generateTestCases(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { interfaceIds, projectId, strategy = 'mock', collectionId, taskId } = ctx.request.body as any;

      if (!projectId || !validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = AutoTestController.error('项目 ID 不能为空');
        return;
      }

      const query: any = { project_id: projectId };
      if (interfaceIds && Array.isArray(interfaceIds) && interfaceIds.length > 0) {
        query._id = { $in: interfaceIds };
      }

      const interfaces = await Interface.find(query);
      if (interfaces.length === 0) {
        ctx.status = 404;
        ctx.body = AutoTestController.error('未找到符合条件的接口');
        return;
      }

      const generator = new TestCaseGenerator({ strategy });
      const allTestCases: any[] = [];
      let generatedCount = 0;

      for (const interfaceData of interfaces) {
        try {
          const testCases = await generator.generateTestCases(interfaceData, { strategy });
          for (const testCase of testCases) {
            allTestCases.push({ ...testCase, interfaceId: interfaceData._id });
            generatedCount++;
          }
        } catch (err) {
          logger.error({ err, interfaceId: interfaceData._id }, 'Generate test case error');
        }
      }

      let savedCollection: any;
      if (collectionId && validateObjectId(collectionId)) {
        savedCollection = await TestCollection.findById(collectionId);
      } else {
        savedCollection = new TestCollection({
          name: `自动生成测试集合 - ${new Date().toLocaleString()}`,
          description: `为 ${interfaces.length} 个接口自动生成的测试用例`,
          project_id: projectId,
          test_cases: [],
          uid: user._id,
        });
        await savedCollection.save();
      }

      const savedTestCaseIds = [];
      for (let i = 0; i < allTestCases.length; i++) {
        const tc = allTestCases[i];
        const savedCase = new TestCase({
          collection_id: savedCollection._id,
          interface_id: tc.interfaceId,
          name: tc.name,
          request: tc.request,
          assertion_script: tc.assertion_script || '',
          order: i,
          uid: user._id,
        });
        await savedCase.save();
        savedTestCaseIds.push(savedCase._id);
      }

      savedCollection.test_cases = [...(savedCollection.test_cases || []), ...savedTestCaseIds];
      await savedCollection.save();

      ctx.body = AutoTestController.success({
        generatedCount: savedTestCaseIds.length,
        collectionId: savedCollection._id,
      }, '测试用例生成并保存成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = AutoTestController.error(error.message || '生成测试用例失败');
    }
  }

  static async runAutoTest(ctx: AuthenticatedContext) {
    try {
      const { projectId, collectionId, environmentId } = ctx.request.body as any;

      if (!collectionId || !validateObjectId(collectionId)) {
        ctx.status = 400;
        ctx.body = AutoTestController.error('无效的测试集合 ID');
        return;
      }

      const testCollection = await TestCollection.findById(collectionId);
      if (!testCollection) {
        ctx.status = 404;
        ctx.body = AutoTestController.error('测试集合不存在');
        return;
      }

      const runner = new TestRunner();
      const report = await runner.runTestCollection(testCollection._id.toString(), {
        environmentId,
      });

      ctx.body = AutoTestController.success({ report }, '自动测试执行完成');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = AutoTestController.error(error.message || '执行自动测试失败');
    }
  }
}

export default AutoTestController;
