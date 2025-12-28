import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import OperationLog from '../Models/OperationLog.js';

class OperationLogController extends BaseController {
  static get ControllerName() { return 'OperationLogController'; }

  static async listLogs(ctx) {
    try {
      const {
        type,
        projectId,
        userId,
        action,
        startDate,
        endDate,
        page = 1,
        pageSize = 10,
      } = ctx.query;

      const query = {};

      if (type && type !== 'all') {
        query.type = type;
      }

      if (projectId && validateObjectId(projectId)) {
        query.projectId = projectId;
      }

      if (userId && validateObjectId(userId)) {
        query.userId = userId;
      }

      if (action) {
        query.action = action;
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
        OperationLog.find(query)
          .populate('userId', 'username')
          .populate('projectId', 'project_name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        OperationLog.countDocuments(query),
      ]);

      ctx.body = OperationLogController.success({
        list,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize)),
        },
      });
    } catch (error) {
      logger.error({ error }, 'List operation logs error');
      ctx.status = 500;
      ctx.body = OperationLogController.error(
        process.env.NODE_ENV === 'production'
          ? '获取操作日志失败'
          : error.message || '获取操作日志失败'
      );
    }
  }

  static async exportLogs(ctx) {
    try {
      const { type, projectId, startDate, endDate, format = 'csv' } = ctx.query;

      const query = {};

      if (type && type !== 'all') {
        query.type = type;
      }

      if (projectId && validateObjectId(projectId)) {
        query.projectId = projectId;
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

      const logs = await OperationLog.find(query)
        .populate('userId', 'username')
        .populate('projectId', 'project_name')
        .sort({ createdAt: -1 })
        .limit(10000); // 限制导出数量

      let content = '';
      let contentType = 'text/csv';
      let filename = 'logs.csv';

      if (format === 'csv') {
        // CSV 格式
        const headers = ['时间', '类型', '操作', '目标', '用户', 'URI', 'IP', '详情'];
        content = headers.join(',') + '\n';

        for (const log of logs) {
          const row = [
            log.createdAt.toISOString(),
            log.type,
            log.action,
            log.targetName || log.targetId.toString(),
            log.username,
            log.uri || '',
            log.ip || '',
            JSON.stringify(log.details || {}),
          ];
          content += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
        }
      } else if (format === 'json') {
        contentType = 'application/json';
        filename = 'logs.json';
        content = JSON.stringify(logs, null, 2);
      } else if (format === 'excel') {
        // TODO: 实现 Excel 格式
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = 'logs.xlsx';
        content = JSON.stringify(logs, null, 2); // 临时使用 JSON
      }

      ctx.set('Content-Type', contentType);
      ctx.set('Content-Disposition', `attachment; filename="${filename}"`);
      ctx.body = content;
    } catch (error) {
      logger.error({ error }, 'Export operation logs error');
      ctx.status = 500;
      ctx.body = OperationLogController.error(
        process.env.NODE_ENV === 'production'
          ? '导出操作日志失败'
          : error.message || '导出操作日志失败'
      );
    }
  }
}

export default OperationLogController;

