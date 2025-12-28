import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import { logOperation } from '../Utils/operationLogger.js';
import TestEnvironment from '../Models/TestEnvironment.js';
import Project from '../Models/Project.js';

class TestEnvironmentController extends BaseController {
  static get ControllerName() { return 'TestEnvironmentController'; }

  // 创建测试环境
  static async createEnvironment(ctx) {
    try {
      const user = ctx.state.user;
      let { name, project_id, base_url, variables, headers, description, is_default } = ctx.request.body;

      if (!name || !project_id || !base_url) {
        ctx.status = 400;
        ctx.body = TestEnvironmentController.error('名称、项目ID和基础URL不能为空');
        return;
      }

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = TestEnvironmentController.error('无效的项目ID');
        return;
      }

      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = TestEnvironmentController.error('项目不存在');
        return;
      }

      name = sanitizeInput(name);

      // 如果设置为默认环境，取消其他默认环境
      if (is_default) {
        await TestEnvironment.updateMany(
          { project_id, is_default: true },
          { is_default: false }
        );
      }

      const environment = new TestEnvironment({
        name,
        project_id,
        base_url,
        variables: variables || {},
        headers: headers || {},
        description: description || '',
        is_default: is_default || false,
        createdBy: user._id,
      });

      await environment.save();

      logger.info({ userId: user._id, environmentId: environment._id }, 'Test environment created');

      // 记录操作日志
      await logOperation({
        type: 'test',
        action: 'create',
        targetId: environment._id,
        targetName: name,
        userId: user._id,
        username: user.username,
        projectId: project_id,
        details: {
          base_url: base_url,
          is_default: is_default || false,
        },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = TestEnvironmentController.success(environment, '测试环境创建成功');
    } catch (error) {
      if (error.code === 11000) {
        ctx.status = 400;
        ctx.body = TestEnvironmentController.error('环境名称已存在');
        return;
      }
      logger.error({ error }, 'Create test environment error');
      ctx.status = 500;
      ctx.body = TestEnvironmentController.error(
        process.env.NODE_ENV === 'production'
          ? '创建测试环境失败'
          : error.message || '创建测试环境失败'
      );
    }
  }

  // 获取环境列表
  static async listEnvironments(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id } = ctx.query;

      if (!project_id || !validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = TestEnvironmentController.error('项目ID不能为空');
        return;
      }

      // 验证用户是否有权限访问该项目
      if (user.role !== 'super_admin') {
        const project = await Project.findOne({
          _id: project_id,
          $or: [{ uid: user._id }, { member: user._id }],
        });

        if (!project) {
          ctx.status = 403;
          ctx.body = TestEnvironmentController.error('无权限访问该项目');
          return;
        }
      } else {
        // 超级管理员也需要验证项目是否存在
        const project = await Project.findById(project_id);
        if (!project) {
          ctx.status = 404;
          ctx.body = TestEnvironmentController.error('项目不存在');
          return;
        }
      }

      logger.debug({ 
        projectId: project_id,
        userId: user._id?.toString(),
        userRole: user.role,
      }, 'Fetching test environments');

      const environments = await TestEnvironment.find({ project_id })
        .populate('createdBy', 'username')
        .sort({ is_default: -1, createdAt: -1 })
        .lean();

      logger.info({ 
        projectId: project_id,
        environmentCount: environments.length,
      }, 'Test environments found');

      ctx.body = TestEnvironmentController.success(environments || []);
    } catch (error) {
      logger.error({ 
        error: error.message,
        stack: error.stack,
        projectId: ctx.query.project_id,
        userId: ctx.state.user?._id,
      }, 'List test environments error');
      ctx.status = 500;
      ctx.body = TestEnvironmentController.error(
        process.env.NODE_ENV === 'production'
          ? '获取测试环境列表失败'
          : error.message || '获取测试环境列表失败'
      );
    }
  }

  // 获取环境详情
  static async getEnvironment(ctx) {
    try {
      const { id } = ctx.params;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = TestEnvironmentController.error('无效的环境ID');
        return;
      }

      const environment = await TestEnvironment.findById(id)
        .populate('project_id', 'project_name')
        .populate('createdBy', 'username');

      if (!environment) {
        ctx.status = 404;
        ctx.body = TestEnvironmentController.error('测试环境不存在');
        return;
      }

      ctx.body = TestEnvironmentController.success(environment);
    } catch (error) {
      logger.error({ error }, 'Get test environment error');
      ctx.status = 500;
      ctx.body = TestEnvironmentController.error(
        process.env.NODE_ENV === 'production'
          ? '获取测试环境失败'
          : error.message || '获取测试环境失败'
      );
    }
  }

  // 更新环境
  static async updateEnvironment(ctx) {
    try {
      const { id } = ctx.params;
      const { name, base_url, variables, headers, description, is_default } = ctx.request.body;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = TestEnvironmentController.error('无效的环境ID');
        return;
      }

      const environment = await TestEnvironment.findById(id);
      if (!environment) {
        ctx.status = 404;
        ctx.body = TestEnvironmentController.error('测试环境不存在');
        return;
      }

      if (name !== undefined) {
        environment.name = sanitizeInput(name);
      }
      if (base_url !== undefined) {
        environment.base_url = base_url;
      }
      if (variables !== undefined) {
        environment.variables = variables;
      }
      if (headers !== undefined) {
        environment.headers = headers;
      }
      if (description !== undefined) {
        environment.description = sanitizeInput(description);
      }
      if (is_default !== undefined) {
        if (is_default) {
          // 取消其他默认环境
          await TestEnvironment.updateMany(
            { project_id: environment.project_id, is_default: true, _id: { $ne: id } },
            { is_default: false }
          );
        }
        environment.is_default = is_default;
      }

      await environment.save();

      logger.info({ environmentId: id }, 'Test environment updated');

      // 记录操作日志
      const user = ctx.state.user;
      const projectId = environment.project_id.toString();
      await logOperation({
        type: 'test',
        action: 'update',
        targetId: environment._id,
        targetName: environment.name,
        userId: user._id,
        username: user.username,
        projectId: projectId,
        details: {
          base_url: environment.base_url,
          is_default: environment.is_default,
        },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = TestEnvironmentController.success(environment, '测试环境更新成功');
    } catch (error) {
      if (error.code === 11000) {
        ctx.status = 400;
        ctx.body = TestEnvironmentController.error('环境名称已存在');
        return;
      }
      logger.error({ error }, 'Update test environment error');
      ctx.status = 500;
      ctx.body = TestEnvironmentController.error(
        process.env.NODE_ENV === 'production'
          ? '更新测试环境失败'
          : error.message || '更新测试环境失败'
      );
    }
  }

  // 删除环境
  static async deleteEnvironment(ctx) {
    try {
      const { id } = ctx.params;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = TestEnvironmentController.error('无效的环境ID');
        return;
      }

      const environment = await TestEnvironment.findById(id);
      if (!environment) {
        ctx.status = 404;
        ctx.body = TestEnvironmentController.error('测试环境不存在');
        return;
      }

      const user = ctx.state.user;
      const environmentName = environment.name;
      const projectId = environment.project_id.toString();

      await environment.deleteOne();

      logger.info({ environmentId: id }, 'Test environment deleted');

      // 记录操作日志
      await logOperation({
        type: 'test',
        action: 'delete',
        targetId: id,
        targetName: environmentName,
        userId: user._id,
        username: user.username,
        projectId: projectId,
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = TestEnvironmentController.success(null, '测试环境删除成功');
    } catch (error) {
      logger.error({ error }, 'Delete test environment error');
      ctx.status = 500;
      ctx.body = TestEnvironmentController.error(
        process.env.NODE_ENV === 'production'
          ? '删除测试环境失败'
          : error.message || '删除测试环境失败'
      );
    }
  }
}

export default TestEnvironmentController;

