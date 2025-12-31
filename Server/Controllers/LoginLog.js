import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import LoginLog from '../Models/LoginLog.js';

class LoginLogController extends BaseController {
  static get ControllerName() { return 'LoginLogController'; }

  static async listLogs(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = LoginLogController.error('只有超级管理员可以查看登录日志');
        return;
      }

      const {
        userId,
        status,
        loginType,
        startDate,
        endDate,
        page = 1,
        pageSize = 20,
      } = ctx.query;

      const query = {};

      if (userId && validateObjectId(userId)) {
        query.userId = userId;
      }

      if (status && ['success', 'failed'].includes(status)) {
        query.status = status;
      }

      if (loginType) {
        query.loginType = loginType;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
        }
      }

      const skip = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const [list, total] = await Promise.all([
        LoginLog.find(query)
          .populate('userId', 'username email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        LoginLog.countDocuments(query),
      ]);

      ctx.body = LoginLogController.success({
        list,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize)),
        },
      });
    } catch (error) {
      logger.error({ error }, 'List login logs error');
      ctx.status = 500;
      ctx.body = LoginLogController.error(
        process.env.NODE_ENV === 'production'
          ? '获取登录日志失败'
          : error.message || '获取登录日志失败'
      );
    }
  }

  static async getStatistics(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = LoginLogController.error('只有超级管理员可以查看登录统计');
        return;
      }

      const { startDate, endDate } = ctx.query;
      const query = {};

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
        }
      }

      const [totalLogins, successLogins, failedLogins] = await Promise.all([
        LoginLog.countDocuments(query),
        LoginLog.countDocuments({ ...query, status: 'success' }),
        LoginLog.countDocuments({ ...query, status: 'failed' }),
      ]);

      // 按登录类型统计
      const loginTypeStats = await LoginLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$loginType',
            count: { $sum: 1 },
          },
        },
      ]);

      // 最近7天的登录趋势
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const trendQuery = {
        ...query,
        createdAt: {
          ...(query.createdAt || {}),
          $gte: sevenDaysAgo,
        },
      };

      const dailyStats = await LoginLog.aggregate([
        { $match: trendQuery },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
            success: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      ctx.body = LoginLogController.success({
        total: totalLogins,
        success: successLogins,
        failed: failedLogins,
        successRate: totalLogins > 0 ? ((successLogins / totalLogins) * 100).toFixed(2) : 0,
        loginTypeStats: loginTypeStats.map((item) => ({
          type: item._id,
          count: item.count,
        })),
        dailyStats: dailyStats.map((item) => ({
          date: item._id,
          total: item.count,
          success: item.success,
          failed: item.failed,
        })),
      });
    } catch (error) {
      logger.error({ error }, 'Get login log statistics error');
      ctx.status = 500;
      ctx.body = LoginLogController.error(
        process.env.NODE_ENV === 'production'
          ? '获取登录统计失败'
          : error.message || '获取登录统计失败'
      );
    }
  }
}

export default LoginLogController;


