import Koa from 'koa';
import Project from '../Models/Project.js';
import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import { logOperation } from '../Utils/operationLogger.js';
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

class ProjectController extends BaseController {
  static async list(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      if (!user || !user._id) {
        ctx.status = 401;
        ctx.body = ProjectController.error('用户未认证');
        return;
      }

      const { group_id } = ctx.query;

      let userId: mongoose.Types.ObjectId;
      
      if (user._id instanceof mongoose.Types.ObjectId) {
        userId = user._id;
      } else {
        const userIdStr = user._id.toString();
        if (mongoose.Types.ObjectId.isValid(userIdStr)) {
          userId = new mongoose.Types.ObjectId(userIdStr);
        } else {
          ctx.status = 400;
          ctx.body = ProjectController.error('无效的用户ID格式');
          return;
        }
      }

      let query: any = {};
      if (user.role === 'super_admin') {
        query = {};
      } else {
        query = {
          $or: [
            { uid: userId },
            { member: userId },
          ],
        };
      }

      if (group_id && typeof group_id === 'string' && validateObjectId(group_id)) {
        query.group_id = new mongoose.Types.ObjectId(group_id);
      }

      let projects = await Project.find(query)
        .populate('group_id', 'group_name')
        .populate('uid', 'username email avatar')
        .sort({ created_at: -1 })
        .lean();
      
      // 确保每个项目都有 env 字段（即使为空数组）
      const processedProjects = projects.map((project: any) => ({
        ...project,
        env: project.env || [],
      }));

      ctx.body = ProjectController.success(processedProjects);
    } catch (error: any) {
      logger.error({ 
        error: error.message, 
        userId: ctx.state.user?._id,
      }, 'Project list error');
      ctx.status = 500;
      ctx.body = ProjectController.error(
        process.env.NODE_ENV === 'production' 
          ? '获取项目列表失败' 
          : error.message || '获取项目列表失败'
      );
    }
  }

  static async add(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      let { project_name, project_desc, group_id, basepath, icon, color } = ctx.request.body as any;

      if (!project_name || !group_id) {
        ctx.status = 400;
        ctx.body = ProjectController.error('项目名称和分组ID不能为空');
        return;
      }

      if (!validateObjectId(group_id)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('无效的分组ID');
        return;
      }

      const Group = (await import('../Models/Group.js')).default;
      const group = await Group.findById(group_id);
      if (!group) {
        ctx.status = 404;
        ctx.body = ProjectController.error('分组不存在');
        return;
      }

      const isMember = group.member.some(
        (memberId: any) => memberId.toString() === user._id.toString()
      );
      const isOwner = group.uid.toString() === user._id.toString();
      const isSuperAdmin = user.role === 'super_admin';

      if (!isMember && !isOwner && !isSuperAdmin) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限在此分组中创建项目');
        return;
      }

      project_name = sanitizeInput(project_name);
      if (project_name.length > 50) {
        ctx.status = 400;
        ctx.body = ProjectController.error('项目名称长度不能超过50个字符');
        return;
      }

      const existingProject = await Project.findOne({ 
        project_name, 
        group_id 
      });
      if (existingProject) {
        ctx.status = 400;
        ctx.body = ProjectController.error('该分组下已存在同名项目，请使用其他名称');
        return;
      }

      const project = new Project({
        project_name,
        project_desc: project_desc ? sanitizeInput(project_desc) : '',
        group_id,
        uid: user._id,
        basepath: basepath ? sanitizeInput(basepath) : '',
        icon: icon || '',
        color: color || '#1890ff',
        member: [user._id],
        env: [],
        tag: [],
      });

      await project.save();

      try {
        const ProjectMember = (await import('../Models/ProjectMember.js')).default;
        const projectMember = new ProjectMember({
          project_id: project._id,
          user_id: user._id,
          role: 'owner',
          invited_by: user._id,
        });
        await projectMember.save();
      } catch (memberError) {
        logger.warn({ error: memberError, projectId: project._id }, 'Failed to create project member record');
      }

      await createActivity(project._id, user._id, 'project.created', 'project', project._id, `创建了项目 ${project_name}`);
      
      await logOperation({
        type: 'project',
        action: 'create',
        // @ts-ignore
        targetId: project._id,
        targetName: project_name,
        userId: user._id as any,
        username: user.username,
        // @ts-ignore
        projectId: project._id,
        ip: ctx.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(project, '创建成功');
    } catch (error: any) {
      logger.error({ error }, 'Project add error');
      ctx.status = 500;
      ctx.body = ProjectController.error(
        process.env.NODE_ENV === 'production' ? '创建失败' : error.message
      );
    }
  }

  static async update(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { _id, ...updateData } = ctx.request.body as any;

      const project = await Project.findById(_id);

      if (!project) {
        ctx.status = 404;
        ctx.body = ProjectController.error('项目不存在');
        return;
      }

      if (
        project.uid.toString() !== user._id.toString() &&
        !project.member.map(m => m.toString()).includes(user._id.toString()) &&
        user.role !== 'super_admin'
      ) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限修改此项目');
        return;
      }

      if (updateData.project_name && updateData.project_name !== project.project_name) {
        const existingProject = await Project.findOne({ 
          project_name: updateData.project_name, 
          group_id: project.group_id,
          _id: { $ne: project._id }
        });
        if (existingProject) {
          ctx.status = 400;
          ctx.body = ProjectController.error('该分组下已存在同名项目，请使用其他名称');
          return;
        }
      }

      Object.assign(project, updateData);
      await project.save();

      await createActivity(project._id, user._id, 'project.updated', 'project', project._id, `更新了项目 ${project.project_name}`);
      
      // @ts-ignore
      await logOperation({
        type: 'project',
        action: 'update',
        // @ts-ignore
        targetId: project._id,
        targetName: project.project_name,
        userId: user._id as any,
        username: user.username,
        // @ts-ignore
        projectId: project._id,
        details: updateData,
        ip: ctx.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(project, '更新成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = ProjectController.error(error.message || '更新失败');
    }
  }

  static async delete(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { _id } = ctx.query;

      if (typeof _id !== 'string') {
        ctx.status = 400;
        ctx.body = ProjectController.error('无效的ID');
        return;
      }

      const project = await Project.findById(_id);

      if (!project) {
        ctx.status = 404;
        ctx.body = ProjectController.error('项目不存在');
        return;
      }

      if (
        project.uid.toString() !== user._id.toString() &&
        user.role !== 'super_admin'
      ) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限删除此项目');
        return;
      }

      const projectName = project.project_name;
      await Project.findByIdAndDelete(_id);

      // @ts-ignore
      await logOperation({
        type: 'project',
        action: 'delete',
        // @ts-ignore
        targetId: new mongoose.Types.ObjectId(_id),
        targetName: projectName,
        userId: user._id as any,
        username: user.username,
        // @ts-ignore
        projectId: new mongoose.Types.ObjectId(_id),
        ip: ctx.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(null, '删除成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = ProjectController.error(error.message || '删除失败');
    }
  }

  static async get(ctx: Koa.Context) {
    try {
      const { _id } = ctx.query;

      if (typeof _id !== 'string') {
        ctx.status = 400;
        ctx.body = ProjectController.error('无效的ID');
        return;
      }

      const project = await Project.findById(_id)
        .populate('group_id', 'group_name group_desc')
        .populate('uid', 'username email avatar')
        .populate('member', 'username email avatar');

      if (!project) {
        ctx.status = 404;
        ctx.body = ProjectController.error('项目不存在');
        return;
      }

      ctx.body = ProjectController.success(project);
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = ProjectController.error(error.message || '获取项目详情失败');
    }
  }

  static async addEnvironment(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { project_id, name, host, variables } = ctx.request.body as any;

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('无效的项目ID');
        return;
      }

      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = ProjectController.error('项目不存在');
        return;
      }

      if (
        project.uid.toString() !== user._id.toString() &&
        !project.member.map(m => m.toString()).includes(user._id.toString()) &&
        user.role !== 'super_admin'
      ) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限修改此项目');
        return;
      }

      if (project.env.some((env: any) => env.name === name)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('环境名称已存在');
        return;
      }

      project.env.push({
        name: sanitizeInput(name),
        host: sanitizeInput(host),
        variables: variables || {},
      });

      await project.save();

      // @ts-ignore
      await createActivity(project._id, user._id, 'environment.added', 'environment', null, `添加了环境 ${name}`, { envName: name });

      // @ts-ignore
      await logOperation({
        type: 'project',
        action: 'add_environment',
        // @ts-ignore
        targetId: project._id,
        targetName: `${project.project_name} - ${name}`,
        userId: user._id as any,
        username: user.username,
        // @ts-ignore
        projectId: project._id,
        details: { environmentName: name, host },
        ip: ctx.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(project, '环境添加成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = ProjectController.error(error.message || '添加失败');
    }
  }

  static async canManageProject(project: any, user: AuthenticatedContext['state']['user']) {
    return (
      project.uid.toString() === user._id.toString() ||
      project.member.map((m: any) => m.toString()).includes(user._id.toString()) ||
      user.role === 'super_admin'
    );
  }

  static async updateEnvironment(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { project_id, env_name, name, host, variables } = ctx.request.body as any;

      if (!validateObjectId(project_id) || !env_name) {
        ctx.status = 400;
        ctx.body = ProjectController.error('项目ID和环境名称不能为空');
        return;
      }

      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = ProjectController.error('项目不存在');
        return;
      }

      if (!(await ProjectController.canManageProject(project, user))) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限修改此项目');
        return;
      }

      const env = (project.env as any[]).find((e: any) => e.name === env_name);
      if (!env) {
        ctx.status = 404;
        ctx.body = ProjectController.error('环境不存在');
        return;
      }

      if (name && name !== env_name && (project.env as any[]).some((e: any) => e.name === name)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('环境名称已存在');
        return;
      }

      if (name) env.name = sanitizeInput(name);
      if (host !== undefined) env.host = sanitizeInput(host);
      if (variables !== undefined) env.variables = variables;

      await project.save();
      await createActivity(project._id, user._id, 'environment.updated', 'environment', null, `更新了环境 ${env.name}`, { envName: env.name });
      ctx.body = ProjectController.success(project, '环境更新成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = ProjectController.error(error.message || '更新环境失败');
    }
  }

  static async deleteEnvironment(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const project_id = (ctx.query.project_id || (ctx.request.body as any)?.project_id) as string;
      const env_name = (ctx.query.env_name || (ctx.request.body as any)?.env_name) as string;

      if (!validateObjectId(project_id) || !env_name) {
        ctx.status = 400;
        ctx.body = ProjectController.error('项目ID和环境名称不能为空');
        return;
      }

      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = ProjectController.error('项目不存在');
        return;
      }

      if (!(await ProjectController.canManageProject(project, user))) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限修改此项目');
        return;
      }

      const before = project.env.length;
      project.env = (project.env as any[]).filter((e: any) => e.name !== env_name) as any;
      if (project.env.length === before) {
        ctx.status = 404;
        ctx.body = ProjectController.error('环境不存在');
        return;
      }

      await project.save();
      await createActivity(project._id, user._id, 'environment.deleted', 'environment', null, `删除了环境 ${env_name}`, { envName: env_name });
      ctx.body = ProjectController.success(project, '环境删除成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = ProjectController.error(error.message || '删除环境失败');
    }
  }

  static async addMember(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { project_id, member_email } = ctx.request.body as any;

      if (!validateObjectId(project_id) || !member_email) {
        ctx.status = 400;
        ctx.body = ProjectController.error('项目ID和成员邮箱不能为空');
        return;
      }

      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = ProjectController.error('项目不存在');
        return;
      }

      if (!(await ProjectController.canManageProject(project, user))) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限管理项目成员');
        return;
      }

      const User = (await import('../Models/User.js')).default;
      const member = await User.findOne({ email: sanitizeInput(member_email).toLowerCase() });
      if (!member) {
        ctx.status = 404;
        ctx.body = ProjectController.error('用户不存在');
        return;
      }

      if (project.member.map((m: any) => m.toString()).includes(member._id.toString())) {
        ctx.status = 400;
        ctx.body = ProjectController.error('用户已经是项目成员');
        return;
      }

      project.member.push(member._id as any);
      await project.save();
      await createActivity(project._id, user._id, 'member.added', 'member', member._id, `添加了成员 ${member.username}`);
      ctx.body = ProjectController.success(project, '成员添加成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = ProjectController.error(error.message || '添加成员失败');
    }
  }

  static async removeMember(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const project_id = (ctx.query.project_id || (ctx.request.body as any)?.project_id) as string;
      const member_id = (ctx.query.member_id || (ctx.request.body as any)?.member_id) as string;

      if (!validateObjectId(project_id) || !validateObjectId(member_id)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('项目ID和成员ID不能为空');
        return;
      }

      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = ProjectController.error('项目不存在');
        return;
      }

      if (!(await ProjectController.canManageProject(project, user))) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限管理项目成员');
        return;
      }

      project.member = project.member.filter((m: any) => m.toString() !== member_id) as any;
      await project.save();
      await createActivity(project._id, user._id, 'member.removed', 'member', member_id, `移除了项目成员`);
      ctx.body = ProjectController.success(project, '成员移除成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = ProjectController.error(error.message || '移除成员失败');
    }
  }

  static async getActivities(ctx: AuthenticatedContext) {
    try {
      const project_id = ctx.query.project_id as string;
      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('无效的项目ID');
        return;
      }

      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = ProjectController.error('项目不存在');
        return;
      }

      const Activity = (await import('../Models/Activity.js')).default;
      const activities = await Activity.find({ project_id })
        .populate('user_id', 'username email avatar')
        .sort({ createdAt: -1 })
        .limit(100);

      ctx.body = ProjectController.success(activities);
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = ProjectController.error(error.message || '获取项目动态失败');
    }
  }

  static async migrate(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { project_id, target_group_id } = ctx.request.body as any;

      if (!validateObjectId(project_id) || !validateObjectId(target_group_id)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('项目ID和目标分组ID不能为空');
        return;
      }

      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = ProjectController.error('项目不存在');
        return;
      }

      if (!(await ProjectController.canManageProject(project, user))) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限迁移此项目');
        return;
      }

      const Group = (await import('../Models/Group.js')).default;
      const group = await Group.findById(target_group_id);
      if (!group) {
        ctx.status = 404;
        ctx.body = ProjectController.error('目标分组不存在');
        return;
      }

      project.group_id = target_group_id;
      await project.save();
      await createActivity(project._id, user._id, 'project.migrated', 'project', project._id, `迁移项目到分组 ${group.group_name}`);
      ctx.body = ProjectController.success(project, '项目迁移成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = ProjectController.error(error.message || '迁移失败');
    }
  }

  static async copy(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { project_id, new_project_name, target_group_id } = ctx.request.body as any;

      if (!validateObjectId(project_id) || !new_project_name) {
        ctx.status = 400;
        ctx.body = ProjectController.error('项目ID和新项目名称不能为空');
        return;
      }

      const source = await Project.findById(project_id);
      if (!source) {
        ctx.status = 404;
        ctx.body = ProjectController.error('项目不存在');
        return;
      }

      const Interface = (await import('../Models/Interface.js')).default;
      const copied = new Project({
        project_name: sanitizeInput(new_project_name),
        project_desc: source.project_desc,
        group_id: target_group_id || source.group_id,
        uid: user._id,
        member: [user._id],
        basepath: source.basepath,
        env: source.env,
      });
      await copied.save();

      const interfaces = await Interface.find({ project_id: source._id });
      for (const iface of interfaces) {
        const data = iface.toObject() as any;
        delete data._id;
        delete data.__v;
        data.project_id = copied._id;
        data.uid = user._id;
        await Interface.create(data);
      }

      await createActivity(copied._id, user._id, 'project.copied', 'project', copied._id, `复制项目自 ${source.project_name}`);
      ctx.body = ProjectController.success(copied, '项目复制成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = ProjectController.error(error.message || '复制失败');
    }
  }
}

export default ProjectController;
