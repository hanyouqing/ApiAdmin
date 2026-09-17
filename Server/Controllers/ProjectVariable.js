import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import Project from '../Models/Project.js';
import TestEnvironment from '../Models/TestEnvironment.js';
import ProjectVariableStore, { mapToEntries, entriesToMap } from '../Models/ProjectVariableStore.js';
import { getOrCreateVariableStore } from '../Utils/variableResolver.js';

async function assertProjectAccess(projectId, user) {
  if (user.role === 'super_admin') {
    return Project.findById(projectId);
  }
  return Project.findOne({
    _id: projectId,
    $or: [{ uid: user._id }, { member: user._id }],
  });
}

function normalizeEntries(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const key = String(item.key || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      value: item.value == null ? '' : String(item.value),
      enabled: item.enabled !== false,
      type: item.type === 'secret' ? 'secret' : 'default',
    });
  }
  return out;
}

class ProjectVariableController extends BaseController {
  static get ControllerName() {
    return 'ProjectVariableController';
  }

  static async getVariables(ctx) {
    try {
      const user = ctx.state.user;
      const { projectId } = ctx.params;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = ProjectVariableController.error('无效的项目ID');
        return;
      }

      const project = await assertProjectAccess(projectId, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = ProjectVariableController.error('无权限访问该项目');
        return;
      }

      const store = await getOrCreateVariableStore(projectId, user._id);
      const environments = await TestEnvironment.find({ project_id: projectId })
        .sort({ is_default: -1, name: 1 })
        .lean();

      ctx.body = ProjectVariableController.success({
        project_id: projectId,
        globals: store.globals || [],
        globals_map: entriesToMap(store.globals || []),
        environments: environments.map((env) => ({
          _id: env._id,
          name: env.name,
          base_url: env.base_url,
          is_default: env.is_default,
          variables: env.variables || {},
          headers: env.headers || {},
          description: env.description || '',
        })),
        legacy_project_env: project.env || [],
      });
    } catch (error) {
      logger.error({ error }, 'Get project variables error');
      ctx.status = 500;
      ctx.body = ProjectVariableController.error(error.message || '获取变量失败');
    }
  }

  static async updateGlobals(ctx) {
    try {
      const user = ctx.state.user;
      const { projectId } = ctx.params;
      const { globals } = ctx.request.body || {};

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = ProjectVariableController.error('无效的项目ID');
        return;
      }

      const project = await assertProjectAccess(projectId, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = ProjectVariableController.error('无权限访问该项目');
        return;
      }

      const entries = normalizeEntries(globals);
      const store = await getOrCreateVariableStore(projectId, user._id);
      store.globals = entries;
      await store.save();

      logger.info({ userId: user._id, projectId, count: entries.length }, 'Project globals updated');

      ctx.body = ProjectVariableController.success(
        { globals: store.globals, globals_map: entriesToMap(store.globals) },
        '全局变量已保存'
      );
    } catch (error) {
      logger.error({ error }, 'Update project globals error');
      ctx.status = 500;
      ctx.body = ProjectVariableController.error(error.message || '保存全局变量失败');
    }
  }

  /**
   * Sync legacy Project.env rows into TestEnvironment (+ optional seed globals).
   */
  static async syncFromLegacyEnv(ctx) {
    try {
      const user = ctx.state.user;
      const { projectId } = ctx.params;
      const { merge_globals = false } = ctx.request.body || {};

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = ProjectVariableController.error('无效的项目ID');
        return;
      }

      const project = await assertProjectAccess(projectId, user);
      if (!project) {
        ctx.status = 403;
        ctx.body = ProjectVariableController.error('无权限访问该项目');
        return;
      }

      const legacy = Array.isArray(project.env) ? project.env : [];
      const created = [];
      const updated = [];

      for (const row of legacy) {
        const name = sanitizeInput(row.name || 'default');
        const base_url = row.host || row.base_url || project.basepath || 'http://localhost';
        const variables = row.variables || {};
        let env = await TestEnvironment.findOne({ project_id: projectId, name });
        if (env) {
          env.base_url = base_url;
          env.variables = { ...(env.variables || {}), ...variables };
          if (row.headers) env.headers = { ...(env.headers || {}), ...row.headers };
          await env.save();
          updated.push(env.name);
        } else {
          env = await TestEnvironment.create({
            name,
            project_id: projectId,
            base_url,
            variables,
            headers: row.headers || {},
            description: 'Synced from Project.env',
            is_default: created.length === 0 && updated.length === 0,
            createdBy: user._id,
          });
          created.push(env.name);
        }
      }

      if (merge_globals && legacy.length > 0) {
        const store = await getOrCreateVariableStore(projectId, user._id);
        const mergedMap = {
          ...entriesToMap(store.globals || []),
          ...Object.assign({}, ...legacy.map((e) => e.variables || {})),
        };
        store.globals = mapToEntries(mergedMap);
        await store.save();
      }

      ctx.body = ProjectVariableController.success(
        { created, updated },
        '已同步到测试环境'
      );
    } catch (error) {
      if (error.code === 11000) {
        ctx.status = 400;
        ctx.body = ProjectVariableController.error('环境名称冲突，请手动处理后再同步');
        return;
      }
      logger.error({ error }, 'Sync legacy env error');
      ctx.status = 500;
      ctx.body = ProjectVariableController.error(error.message || '同步失败');
    }
  }
}

export default ProjectVariableController;
