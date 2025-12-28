import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import Project from '../Models/Project.js';
import Interface from '../Models/Interface.js';
import TestResult from '../Models/TestResult.js';
import TestCollection from '../Models/TestCollection.js';
import TestCase from '../Models/TestCase.js';

class AnalyticsController extends BaseController {
  static get ControllerName() { return 'AnalyticsController'; }

  static async getProjectHealth(ctx) {
    try {
      const { projectId } = ctx.params;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = AnalyticsController.error('无效的项目 ID');
        return;
      }

      const project = await Project.findById(projectId);
      if (!project) {
        ctx.status = 404;
        ctx.body = AnalyticsController.error('项目不存在');
        return;
      }

      // 获取接口总数
      const totalInterfaces = await Interface.countDocuments({ project_id: projectId });

      // 获取有文档的接口数（有描述或返回数据）
      const documentedInterfaces = await Interface.countDocuments({
        project_id: projectId,
        $or: [
          { desc: { $exists: true, $ne: '' } },
          { res_body: { $exists: true, $ne: '' } },
        ],
      });

      const documentationCoverage = totalInterfaces > 0 ? documentedInterfaces / totalInterfaces : 0;

      // 获取 Mock 使用率（有 Mock 数据的接口数）
      const mockUsedInterfaces = await Interface.countDocuments({
        project_id: projectId,
        res_body: { $exists: true, $ne: '' },
      });
      const mockUsageRate = totalInterfaces > 0 ? mockUsedInterfaces / totalInterfaces : 0;

      // 获取测试通过率
      const testCollections = await TestCollection.find({ project_id: projectId });
      const collectionIds = testCollections.map(c => c._id);

      const testResults = await TestResult.find({
        collection_id: { $in: collectionIds },
      });

      let totalTests = 0;
      let passedTests = 0;

      for (const result of testResults) {
        totalTests++;
        if (result.status === 'passed') {
          passedTests++;
        }
      }

      const testPassRate = totalTests > 0 ? passedTests / totalTests : 0;

      // 获取团队成员信息
      const members = project.members || [];
      const totalMembers = members.length + (project.uid ? 1 : 0);

      // 计算活跃成员（最近30天有操作）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      // TODO: 从操作日志中获取活跃成员数

      // 计算变更频率
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // TODO: 从操作日志中获取变更频率
      const changeFrequency = {
        daily: 0,
        weekly: 0,
        monthly: 0,
      };

      // 计算综合健康度分数
      const score = Math.round(
        (documentationCoverage * 0.3 +
          mockUsageRate * 0.2 +
          testPassRate * 0.3 +
          (totalMembers > 0 ? 0.2 : 0)) *
          100
      );

      ctx.body = AnalyticsController.success({
        totalInterfaces,
        documentedInterfaces,
        documentationCoverage,
        mockUsageRate,
        testPassRate,
        teamActivity: {
          totalMembers,
          activeMembers: totalMembers, // TODO: 计算实际活跃成员
          contributionScore: 85, // TODO: 计算贡献度分数
        },
        changeFrequency,
        score,
        trend: 'stable', // TODO: 计算趋势
      });
    } catch (error) {
      logger.error({ error }, 'Get project health error');
      ctx.status = 500;
      ctx.body = AnalyticsController.error(
        process.env.NODE_ENV === 'production'
          ? '获取项目健康度失败'
          : error.message || '获取项目健康度失败'
      );
    }
  }

  static async getInterfaceQuality(ctx) {
    try {
      const { id } = ctx.params;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = AnalyticsController.error('无效的接口 ID');
        return;
      }

      // 获取测试历史
      const testCases = await TestCase.find({ interface_id: id });
      const testCaseIds = testCases.map(tc => tc._id);

      const testResults = await TestResult.find({
        test_case_id: { $in: testCaseIds },
      }).sort({ run_at: -1 });

      const totalRuns = testResults.length;
      const successRuns = testResults.filter(r => r.status === 'passed').length;
      const successRate = totalRuns > 0 ? successRuns / totalRuns : 0;

      // 计算平均响应时间
      const responseTimes = testResults
        .filter(r => r.duration)
        .map(r => r.duration);
      const averageResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

      // 生成趋势数据（最近30天）
      const trend = [];
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentResults = testResults.filter(r => r.run_at >= thirtyDaysAgo);
      // TODO: 按日期分组计算趋势

      ctx.body = AnalyticsController.success({
        testHistory: {
          totalRuns,
          successRate,
          averageResponseTime,
          trend: [],
        },
        impactAnalysis: {
          affectedFrontendPages: [], // TODO: 实现影响分析
          affectedDownstreamServices: [], // TODO: 实现影响分析
          riskLevel: 'low',
        },
      });
    } catch (error) {
      logger.error({ error }, 'Get interface quality error');
      ctx.status = 500;
      ctx.body = AnalyticsController.error(
        process.env.NODE_ENV === 'production'
          ? '获取接口质量分析失败'
          : error.message || '获取接口质量分析失败'
      );
    }
  }
}

export default AnalyticsController;

