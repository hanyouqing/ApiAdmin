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
        // 实现 Excel 格式
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('操作日志');

        // 设置列
        worksheet.columns = [
          { header: '时间', key: 'createdAt', width: 20 },
          { header: '类型', key: 'type', width: 15 },
          { header: '操作', key: 'action', width: 15 },
          { header: '目标', key: 'targetName', width: 30 },
          { header: '用户', key: 'username', width: 20 },
          { header: 'URI', key: 'uri', width: 40 },
          { header: 'IP', key: 'ip', width: 15 },
          { header: '详情', key: 'details', width: 50 },
        ];

        // 设置表头样式
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };

        // 添加数据
        for (const log of logs) {
          worksheet.addRow({
            createdAt: log.createdAt.toISOString(),
            type: log.type || '',
            action: log.action || '',
            targetName: log.targetName || log.targetId?.toString() || '',
            username: log.username || '',
            uri: log.uri || '',
            ip: log.ip || '',
            details: JSON.stringify(log.details || {}),
          });
        }

        // 生成 Excel 文件
        const buffer = await workbook.xlsx.writeBuffer();
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = 'logs.xlsx';
        ctx.set('Content-Type', contentType);
        ctx.set('Content-Disposition', `attachment; filename="${filename}"`);
        ctx.body = buffer;
        return;
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

