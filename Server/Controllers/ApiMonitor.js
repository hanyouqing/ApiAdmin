import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import { logOperation } from '../Utils/operationLogger.js';
import Project from '../Models/Project.js';
import ApiMonitor from '../Models/ApiMonitor.js';
import ApiMonitorRun from '../Models/ApiMonitorRun.js';
import { runApiMonitor } from '../Utils/apiMonitorRunner.js';
import scheduler from '../Utils/scheduler.js';

async function assertProjectAccess(projectId, user) {
  if (user.role === 'super_admin') {
    return Project.findById(projectId);
  }
  return Project.findOne({
    _id: projectId,
    $or: [{ uid: user._id }, { member: user._id }],
  });
}

function normalizeMonitorBody(body = {}) {
  const request = body.request || {};
  const assertions = body.assertions || {};
  const schedule = body.schedule || {};
  const notification = body.notification || {};

  return {
    name: body.name != null ? sanitizeInput(String(body.name)) : undefined,
    description: body.description != null ? String(body.description) : undefined,
    project_id: body.project_id,
    request: {
      method: (request.method || 'GET').toUpperCase(),
      url: request.url || '',
      headers: request.headers || {},
      body: request.body ?? null,
    },
    assertions: {
      status_code: assertions.status_code != null ? Number(assertions.status_code) : 200,
      body_contains: assertions.body_contains || '',
      max_response_time_ms:
        assertions.max_response_time_ms != null ? Number(assertions.max_response_time_ms) : 5000,
    },
    environment_id: body.environment_id || null,
    schedule: {
      enabled: !!schedule.enabled,
      cron: schedule.cron || '*/5 * * * *',
      timezone: schedule.timezone || 'Asia/Shanghai',
    },
    notification: {
      enabled: !!notification.enabled,
      on_failure: notification.on_failure !== false,
      on_success: !!notification.on_success,
      webhook_url: notification.webhook_url || '',
      email_addresses: Array.isArray(notification.email_addresses)
        ? notification.email_addresses.map((e) => String(e).trim()).filter(Boolean)
        : typeof notification.email_addresses === 'string'
          ? notification.email_addresses.split(/[,;\s]+/).filter(Boolean)
          : [],
    },
    enabled: body.enabled !== false,
  };
}

class ApiMonitorController extends BaseController {
  static get ControllerName() {
    return 'ApiMonitorController';
  }

  static async list(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id } = ctx.query;

      if (!project_id || !validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = ApiMonitorController.error('项目ID不能为空');
        return;
      }

      const project = await assertProjectAccess(project_id, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = ApiMonitorController.error('无权限访问该项目');
        return;
      }

      const monitors = await ApiMonitor.find({ project_id })
        .sort({ updatedAt: -1 })
        .lean();

      ctx.body = ApiMonitorController.success(monitors);
    } catch (error) {
      logger.error({ error }, 'List monitors error');
      ctx.status = 500;
      ctx.body = ApiMonitorController.error(error.message || '获取 Monitor 列表失败');
    }
  }

  static async create(ctx) {
    try {
      const user = ctx.state.user;
      const data = normalizeMonitorBody(ctx.request.body || {});

      if (!data.name || !data.project_id || !data.request.url) {
        ctx.status = 400;
        ctx.body = ApiMonitorController.error('名称、项目ID和请求 URL 不能为空');
        return;
      }
      if (!validateObjectId(data.project_id)) {
        ctx.status = 400;
        ctx.body = ApiMonitorController.error('无效的项目ID');
        return;
      }

      const project = await assertProjectAccess(data.project_id, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = ApiMonitorController.error('无权限访问该项目');
        return;
      }

      const monitor = await ApiMonitor.create({
        ...data,
        createdBy: user._id,
      });

      if (monitor.enabled && monitor.schedule.enabled) {
        await scheduler.reloadMonitor(monitor._id.toString());
      }

      await logOperation({
        type: 'test',
        action: 'create',
        targetId: monitor._id,
        targetName: monitor.name,
        userId: user._id,
        username: user.username,
        projectId: data.project_id,
        details: { url: monitor.request.url, cron: monitor.schedule.cron },
        ip: ctx.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ApiMonitorController.success(monitor, 'Monitor 创建成功');
    } catch (error) {
      if (error.code === 11000) {
        ctx.status = 400;
        ctx.body = ApiMonitorController.error('同名 Monitor 已存在');
        return;
      }
      logger.error({ error }, 'Create monitor error');
      ctx.status = 500;
      ctx.body = ApiMonitorController.error(error.message || '创建 Monitor 失败');
    }
  }

  static async get(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = ApiMonitorController.error('无效的 Monitor ID');
        return;
      }

      const monitor = await ApiMonitor.findById(id);
      if (!monitor) {
        ctx.status = 404;
        ctx.body = ApiMonitorController.error('Monitor 不存在');
        return;
      }

      const project = await assertProjectAccess(monitor.project_id, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = ApiMonitorController.error('无权限访问');
        return;
      }

      ctx.body = ApiMonitorController.success(monitor);
    } catch (error) {
      ctx.status = 500;
      ctx.body = ApiMonitorController.error(error.message || '获取失败');
    }
  }

  static async update(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = ApiMonitorController.error('无效的 Monitor ID');
        return;
      }

      const monitor = await ApiMonitor.findById(id);
      if (!monitor) {
        ctx.status = 404;
        ctx.body = ApiMonitorController.error('Monitor 不存在');
        return;
      }

      const project = await assertProjectAccess(monitor.project_id, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = ApiMonitorController.error('无权限访问');
        return;
      }

      const data = normalizeMonitorBody({ ...ctx.request.body, project_id: monitor.project_id });
      if (data.name) monitor.name = data.name;
      if (data.description !== undefined) monitor.description = data.description;
      monitor.request = data.request;
      monitor.assertions = data.assertions;
      monitor.environment_id = data.environment_id;
      monitor.schedule = data.schedule;
      monitor.notification = data.notification;
      if (ctx.request.body?.enabled !== undefined) monitor.enabled = !!ctx.request.body.enabled;

      await monitor.save();
      await scheduler.reloadMonitor(monitor._id.toString());

      ctx.body = ApiMonitorController.success(monitor, 'Monitor 已更新');
    } catch (error) {
      if (error.code === 11000) {
        ctx.status = 400;
        ctx.body = ApiMonitorController.error('同名 Monitor 已存在');
        return;
      }
      logger.error({ error }, 'Update monitor error');
      ctx.status = 500;
      ctx.body = ApiMonitorController.error(error.message || '更新失败');
    }
  }

  static async remove(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = ApiMonitorController.error('无效的 Monitor ID');
        return;
      }

      const monitor = await ApiMonitor.findById(id);
      if (!monitor) {
        ctx.status = 404;
        ctx.body = ApiMonitorController.error('Monitor 不存在');
        return;
      }

      const project = await assertProjectAccess(monitor.project_id, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = ApiMonitorController.error('无权限访问');
        return;
      }

      scheduler.stopMonitor(id);
      await ApiMonitorRun.deleteMany({ monitor_id: id });
      await monitor.deleteOne();

      ctx.body = ApiMonitorController.success(null, 'Monitor 已删除');
    } catch (error) {
      logger.error({ error }, 'Delete monitor error');
      ctx.status = 500;
      ctx.body = ApiMonitorController.error(error.message || '删除失败');
    }
  }

  static async run(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = ApiMonitorController.error('无效的 Monitor ID');
        return;
      }

      const monitor = await ApiMonitor.findById(id);
      if (!monitor) {
        ctx.status = 404;
        ctx.body = ApiMonitorController.error('Monitor 不存在');
        return;
      }

      const project = await assertProjectAccess(monitor.project_id, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = ApiMonitorController.error('无权限访问');
        return;
      }

      const result = await runApiMonitor(id, { triggeredBy: 'manual' });
      ctx.body = ApiMonitorController.success(
        { monitor: result.monitor, run: result.run },
        'Monitor 已执行'
      );
    } catch (error) {
      logger.error({ error }, 'Run monitor error');
      ctx.status = 500;
      ctx.body = ApiMonitorController.error(error.message || '执行失败');
    }
  }

  static async listRuns(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      const limit = Math.min(parseInt(ctx.query.limit, 10) || 20, 100);

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = ApiMonitorController.error('无效的 Monitor ID');
        return;
      }

      const monitor = await ApiMonitor.findById(id);
      if (!monitor) {
        ctx.status = 404;
        ctx.body = ApiMonitorController.error('Monitor 不存在');
        return;
      }

      const project = await assertProjectAccess(monitor.project_id, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = ApiMonitorController.error('无权限访问');
        return;
      }

      const runs = await ApiMonitorRun.find({ monitor_id: id })
        .sort({ run_at: -1 })
        .limit(limit)
        .lean();

      ctx.body = ApiMonitorController.success(runs);
    } catch (error) {
      ctx.status = 500;
      ctx.body = ApiMonitorController.error(error.message || '获取运行记录失败');
    }
  }
}

export default ApiMonitorController;
