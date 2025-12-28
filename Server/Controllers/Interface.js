import Interface from '../Models/Interface.js';
import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import { logOperation } from '../Utils/operationLogger.js';
import mongoose from 'mongoose';

const createActivity = async (projectId, userId, action, targetType, targetId, description, metadata = {}) => {
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
  static async list(ctx) {
    try {
      const user = ctx.state.user;
      if (!user || !user._id) {
        ctx.status = 401;
        ctx.body = InterfaceController.error('用户未认证');
        return;
      }

      let { project_id, catid } = ctx.query;

      // 确保 user._id 是 ObjectId 类型
      let userId = user._id;
      if (userId && !(userId instanceof mongoose.Types.ObjectId)) {
        if (mongoose.Types.ObjectId.isValid(userId)) {
          userId = new mongoose.Types.ObjectId(userId);
        }
      }

      const query = {};

      // 如果没有指定 project_id
      if (!project_id) {
        // 如果是超级管理员，返回所有接口；否则只返回用户项目的接口
        if (user.role === 'super_admin') {
          // 超级管理员可以看到所有接口，不需要过滤，query 保持为空对象
          logger.debug({ userRole: 'super_admin' }, 'Interface list: super admin, no project filter');
        } else {
          const Project = (await import('../Models/Project.js')).default;
          // 获取用户参与的所有项目
          const projectQuery = {
            $or: [{ uid: userId }, { member: userId }],
          };
          
          logger.debug({ 
            projectQuery: JSON.stringify(projectQuery),
            userId: userId?.toString(),
          }, 'Interface list: fetching user projects');
          
          const userProjects = await Project.find(projectQuery).select('_id').lean();
          
          logger.info({ 
            projectCount: userProjects.length,
            userId: userId?.toString(),
          }, 'Interface list: user projects found');
          
          const projectIds = userProjects.map((p) => p._id);
          
          if (projectIds.length === 0) {
            // 用户没有参与任何项目，返回空列表
            logger.warn({ userId: userId?.toString() }, 'Interface list: user has no projects');
            ctx.body = InterfaceController.success([]);
            return;
          }
          query.project_id = { $in: projectIds };
          
          logger.debug({ 
            projectIds: projectIds.map(id => id.toString()),
            query: JSON.stringify(query),
          }, 'Interface list: query with project filter');
        }
      } else {
        // 如果指定了 project_id，验证用户是否有权限访问该项目
        if (!validateObjectId(project_id)) {
          ctx.status = 400;
          ctx.body = InterfaceController.error('无效的项目ID');
          return;
        }
        
        // 如果不是超级管理员，验证用户是否有权限访问该项目
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
        
        query.project_id = new mongoose.Types.ObjectId(project_id);
      }

      if (catid) {
        if (!validateObjectId(catid)) {
          ctx.status = 400;
          ctx.body = InterfaceController.error('无效的分类ID');
          return;
        }
        query.catid = new mongoose.Types.ObjectId(catid);
      }

      let interfaces;
      try {
        interfaces = await Interface.find(query)
          .populate('uid', 'username email avatar')
          .populate('project_id', 'project_name')
          .sort({ created_at: -1 })
          .limit(1000)
          .lean();
        
        logger.info({ 
          interfaceCount: interfaces.length,
          query: JSON.stringify(query),
          projectId: project_id,
        }, 'Interfaces found');
      } catch (populateError) {
        // 如果 populate 失败，尝试不使用 populate
        logger.warn({ error: populateError.message }, 'Populate failed, trying without populate');
        try {
          interfaces = await Interface.find(query)
            .sort({ created_at: -1 })
            .limit(1000)
            .lean();
          
          logger.info({ 
            interfaceCount: interfaces.length,
            query: JSON.stringify(query),
            projectId: project_id,
            note: 'Populate disabled',
          }, 'Interfaces found (without populate)');
        } catch (queryError) {
          logger.error({ 
            error: queryError.message, 
            stack: queryError.stack,
            query: JSON.stringify(query),
          }, 'Interface query failed');
          throw queryError;
        }
      }

      logger.debug({ 
        finalInterfaceCount: interfaces?.length || 0,
        interfaceIds: interfaces?.map(i => i._id?.toString()).slice(0, 10),
      }, 'Final interfaces list');

      ctx.body = InterfaceController.success(interfaces || []);
    } catch (error) {
      logger.error({ 
        error: error.message, 
        stack: error.stack, 
        userId: ctx.state.user?._id,
        userType: typeof ctx.state.user?._id,
        userIdValue: ctx.state.user?._id?.toString?.() || ctx.state.user?._id,
      }, 'Interface list error');
      ctx.status = 500;
      ctx.body = InterfaceController.error(
        process.env.NODE_ENV === 'production' 
          ? '获取接口列表失败' 
          : error.message || '获取接口列表失败'
      );
    }
  }

  static async add(ctx) {
    try {
      const user = ctx.state.user;
      let { project_id, title, path, method, catid } = ctx.request.body;

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

      if (catid && !validateObjectId(catid)) {
        ctx.status = 400;
        ctx.body = InterfaceController.error('无效的分类ID');
        return;
      }

      title = sanitizeInput(title);
      path = sanitizeInput(path);
      method = method.toUpperCase();

      if (title.length > 100) {
        ctx.status = 400;
        ctx.body = InterfaceController.error('接口名称长度不能超过100个字符');
        return;
      }

      if (path.length > 500) {
        ctx.status = 400;
        ctx.body = InterfaceController.error('接口路径长度不能超过500个字符');
        return;
      }

      const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      if (!validMethods.includes(method)) {
        ctx.status = 400;
        ctx.body = InterfaceController.error('无效的HTTP方法');
        return;
      }

      const Project = (await import('../Models/Project.js')).default;
      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = InterfaceController.error('项目不存在');
        return;
      }

      const isMember = project.member.some(
        (memberId) => memberId.toString() === user._id.toString()
      );
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

      logger.info({ userId: user._id, interfaceId: interfaceData._id }, 'Interface created');
      await createActivity(interfaceData.project_id, user._id, 'interface.created', 'interface', interfaceData._id, `创建了接口 ${title}`, { interfaceName: title });
      
      // 记录操作日志
      await logOperation({
        type: 'interface',
        action: 'create',
        targetId: interfaceData._id,
        targetName: title,
        userId: user._id,
        username: user.username,
        projectId: interfaceData.project_id,
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = InterfaceController.success(interfaceData, '创建成功');
    } catch (error) {
      logger.error({ error }, 'Interface add error');
      ctx.status = 500;
      ctx.body = InterfaceController.error(
        process.env.NODE_ENV === 'production' 
          ? '创建失败' 
          : error.message || '创建失败'
      );
    }
  }

  static async update(ctx) {
    try {
      const user = ctx.state.user;
      const { _id, ...updateData } = ctx.request.body;

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
      const isMember = project.member.some(
        (memberId) => memberId.toString() === user._id.toString()
      );
      const isSuperAdmin = user.role === 'super_admin';

      if (!isOwner && !isProjectOwner && !isMember && !isSuperAdmin) {
        ctx.status = 403;
        ctx.body = InterfaceController.error('无权限修改此接口');
        return;
      }

      if (updateData.title) {
        updateData.title = sanitizeInput(updateData.title);
        if (updateData.title.length > 100) {
          ctx.status = 400;
          ctx.body = InterfaceController.error('接口名称长度不能超过100个字符');
          return;
        }
      }

      if (updateData.path) {
        updateData.path = sanitizeInput(updateData.path);
        if (updateData.path.length > 500) {
          ctx.status = 400;
          ctx.body = InterfaceController.error('接口路径长度不能超过500个字符');
          return;
        }
      }

      if (updateData.method) {
        updateData.method = updateData.method.toUpperCase();
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
        if (!validMethods.includes(updateData.method)) {
          ctx.status = 400;
          ctx.body = InterfaceController.error('无效的HTTP方法');
          return;
        }
      }

      Object.assign(interfaceData, updateData);
      await interfaceData.save();

      logger.info({ userId: user._id, interfaceId: interfaceData._id }, 'Interface updated');
      await createActivity(interfaceData.project_id, user._id, 'interface.updated', 'interface', interfaceData._id, `更新了接口 ${interfaceData.title}`, { interfaceName: interfaceData.title });
      
      // 记录操作日志
      await logOperation({
        type: 'interface',
        action: 'update',
        targetId: interfaceData._id,
        targetName: interfaceData.title,
        userId: user._id,
        username: user.username,
        projectId: interfaceData.project_id,
        details: updateData,
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = InterfaceController.success(interfaceData, '更新成功');
    } catch (error) {
      logger.error({ error }, 'Interface update error');
      ctx.status = 500;
      ctx.body = InterfaceController.error(
        process.env.NODE_ENV === 'production' 
          ? '更新失败' 
          : error.message || '更新失败'
      );
    }
  }

  static async delete(ctx) {
    try {
      const user = ctx.state.user;
      const { _id } = ctx.query;

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
      const isSuperAdmin = user.role === 'super_admin';

      if (!isOwner && !isProjectOwner && !isSuperAdmin) {
        ctx.status = 403;
        ctx.body = InterfaceController.error('无权限删除此接口');
        return;
      }

      const interfaceTitle = interfaceData.title;
      const projectId = interfaceData.project_id;
      await Interface.findByIdAndDelete(_id);

      logger.info({ userId: user._id, interfaceId: _id }, 'Interface deleted');
      if (interfaceData) {
        await createActivity(projectId, user._id, 'interface.deleted', 'interface', _id, `删除了接口 ${interfaceTitle}`, { interfaceName: interfaceTitle });
      }
      
      // 记录操作日志
      await logOperation({
        type: 'interface',
        action: 'delete',
        targetId: _id,
        targetName: interfaceTitle,
        userId: user._id,
        username: user.username,
        projectId: projectId,
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = InterfaceController.success(null, '删除成功');
    } catch (error) {
      logger.error({ error }, 'Interface delete error');
      ctx.status = 500;
      ctx.body = InterfaceController.error(
        process.env.NODE_ENV === 'production' 
          ? '删除失败' 
          : error.message || '删除失败'
      );
    }
  }

  static async get(ctx) {
    try {
      const { _id } = ctx.query;

      const interfaceData = await Interface.findById(_id)
        .populate('uid', 'username email avatar')
        .populate('project_id', 'project_name basepath');

      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = InterfaceController.error('接口不存在');
        return;
      }

      ctx.body = InterfaceController.success(interfaceData);
    } catch (error) {
      ctx.status = 500;
      ctx.body = InterfaceController.error(error.message || '获取接口详情失败');
    }
  }

  static async run(ctx) {
    try {
      const user = ctx.state.user;
      const { _id, env, params = {} } = ctx.request.body;

      if (!validateObjectId(_id)) {
        ctx.status = 400;
        ctx.body = InterfaceController.error('无效的接口ID');
        return;
      }

      const interfaceData = await Interface.findById(_id)
        .populate('project_id', 'basepath env');

      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = InterfaceController.error('接口不存在');
        return;
      }

      const project = interfaceData.project_id;
      const environment = project.env.find((e) => e.name === env) || project.env[0] || {};
      const baseUrl = environment.host || project.basepath || '';

      let path = interfaceData.path;
      const pathParams = params.path || {};
      Object.keys(pathParams).forEach((key) => {
        path = path.replace(`{${key}}`, pathParams[key]);
      });

      const url = `${baseUrl}${path}`;
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
          params: query,
          data: body,
          headers,
          timeout: 30000,
          validateStatus: () => true,
        });

        const duration = Date.now() - startTime;

        logger.info({ userId: user._id, interfaceId: _id, status: response.status }, 'Interface run completed');
        await createActivity(interfaceData.project_id, user._id, 'interface.run', 'interface', _id, `运行了接口 ${interfaceData.title}`, { interfaceName: interfaceData.title, status: response.status });

        ctx.body = InterfaceController.success({
          request: {
            url,
            method: interfaceData.method,
            query,
            body,
            headers,
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data,
            duration,
          },
        }, '运行成功');
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error({ error, interfaceId: _id }, 'Interface run error');

        ctx.body = InterfaceController.success({
          request: {
            url,
            method: interfaceData.method,
            query,
            body,
            headers,
          },
          response: {
            status: error.response?.status || 0,
            statusText: error.response?.statusText || 'Error',
            headers: error.response?.headers || {},
            data: error.response?.data || { error: error.message },
            duration,
          },
          error: {
            message: error.message,
            code: error.code,
          },
        }, '运行完成（有错误）');
      }
    } catch (error) {
      logger.error({ error }, 'Interface run error');
      ctx.status = 500;
      ctx.body = InterfaceController.error(
        process.env.NODE_ENV === 'production'
          ? '运行失败'
          : error.message || '运行失败'
      );
    }
  }

  // Admin APIs - only for super_admin
  static async listAllInterfaces(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = InterfaceController.error('只有超级管理员可以查看所有接口');
        return;
      }

      let interfaces = [];
      try {
        interfaces = await Interface.find({})
          .populate('project_id', 'project_name')
          .populate('uid', 'username email avatar')
          .sort({ created_at: -1 })
          .limit(1000)
          .lean();
      } catch (populateError) {
        logger.warn({ error: populateError.message }, 'Populate failed, trying without populate');
        try {
          interfaces = await Interface.find({})
            .sort({ created_at: -1 })
            .limit(1000)
            .lean();
        } catch (queryError) {
          logger.error({ error: queryError.message, stack: queryError.stack }, 'Interface query failed');
          throw queryError;
        }
      }

      ctx.body = InterfaceController.success(Array.isArray(interfaces) ? interfaces : []);
    } catch (error) {
      logger.error({ error }, 'List all interfaces error');
      ctx.status = 500;
      ctx.body = InterfaceController.error(error.message || '获取接口列表失败');
    }
  }
}

export default InterfaceController;

