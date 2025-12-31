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

class AutoTestController extends BaseController {
  static get ControllerName() { return 'AutoTestController'; }

  static async getConfig(ctx) {
    try {
      const { projectId } = ctx.query;

      if (!projectId || !validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = AutoTestController.error('项目 ID 不能为空');
        return;
      }

      let config = await AutoTestConfig.getConfig(projectId);
      if (!config) {
        // 如果不存在，返回默认配置
        config = {
          enabled: true,
          autoGenerate: true,
          autoExecute: false,
          dataGenerationStrategy: 'mock',
          assertionTemplate: null,
          timeout: 30000,
          retryCount: 0,
        };
      } else {
        config = {
          enabled: config.enabled,
          autoGenerate: config.autoGenerate,
          autoExecute: config.autoExecute,
          dataGenerationStrategy: config.dataGenerationStrategy,
          assertionTemplate: config.assertionTemplate,
          timeout: config.timeout,
          retryCount: config.retryCount,
        };
      }

      ctx.body = AutoTestController.success(config);
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

      if (!projectId || !validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = AutoTestController.error('项目 ID 不能为空');
        return;
      }

      // 验证数据生成策略
      if (dataGenerationStrategy && !['mock', 'example', 'history'].includes(dataGenerationStrategy)) {
        ctx.status = 400;
        ctx.body = AutoTestController.error('无效的数据生成策略');
        return;
      }

      // 验证超时时间
      if (timeout !== undefined && (typeof timeout !== 'number' || timeout < 1000 || timeout > 300000)) {
        ctx.status = 400;
        ctx.body = AutoTestController.error('超时时间必须在 1000-300000 毫秒之间');
        return;
      }

      // 验证重试次数
      if (retryCount !== undefined && (typeof retryCount !== 'number' || retryCount < 0 || retryCount > 10)) {
        ctx.status = 400;
        ctx.body = AutoTestController.error('重试次数必须在 0-10 次之间');
        return;
      }

      const config = await AutoTestConfig.getOrCreateConfig(projectId, {
        enabled: enabled !== undefined ? enabled : true,
        autoGenerate: autoGenerate !== undefined ? autoGenerate : true,
        autoExecute: autoExecute !== undefined ? autoExecute : false,
        dataGenerationStrategy: dataGenerationStrategy || 'mock',
        assertionTemplate: assertionTemplate || null,
        timeout: timeout || 30000,
        retryCount: retryCount !== undefined ? retryCount : 0,
        updatedBy: user._id,
      });

      // 更新配置
      if (enabled !== undefined) {
        config.enabled = enabled;
      }
      if (autoGenerate !== undefined) {
        config.autoGenerate = autoGenerate;
      }
      if (autoExecute !== undefined) {
        config.autoExecute = autoExecute;
      }
      if (dataGenerationStrategy !== undefined) {
        config.dataGenerationStrategy = dataGenerationStrategy;
      }
      if (assertionTemplate !== undefined) {
        config.assertionTemplate = assertionTemplate;
      }
      if (timeout !== undefined) {
        config.timeout = timeout;
      }
      if (retryCount !== undefined) {
        config.retryCount = retryCount;
      }
      config.updatedBy = user._id;
      await config.save();

      logger.info({ userId: user._id, projectId }, 'Auto test config updated');

      ctx.body = AutoTestController.success({
        enabled: config.enabled,
        autoGenerate: config.autoGenerate,
        autoExecute: config.autoExecute,
        dataGenerationStrategy: config.dataGenerationStrategy,
        assertionTemplate: config.assertionTemplate,
        timeout: config.timeout,
        retryCount: config.retryCount,
      }, '自动测试配置更新成功');
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
      const { interfaceIds, projectId, strategy = 'mock', collectionId, taskId, autoExecute = false } = ctx.request.body;

      if (!projectId || !validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = AutoTestController.error('项目 ID 不能为空');
        return;
      }

      let query = { project_id: projectId };
      if (interfaceIds && Array.isArray(interfaceIds) && interfaceIds.length > 0) {
        const validIds = interfaceIds.filter(id => validateObjectId(id));
        if (validIds.length > 0) {
          query._id = { $in: validIds };
        } else {
          ctx.status = 400;
          ctx.body = AutoTestController.error('无效的接口 ID 列表');
          return;
        }
      }

      const interfaces = await Interface.find(query);
      if (interfaces.length === 0) {
        ctx.status = 404;
        ctx.body = AutoTestController.error('未找到符合条件的接口');
        return;
      }

      const generator = new TestCaseGenerator({ strategy });
      const allTestCases = [];
      let generatedCount = 0;
      let failedCount = 0;

      for (const interfaceData of interfaces) {
        try {
          const testCases = await generator.generateTestCases(interfaceData, { strategy });
          for (const testCase of testCases) {
            allTestCases.push({
              ...testCase,
              interfaceId: interfaceData._id,
            });
            generatedCount++;
          }
        } catch (error) {
          logger.error({ error, interfaceId: interfaceData._id }, 'Generate test case error');
          failedCount++;
        }
      }

      let savedCollection = null;
      let savedTask = null;

      if (collectionId && validateObjectId(collectionId)) {
        savedCollection = await TestCollection.findById(collectionId);
        if (!savedCollection || savedCollection.project_id.toString() !== projectId) {
          ctx.status = 400;
          ctx.body = AutoTestController.error('测试集合不存在或不属于该项目');
          return;
        }
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

      const savedTestCases = [];
      for (let i = 0; i < allTestCases.length; i++) {
        const testCase = allTestCases[i];
        try {
          const savedCase = new TestCase({
            collection_id: savedCollection._id,
            interface_id: testCase.interfaceId,
            name: testCase.name,
            description: testCase.description || '',
            request: testCase.request,
            assertion_script: testCase.assertion_script || '',
            order: i,
            enabled: true,
            uid: user._id,
          });
          await savedCase.save();
          savedTestCases.push(savedCase._id);
        } catch (error) {
          logger.error({ error, testCase: testCase.name }, 'Save test case error');
          failedCount++;
        }
      }

      savedCollection.test_cases = [...(savedCollection.test_cases || []), ...savedTestCases];
      await savedCollection.save();

      if (taskId && validateObjectId(taskId)) {
        savedTask = await AutoTestTask.findById(taskId);
        if (savedTask && savedTask.project_id.toString() === projectId) {
          const taskTestCases = allTestCases.map((tc, index) => ({
            interface_id: tc.interfaceId,
            order: index,
            enabled: true,
            custom_headers: {},
            custom_data: {},
            path_params: tc.request.path_params || {},
            query_params: tc.request.query || {},
            assertion_script: tc.assertion_script || '',
          }));

          savedTask.test_cases = [...(savedTask.test_cases || []), ...taskTestCases];
          await savedTask.save();
        }
      }

      logger.info({ 
        userId: user._id, 
        generatedCount, 
        savedCount: savedTestCases.length,
        failedCount,
        interfaceCount: interfaces.length,
        collectionId: savedCollection._id,
      }, 'Test cases generated and saved');

      ctx.body = AutoTestController.success({
        generatedCount: savedTestCases.length,
        totalGenerated: generatedCount,
        failedCount,
        collectionId: savedCollection._id,
        collectionName: savedCollection.name,
        taskId: savedTask?._id || null,
        testCases: allTestCases.slice(0, 10),
      }, '测试用例生成并保存成功');
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
      const { interfaceIds, projectId, collectionId, environmentId } = ctx.request.body;

      if (!projectId || !validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = AutoTestController.error('项目 ID 不能为空');
        return;
      }

      let testCollection = null;
      if (collectionId && validateObjectId(collectionId)) {
        testCollection = await TestCollection.findById(collectionId)
          .populate('test_cases');
        if (!testCollection || testCollection.project_id.toString() !== projectId) {
          ctx.status = 400;
          ctx.body = AutoTestController.error('测试集合不存在或不属于该项目');
          return;
        }
      } else {
        ctx.status = 400;
        ctx.body = AutoTestController.error('测试集合 ID 不能为空');
        return;
      }

      const testCases = await TestCase.find({
        _id: { $in: testCollection.test_cases },
        enabled: true,
      })
        .populate('interface_id')
        .sort({ order: 1 });

      if (testCases.length === 0) {
        ctx.status = 400;
        ctx.body = AutoTestController.error('测试集合中没有启用的测试用例');
        return;
      }

      const runner = new TestRunner();
      const report = await runner.runTestCollection(testCollection._id, {
        environmentId,
      });

      const qualityReport = this.generateQualityReport(report, testCases);

      logger.info({ 
        userId: user._id, 
        collectionId: testCollection._id,
        total: report.summary?.total || 0,
        passed: report.summary?.passed || 0,
        failed: report.summary?.failed || 0,
      }, 'Auto test executed');

      ctx.body = AutoTestController.success({
        report,
        qualityReport,
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

  /**
   * 生成质量报告
   */
  static generateQualityReport(report, testCases) {
    const interfaceMap = new Map();
    const issues = [];
    const suggestions = [];

    for (const testCase of testCases) {
      const interfaceId = testCase.interface_id?._id?.toString() || testCase.interface_id?.toString();
      if (!interfaceId) continue;

      if (!interfaceMap.has(interfaceId)) {
        interfaceMap.set(interfaceId, {
          interfaceId,
          interfaceName: testCase.interface_id?.title || 'Unknown',
          testCases: [],
          passed: 0,
          failed: 0,
          error: 0,
        });
      }

      const interfaceStats = interfaceMap.get(interfaceId);
      interfaceStats.testCases.push(testCase);

      const result = report.results?.find(r => 
        r.interface_id?.toString() === interfaceId || 
        r.interface_id === interfaceId
      );

      if (result) {
        if (result.status === 'passed') {
          interfaceStats.passed++;
        } else if (result.status === 'failed') {
          interfaceStats.failed++;
          issues.push({
            type: 'test_failed',
            interfaceId,
            interfaceName: interfaceStats.interfaceName,
            testCase: testCase.name,
            message: result.assertion_result?.message || '测试失败',
          });
        } else if (result.status === 'error') {
          interfaceStats.error++;
          issues.push({
            type: 'test_error',
            interfaceId,
            interfaceName: interfaceStats.interfaceName,
            testCase: testCase.name,
            message: result.error?.message || '测试执行错误',
          });
        }
      }
    }

    const interfaceStats = Array.from(interfaceMap.values());
    const totalInterfaces = interfaceStats.length;
    const testedInterfaces = interfaceStats.filter(s => s.passed + s.failed + s.error > 0).length;
    const passedInterfaces = interfaceStats.filter(s => s.failed === 0 && s.error === 0 && s.passed > 0).length;
    const failedInterfaces = interfaceStats.filter(s => s.failed > 0 || s.error > 0).length;

    if (testedInterfaces < totalInterfaces) {
      suggestions.push({
        type: 'untested_interfaces',
        message: `${totalInterfaces - testedInterfaces} 个接口未测试`,
        count: totalInterfaces - testedInterfaces,
      });
    }

    if (failedInterfaces > 0) {
      suggestions.push({
        type: 'fix_failed_tests',
        message: `${failedInterfaces} 个接口测试失败，建议修复`,
        count: failedInterfaces,
      });
    }

    const passRate = testedInterfaces > 0 ? (passedInterfaces / testedInterfaces * 100).toFixed(2) : 0;
    if (parseFloat(passRate) < 80) {
      suggestions.push({
        type: 'low_pass_rate',
        message: `测试通过率较低 (${passRate}%)，建议检查接口实现`,
        passRate: parseFloat(passRate),
      });
    }

    return {
      totalInterfaces,
      testedInterfaces,
      passedInterfaces,
      failedInterfaces,
      passRate: parseFloat(passRate),
      interfaceStats,
      issues,
      suggestions,
    };
  }
}

export default AutoTestController;

