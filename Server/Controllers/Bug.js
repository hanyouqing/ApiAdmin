import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import { logOperation } from '../Utils/operationLogger.js';
import Project from '../Models/Project.js';
import Bug from '../Models/Bug.js';

const STATUSES = ['open', 'in_progress', 'resolved', 'closed', 'reopened'];
const SEVERITIES = ['critical', 'major', 'minor', 'trivial'];
const PRIORITIES = ['p0', 'p1', 'p2', 'p3'];

async function assertProjectAccess(projectId, user) {
  if (user.role === 'super_admin') {
    return Project.findById(projectId);
  }
  return Project.findOne({
    _id: projectId,
    $or: [{ uid: user._id }, { member: user._id }],
  });
}

function optionalObjectId(value) {
  if (value == null || value === '') return null;
  if (!validateObjectId(String(value))) return undefined;
  return String(value);
}

function normalizeBugBody(body = {}, { partial = false } = {}) {
  const out = {};

  if (body.title != null || !partial) {
    out.title = body.title != null ? sanitizeInput(String(body.title)).slice(0, 300) : undefined;
  }
  if (body.description != null || !partial) {
    out.description = body.description != null ? String(body.description) : '';
  }
  if (body.status != null) {
    out.status = STATUSES.includes(body.status) ? body.status : undefined;
  } else if (!partial) {
    out.status = 'open';
  }
  if (body.severity != null) {
    out.severity = SEVERITIES.includes(body.severity) ? body.severity : undefined;
  } else if (!partial) {
    out.severity = 'major';
  }
  if (body.priority != null) {
    out.priority = PRIORITIES.includes(body.priority) ? body.priority : undefined;
  } else if (!partial) {
    out.priority = 'p2';
  }
  if (body.tags != null) {
    out.tags = Array.isArray(body.tags)
      ? body.tags
          .map(t => String(t).trim())
          .filter(Boolean)
          .slice(0, 20)
      : typeof body.tags === 'string'
        ? body.tags
            .split(/[,，]/)
            .map(t => t.trim())
            .filter(Boolean)
            .slice(0, 20)
        : [];
  } else if (!partial) {
    out.tags = [];
  }
  if (body.assignee_id !== undefined) {
    const id = optionalObjectId(body.assignee_id);
    if (id === undefined && body.assignee_id) {
      out._invalidAssignee = true;
    } else {
      out.assignee_id = id;
    }
  } else if (!partial) {
    out.assignee_id = null;
  }
  if (body.external_url != null || !partial) {
    out.external_url =
      body.external_url != null ? String(body.external_url).trim().slice(0, 1000) : '';
  }

  for (const key of [
    'interface_id',
    'test_case_id',
    'auto_test_result_id',
    'monitor_id',
    'monitor_run_id',
  ]) {
    if (body[key] !== undefined) {
      const id = optionalObjectId(body[key]);
      if (id === undefined && body[key]) {
        out[`_invalid_${key}`] = true;
      } else {
        out[key] = id;
      }
    } else if (!partial) {
      out[key] = null;
    }
  }

  if (body.project_id != null) {
    out.project_id = body.project_id;
  }

  return out;
}

async function nextBugNumber(projectId) {
  const latest = await Bug.findOne({ project_id: projectId })
    .sort({ number: -1 })
    .select('number')
    .lean();
  return (latest?.number || 0) + 1;
}

function populateBugQuery(query) {
  return query
    .populate('assignee_id', 'username email')
    .populate('reporter_id', 'username email')
    .populate('interface_id', 'title path method')
    .populate('monitor_id', 'name');
}

class BugController extends BaseController {
  static get ControllerName() {
    return 'BugController';
  }

  static async list(ctx) {
    try {
      const user = ctx.state.user;
      const {
        project_id,
        status,
        severity,
        priority,
        assignee_id,
        q,
        include_deleted,
        page = 1,
        pageSize = 20,
      } = ctx.query;

      if (!project_id || !validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = BugController.error('项目ID不能为空');
        return;
      }

      const project = await assertProjectAccess(project_id, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = BugController.error('无权限访问该项目');
        return;
      }

      const filter = { project_id };
      if (include_deleted === '1' || include_deleted === 'true') {
        filter.deleted_at = { $ne: null };
      } else {
        filter.deleted_at = null;
      }
      if (status && STATUSES.includes(status)) filter.status = status;
      if (severity && SEVERITIES.includes(severity)) filter.severity = severity;
      if (priority && PRIORITIES.includes(priority)) filter.priority = priority;
      if (assignee_id && validateObjectId(assignee_id)) filter.assignee_id = assignee_id;
      if (q && String(q).trim()) {
        const term = String(q).trim();
        const or = [{ title: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }];
        const asNum = Number(term.replace(/^#?BUG-?/i, ''));
        if (Number.isFinite(asNum) && asNum > 0) {
          or.push({ number: asNum });
        }
        filter.$or = or;
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
      const skip = (pageNum - 1) * limit;

      const [items, total] = await Promise.all([
        populateBugQuery(Bug.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit)).lean(),
        Bug.countDocuments(filter),
      ]);

      ctx.body = BugController.success({
        items,
        total,
        page: pageNum,
        pageSize: limit,
      });
    } catch (error) {
      logger.error({ error }, 'List bugs error');
      ctx.status = 500;
      ctx.body = BugController.error(error.message || '获取缺陷列表失败');
    }
  }

  static async create(ctx) {
    try {
      const user = ctx.state.user;
      const data = normalizeBugBody(ctx.request.body || {});

      if (!data.title || !data.project_id) {
        ctx.status = 400;
        ctx.body = BugController.error('标题和项目ID不能为空');
        return;
      }
      if (!validateObjectId(data.project_id)) {
        ctx.status = 400;
        ctx.body = BugController.error('无效的项目ID');
        return;
      }
      if (data._invalidAssignee || Object.keys(data).some(k => k.startsWith('_invalid_'))) {
        ctx.status = 400;
        ctx.body = BugController.error('关联资源 ID 无效');
        return;
      }

      const project = await assertProjectAccess(data.project_id, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = BugController.error('无权限访问该项目');
        return;
      }

      const number = await nextBugNumber(data.project_id);
      const bug = await Bug.create({
        project_id: data.project_id,
        number,
        title: data.title,
        description: data.description || '',
        status: data.status || 'open',
        severity: data.severity || 'major',
        priority: data.priority || 'p2',
        tags: data.tags || [],
        assignee_id: data.assignee_id ?? null,
        reporter_id: user._id,
        interface_id: data.interface_id ?? null,
        test_case_id: data.test_case_id ?? null,
        auto_test_result_id: data.auto_test_result_id ?? null,
        monitor_id: data.monitor_id ?? null,
        monitor_run_id: data.monitor_run_id ?? null,
        external_url: data.external_url || '',
        comments: [],
      });

      await logOperation({
        type: 'test',
        action: 'create',
        targetId: bug._id,
        targetName: `BUG-${bug.number} ${bug.title}`,
        userId: user._id,
        username: user.username,
        projectId: data.project_id,
        details: { number: bug.number, severity: bug.severity, status: bug.status },
        ip: ctx.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      const populated = await populateBugQuery(Bug.findById(bug._id)).lean();
      ctx.body = BugController.success(populated, '缺陷创建成功');
    } catch (error) {
      if (error.code === 11000) {
        ctx.status = 409;
        ctx.body = BugController.error('缺陷编号冲突，请重试');
        return;
      }
      logger.error({ error }, 'Create bug error');
      ctx.status = 500;
      ctx.body = BugController.error(error.message || '创建缺陷失败');
    }
  }

  static async get(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = BugController.error('无效的缺陷 ID');
        return;
      }

      const bug = await populateBugQuery(Bug.findById(id)).lean();
      if (!bug || bug.deleted_at) {
        ctx.status = 404;
        ctx.body = BugController.error('缺陷不存在');
        return;
      }

      const project = await assertProjectAccess(bug.project_id, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = BugController.error('无权限访问');
        return;
      }

      ctx.body = BugController.success(bug);
    } catch (error) {
      logger.error({ error }, 'Get bug error');
      ctx.status = 500;
      ctx.body = BugController.error(error.message || '获取缺陷失败');
    }
  }

  static async update(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = BugController.error('无效的缺陷 ID');
        return;
      }

      const bug = await Bug.findById(id);
      if (!bug || bug.deleted_at) {
        ctx.status = 404;
        ctx.body = BugController.error('缺陷不存在');
        return;
      }

      const project = await assertProjectAccess(bug.project_id, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = BugController.error('无权限访问');
        return;
      }

      const data = normalizeBugBody(ctx.request.body || {}, { partial: true });
      if (data._invalidAssignee || Object.keys(data).some(k => k.startsWith('_invalid_'))) {
        ctx.status = 400;
        ctx.body = BugController.error('关联资源 ID 无效');
        return;
      }

      const fields = [
        'title',
        'description',
        'status',
        'severity',
        'priority',
        'tags',
        'assignee_id',
        'external_url',
        'interface_id',
        'test_case_id',
        'auto_test_result_id',
        'monitor_id',
        'monitor_run_id',
      ];
      for (const key of fields) {
        if (data[key] !== undefined) {
          bug[key] = data[key];
        }
      }

      await bug.save();

      await logOperation({
        type: 'test',
        action: 'update',
        targetId: bug._id,
        targetName: `BUG-${bug.number} ${bug.title}`,
        userId: user._id,
        username: user.username,
        projectId: bug.project_id,
        details: { status: bug.status, severity: bug.severity },
        ip: ctx.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      const populated = await populateBugQuery(Bug.findById(bug._id)).lean();
      ctx.body = BugController.success(populated, '缺陷更新成功');
    } catch (error) {
      logger.error({ error }, 'Update bug error');
      ctx.status = 500;
      ctx.body = BugController.error(error.message || '更新缺陷失败');
    }
  }

  static async remove(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = BugController.error('无效的缺陷 ID');
        return;
      }

      const bug = await Bug.findById(id);
      if (!bug || bug.deleted_at) {
        ctx.status = 404;
        ctx.body = BugController.error('缺陷不存在');
        return;
      }

      const project = await assertProjectAccess(bug.project_id, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = BugController.error('无权限访问');
        return;
      }

      bug.deleted_at = new Date();
      await bug.save();

      await logOperation({
        type: 'test',
        action: 'delete',
        targetId: bug._id,
        targetName: `BUG-${bug.number} ${bug.title}`,
        userId: user._id,
        username: user.username,
        projectId: bug.project_id,
        details: { soft: true },
        ip: ctx.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = BugController.success(null, '缺陷已移入回收站');
    } catch (error) {
      logger.error({ error }, 'Delete bug error');
      ctx.status = 500;
      ctx.body = BugController.error(error.message || '删除缺陷失败');
    }
  }

  static async restore(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = BugController.error('无效的缺陷 ID');
        return;
      }

      const bug = await Bug.findById(id);
      if (!bug || !bug.deleted_at) {
        ctx.status = 404;
        ctx.body = BugController.error('回收站中未找到该缺陷');
        return;
      }

      const project = await assertProjectAccess(bug.project_id, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = BugController.error('无权限访问');
        return;
      }

      bug.deleted_at = null;
      await bug.save();

      const populated = await populateBugQuery(Bug.findById(bug._id)).lean();
      ctx.body = BugController.success(populated, '缺陷已恢复');
    } catch (error) {
      logger.error({ error }, 'Restore bug error');
      ctx.status = 500;
      ctx.body = BugController.error(error.message || '恢复缺陷失败');
    }
  }

  static async purge(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = BugController.error('无效的缺陷 ID');
        return;
      }

      const bug = await Bug.findById(id);
      if (!bug || !bug.deleted_at) {
        ctx.status = 404;
        ctx.body = BugController.error('仅可彻底删除回收站中的缺陷');
        return;
      }

      const project = await assertProjectAccess(bug.project_id, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = BugController.error('无权限访问');
        return;
      }

      await Bug.deleteOne({ _id: bug._id });
      ctx.body = BugController.success(null, '缺陷已彻底删除');
    } catch (error) {
      logger.error({ error }, 'Purge bug error');
      ctx.status = 500;
      ctx.body = BugController.error(error.message || '彻底删除失败');
    }
  }

  static async addComment(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      const content = sanitizeInput(String(ctx.request.body?.content || '')).trim();

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = BugController.error('无效的缺陷 ID');
        return;
      }
      if (!content) {
        ctx.status = 400;
        ctx.body = BugController.error('评论内容不能为空');
        return;
      }

      const bug = await Bug.findById(id);
      if (!bug || bug.deleted_at) {
        ctx.status = 404;
        ctx.body = BugController.error('缺陷不存在');
        return;
      }

      const project = await assertProjectAccess(bug.project_id, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = BugController.error('无权限访问');
        return;
      }

      bug.comments.push({
        user_id: user._id,
        username: user.username || '',
        content: content.slice(0, 4000),
        createdAt: new Date(),
      });
      await bug.save();

      const populated = await populateBugQuery(Bug.findById(bug._id)).lean();
      ctx.body = BugController.success(populated, '评论已添加');
    } catch (error) {
      logger.error({ error }, 'Add bug comment error');
      ctx.status = 500;
      ctx.body = BugController.error(error.message || '添加评论失败');
    }
  }
}

export default BugController;
