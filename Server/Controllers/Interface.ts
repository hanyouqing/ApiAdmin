import Koa from 'koa';
import Interface from '../Models/Interface.js';
import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import { logOperation } from '../Utils/operationLogger.js';
import {
  executeInterfaceCreateHook,
  executeInterfaceUpdateHook,
  executeInterfaceDeleteHook,
  executeInterfaceRunHook,
} from '../Middleware/pluginHook.js';
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

const createActivity = async (
  projectId: mongoose.Types.ObjectId | string, 
  userId: mongoose.Types.ObjectId | string, 
  action: string, 
  targetType: string, 
  targetId: mongoose.Types.ObjectId | string | null, 
  description: string, 
  metadata: any = {}
) => {
  try {
    const Activity = (await import('../Models/Activity.js')).default;
    await Activity.create({
      project_id: projectId,
      user_id: userId,
      action,
      target_type: targetType,
      target_id: targetId,
      description,
      metadata,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to create activity log');
  }
};

class InterfaceController extends BaseController {
  static async list(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      if (!user || !user._id) {
        ctx.status = 401;
        ctx.body = InterfaceController.error('用户未认证');
        return;
      }

      let { project_id, catid } = ctx.query;

      let userId: mongoose.Types.ObjectId;
      if (user._id instanceof mongoose.Types.ObjectId) {
        userId = user._id;
      } else {
        userId = new mongoose.Types.ObjectId(user._id.toString());
      }

      const query: any = {};

      if (!project_id) {
        if (user.role !== 'super_admin') {
          const Project = (await import('../Models/Project.js')).default;
          const userProjects = await Project.find({
            $or: [{ uid: userId }, { member: userId }],
          }).select('_id').lean();
          
          const projectIds = userProjects.map((p: any) => p._id);
          
          if (projectIds.length === 0) {
            ctx.body = InterfaceController.success([]);
            return;
          }
          query.project_id = { $in: projectIds };
        }
      } else {
        if (!validateObjectId(project_id as string)) {
          ctx.status = 400;
          ctx.body = InterfaceController.error('无效的项目ID');
          return;
        }
        
        if (user.role !== 'super_admin') {
          const Project = (await import('../Models/Project.js')).default;
          const project = await Project.findOne({
            _id: project_id,
            $or: [{ uid: userId }, { member: userId }],
          });
          
          if (!project) {
            ctx.status = 403;
            ctx.body = InterfaceController.error('无权限访问该项目');
            return;
          }
        }
        
        query.project_id = new mongoose.Types.ObjectId(project_id as string);
      }

      if (catid && typeof catid === 'string' && validateObjectId(catid)) {
        query.catid = new mongoose.Types.ObjectId(catid);
      }

      const interfaces = await Interface.find(query)
        .populate('uid', 'username email avatar')
        .populate('project_id', 'project_name')
        .sort({ created_at: -1 })
        .limit(1000)
        .lean();

      ctx.body = InterfaceController.success(interfaces);
    } catch (error: any) {
      logger.error({ error: error.message, userId: ctx.state.user?._id }, 'Interface list error');
      ctx.status = 500;
      ctx.body = InterfaceController.error(
        process.env.NODE_ENV === 'production' ? '获取接口列表失败' : error.message
      );
    }
  }

  static async add(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      let { project_id, title, path, method, catid } = ctx.request.body as any;

      if (!project_id || !title || !path || !method) {
        ctx.status = 400;
        ctx.body = InterfaceController.error('项目ID、接口名称、路径和方法不能为空');
        return;
      }

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = InterfaceController.error('无效的项目ID');
        return;
      }

      title = sanitizeInput(title);
      path = sanitizeInput(path);
      method = method.toUpperCase();

      const Project = (await import('../Models/Project.js')).default;
      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = InterfaceController.error('项目不存在');
        return;
      }

      const isMember = project.member.some((m: any) => m.toString() === user._id.toString());
      const isOwner = project.uid.toString() === user._id.toString();
      const isSuperAdmin = user.role === 'super_admin';

      if (!isMember && !isOwner && !isSuperAdmin) {
        ctx.status = 403;
        ctx.body = InterfaceController.error('无权限在此项目中创建接口');
        return;
      }

      const interfaceData = new Interface({
        project_id,
        title,
        path,
        method,
        catid: catid || null,
        uid: user._id,
        req_query: [],
        req_headers: [],
        req_body_type: 'json',
        req_body_form: [],
        req_body: '',
        res_body: '',
        res_body_type: 'json',
        status: 'developing',
        tag: [],
        desc: '',
        markdown: '',
      });

      await interfaceData.save();

      // @ts-ignore
      await createActivity(interfaceData.project_id, user._id, 'interface.created', 'interface', interfaceData._id, `创建了接口 ${title}`);
      await executeInterfaceCreateHook(interfaceData, user);
      
      await logOperation({
        type: 'interface',
        action: 'create',
        // @ts-ignore
        targetId: interfaceData._id,
        targetName: title,
        userId: user._id as any,
        username: user.username,
        // @ts-ignore
        projectId: interfaceData.project_id,
        ip: ctx.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = InterfaceController.success(interfaceData, '创建成功');
    } catch (error: any) {
      logger.error({ error }, 'Interface add error');
      ctx.status = 500;
      ctx.body = InterfaceController.error(
        process.env.NODE_ENV === 'production' ? '创建失败' : error.message
      );
    }
  }

  static async update(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { _id, ...updateData } = ctx.request.body as any;

      if (!_id || !validateObjectId(_id)) {
        ctx.status = 400;
        ctx.body = InterfaceController.error('无效的接口ID');
        return;
      }

      const interfaceData = await Interface.findById(_id);
      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = InterfaceController.error('接口不存在');
        return;
      }

      const Project = (await import('../Models/Project.js')).default;
      const project = await Project.findById(interfaceData.project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = InterfaceController.error('项目不存在');
        return;
      }

      const isOwner = interfaceData.uid.toString() === user._id.toString();
      const isProjectOwner = project.uid.toString() === user._id.toString();
      const isMember = project.member.some((m: any) => m.toString() === user._id.toString());
      const isSuperAdmin = user.role === 'super_admin';

      if (!isOwner && !isProjectOwner && !isMember && !isSuperAdmin) {
        ctx.status = 403;
        ctx.body = InterfaceController.error('无权限修改此接口');
        return;
      }

      const oldData = { ...interfaceData.toObject() };
      Object.assign(interfaceData, updateData);
      await interfaceData.save();

      // @ts-ignore
      await createActivity(interfaceData.project_id, user._id, 'interface.updated', 'interface', interfaceData._id, `更新了接口 ${interfaceData.title}`);
      await executeInterfaceUpdateHook(interfaceData, user, oldData);
      
      await logOperation({
        type: 'interface',
        action: 'update',
        // @ts-ignore
        targetId: interfaceData._id,
        targetName: interfaceData.title,
        userId: user._id as any,
        username: user.username,
        // @ts-ignore
        projectId: interfaceData.project_id,
        details: updateData,
        ip: ctx.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = InterfaceController.success(interfaceData, '更新成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = InterfaceController.error(error.message || '更新失败');
    }
  }

  static async delete(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { _id } = ctx.query;

      if (typeof _id !== 'string' || !validateObjectId(_id)) {
        ctx.status = 400;
        ctx.body = InterfaceController.error('无效的接口ID');
        return;
      }

      const interfaceData = await Interface.findById(_id);
      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = InterfaceController.error('接口不存在');
        return;
      }

      const isOwner = interfaceData.uid.toString() === user._id.toString();
      const isSuperAdmin = user.role === 'super_admin';

      if (!isOwner && !isSuperAdmin) {
        ctx.status = 403;
        ctx.body = InterfaceController.error('无权限删除此接口');
        return;
      }

      const interfaceTitle = interfaceData.title;
      const projectId = interfaceData.project_id;
      // @ts-ignore
      await executeInterfaceDeleteHook(_id, user);
      await Interface.findByIdAndDelete(_id);

      // @ts-ignore
      await createActivity(projectId, user._id, 'interface.deleted', 'interface', _id, `删除了接口 ${interfaceTitle}`);
      
      // @ts-ignore
      await logOperation({
        type: 'interface',
        action: 'delete',
        // @ts-ignore
        targetId: new mongoose.Types.ObjectId(_id),
        targetName: interfaceTitle,
        userId: user._id as any,
        username: user.username,
        // @ts-ignore
        projectId: projectId,
        ip: ctx.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = InterfaceController.success(null, '删除成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = InterfaceController.error(error.message || '删除失败');
    }
  }

  static async batchDelete(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { ids } = ctx.request.body as any;
      if (!Array.isArray(ids) || ids.length === 0) {
        ctx.status = 400;
        ctx.body = InterfaceController.error('请提供要删除的接口ID列表');
        return;
      }

      const validIds = ids.filter((id: string) => validateObjectId(id));
      if (validIds.length === 0) {
        ctx.status = 400;
        ctx.body = InterfaceController.error('无效的接口ID');
        return;
      }

      const Project = (await import('../Models/Project.js')).default;
      const interfaces = await Interface.find({ _id: { $in: validIds } });
      for (const iface of interfaces) {
        const project = await Project.findById(iface.project_id);
        if (!project) continue;
        const allowed =
          project.uid.toString() === user._id.toString() ||
          project.member.map((m: any) => m.toString()).includes(user._id.toString()) ||
          user.role === 'super_admin';
        if (!allowed) {
          ctx.status = 403;
          ctx.body = InterfaceController.error('无权限删除部分接口');
          return;
        }
      }

      await Interface.deleteMany({ _id: { $in: validIds } });
      ctx.body = InterfaceController.success({ deleted: validIds.length }, '批量删除成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = InterfaceController.error(error.message || '批量删除失败');
    }
  }

  static async get(ctx: Koa.Context) {
    try {
      const { _id } = ctx.query;
      if (typeof _id !== 'string') {
        ctx.status = 400;
        ctx.body = InterfaceController.error('无效的ID');
        return;
      }

      const interfaceData = await Interface.findById(_id)
        .populate('uid', 'username email avatar')
        .populate('project_id', 'project_name basepath');

      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = InterfaceController.error('接口不存在');
        return;
      }

      ctx.body = InterfaceController.success(interfaceData);
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = InterfaceController.error(error.message || '获取接口详情失败');
    }
  }

  static async run(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { _id, env, params = {} } = ctx.request.body as any;

      if (!validateObjectId(_id)) {
        ctx.status = 400;
        ctx.body = InterfaceController.error('无效的接口ID');
        return;
      }

      const interfaceData = await Interface.findById(_id).populate('project_id');
      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = InterfaceController.error('接口不存在');
        return;
      }

      const project = interfaceData.project_id as any;
      const environment = project.env.find((e: any) => e.name === env) || project.env[0] || {};
      const baseUrl = environment.host || project.basepath || '';

      let path = interfaceData.path;
      const pathParams = params.path || {};
      Object.keys(pathParams).forEach((key) => {
        path = path.replace(`{${key}}`, pathParams[key]);
      });

      const rawUrl = `${baseUrl}${path}`;
      const { assertSafeOutboundUrl } = await import('../Utils/security.js');
      let url: string;
      try {
        url = assertSafeOutboundUrl(rawUrl);
      } catch (ssrfError: any) {
        ctx.status = 400;
        ctx.body = InterfaceController.error(ssrfError.message || '目标地址不安全');
        return;
      }

      const query = { ...params.query };
      const body = params.body;
      const headers = {
        'Content-Type': 'application/json',
        ...(environment.headers || {}),
        ...(params.headers || {}),
      };

      const axios = (await import('axios')).default;
      const startTime = Date.now();

      try {
        const response = await axios({
          method: interfaceData.method,
          url,
          maxRedirects: 0,
          params: query,
          data: body,
          headers,
          timeout: 30000,
          validateStatus: () => true,
        });

        const duration = Date.now() - startTime;

        // @ts-ignore
        await createActivity(interfaceData.project_id, user._id, 'interface.run', 'interface', _id, `运行了接口 ${interfaceData.title}`);
        await executeInterfaceRunHook(interfaceData, { url, method: interfaceData.method, query, body, headers }, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data,
          duration,
        });

        ctx.body = InterfaceController.success({
          request: { url, method: interfaceData.method, query, body, headers },
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data,
            duration,
          },
        }, '运行成功');
      } catch (error: any) {
        const duration = Date.now() - startTime;
        ctx.body = InterfaceController.success({
          request: { url, method: interfaceData.method, query, body, headers },
          response: {
            status: error.response?.status || 0,
            statusText: error.response?.statusText || 'Error',
            headers: error.response?.headers || {},
            data: error.response?.data || { error: error.message },
            duration,
          },
          error: { message: error.message, code: error.code },
        }, '运行完成（有错误）');
      }
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = InterfaceController.error(error.message || '运行失败');
    }
  }
}

export default InterfaceController;
