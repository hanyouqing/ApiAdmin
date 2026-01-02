import Project from '../Models/Project.js';
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

class ProjectController extends BaseController {
  static async list(ctx) {
    try {
      const user = ctx.state.user;
      if (!user || !user._id) {
        ctx.status = 401;
        ctx.body = ProjectController.error('用户未认证');
        return;
      }

      const { group_id } = ctx.query;

      // 确保 user._id 是 ObjectId 类型
      // Mongoose 通常能自动处理，但为了确保兼容性，我们显式转换
      let userId = user._id;
      
      // 如果 userId 不是 ObjectId 实例，尝试转换
      if (!(userId instanceof mongoose.Types.ObjectId)) {
        // 尝试转换为字符串，然后验证
        const userIdStr = userId?.toString?.() || userId;
        if (userIdStr && mongoose.Types.ObjectId.isValid(userIdStr)) {
          userId = new mongoose.Types.ObjectId(userIdStr);
        } else {
          // 如果转换失败，记录错误并返回空列表
          logger.error({ 
            userId: userId,
            userIdType: typeof userId,
            userIdStr: userIdStr,
          }, 'Invalid user._id format');
          ctx.status = 400;
          ctx.body = ProjectController.error('无效的用户ID格式');
          return;
        }
      }

      // 超级管理员可以查看所有项目，普通用户只能查看自己参与的项目
      let query = {};
      if (user.role === 'super_admin') {
        query = {};
      } else {
        // 确保 userId 是有效的 ObjectId
        if (!userId || !(userId instanceof mongoose.Types.ObjectId)) {
          logger.error({ userId, userRole: user.role }, 'Invalid userId for non-admin user');
          ctx.status = 400;
          ctx.body = ProjectController.error('无效的用户ID');
          return;
        }
        // 查询条件：用户是项目负责人，或者用户在项目成员列表中
        // MongoDB 会自动匹配数组字段中的元素
        query = {
          $or: [
            { uid: userId },
            { member: userId },
          ],
        };
      }

      if (group_id && validateObjectId(group_id)) {
        query.group_id = new mongoose.Types.ObjectId(group_id);
      }

      // 记录查询条件用于调试
      logger.info({ 
        query: JSON.stringify(query),
        userId: userId?.toString(),
        userRole: user.role,
        groupId: group_id,
        queryType: typeof query,
      }, 'Project list query');

      let projects = [];
      try {
        // 默认情况下，Mongoose 会返回所有字段，包括 env
        // 使用 lean() 返回普通 JavaScript 对象
        projects = await Project.find(query)
          .populate('group_id', 'group_name')
          .populate('uid', 'username email avatar')
          .sort({ created_at: -1 })
          .lean();
        
        logger.info({ 
          projectCount: projects.length,
          userId: userId?.toString(),
          userRole: user.role,
        }, 'Projects found');
      } catch (populateError) {
        // 如果 populate 失败，尝试不使用 populate
        logger.warn({ error: populateError.message }, 'Populate failed, trying without populate');
        try {
          projects = await Project.find(query)
            .sort({ created_at: -1 })
            .lean();
          
          logger.info({ 
            projectCount: projects.length,
            userId: userId?.toString(),
            userRole: user.role,
            note: 'Populate disabled',
          }, 'Projects found (without populate)');
        } catch (queryError) {
          logger.error({ 
            error: queryError.message, 
            stack: queryError.stack,
            query: JSON.stringify(query),
            userId: userId?.toString?.(),
          }, 'Project query failed');
          throw queryError;
        }
      }
      
      // 确保每个项目都有 env 字段（即使为空数组）
      projects = projects.map((project) => ({
        ...project,
        env: project.env || [],
      }));

      logger.debug({ 
        finalProjectCount: projects.length,
        projectIds: projects.map(p => p._id?.toString()),
      }, 'Final projects list');

      ctx.body = ProjectController.success(Array.isArray(projects) ? projects : []);
    } catch (error) {
      logger.error({ 
        error: error.message, 
        stack: error.stack, 
        userId: ctx.state.user?._id,
        userType: typeof ctx.state.user?._id,
        userIdValue: ctx.state.user?._id?.toString?.() || ctx.state.user?._id,
        userRole: ctx.state.user?.role,
      }, 'Project list error');
      ctx.status = 500;
      ctx.body = ProjectController.error(
        process.env.NODE_ENV === 'production' 
          ? '获取项目列表失败' 
          : error.message || '获取项目列表失败'
      );
    }
  }

  static async add(ctx) {
    try {
      const user = ctx.state.user;
      let { project_name, project_desc, group_id, basepath, icon, color } = ctx.request.body;

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
        (memberId) => memberId.toString() === user._id.toString()
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

      if (project_desc) {
        project_desc = sanitizeInput(project_desc);
        if (project_desc.length > 500) {
          ctx.status = 400;
          ctx.body = ProjectController.error('项目描述长度不能超过500个字符');
          return;
        }
      }

      if (basepath) {
        basepath = sanitizeInput(basepath);
        if (basepath.length > 200) {
          ctx.status = 400;
          ctx.body = ProjectController.error('基本路径长度不能超过200个字符');
          return;
        }
      }

      if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('颜色格式不正确');
        return;
      }

      // 检查同一分组内项目名称是否已存在
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
        project_desc: project_desc || '',
        group_id,
        uid: user._id,
        basepath: basepath || '',
        icon: icon || '',
        color: color || '#1890ff',
        member: [user._id],
        env: [],
        tag: [],
      });

      await project.save();

      // 自动创建项目成员记录（owner 角色）
      try {
        const ProjectMember = (await import('../Models/ProjectMember.js')).default;
        const projectMember = new ProjectMember({
          project_id: project._id,
          user_id: user._id,
          role: 'owner',
          invited_by: user._id,
        });
        await projectMember.save();
        logger.info({ userId: user._id, projectId: project._id }, 'Project member (owner) created');
      } catch (memberError) {
        // 如果创建成员记录失败，记录错误但不影响项目创建
        logger.warn({ error: memberError, projectId: project._id }, 'Failed to create project member record');
      }

      logger.info({ userId: user._id, projectId: project._id }, 'Project created');
      await createActivity(project._id, user._id, 'project.created', 'project', project._id, `创建了项目 ${project_name}`);
      
      // 记录操作日志
      await logOperation({
        type: 'project',
        action: 'create',
        targetId: project._id,
        targetName: project_name,
        userId: user._id,
        username: user.username,
        projectId: project._id,
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(project, '创建成功');
    } catch (error) {
      logger.error({ error }, 'Project add error');
      ctx.status = 500;
      ctx.body = ProjectController.error(
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

      const project = await Project.findById(_id);

      if (!project) {
        ctx.status = 404;
        ctx.body = ProjectController.error('项目不存在');
        return;
      }

      if (
        project.uid.toString() !== user._id.toString() &&
        !project.member.includes(user._id) &&
        user.role !== 'super_admin'
      ) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限修改此项目');
        return;
      }

      // 如果更新了项目名称，检查同一分组内是否已存在同名项目
      if (updateData.project_name && updateData.project_name !== project.project_name) {
        const existingProject = await Project.findOne({ 
          project_name: updateData.project_name, 
          group_id: project.group_id,
          _id: { $ne: project._id } // 排除当前项目
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
      
      // 记录操作日志
      await logOperation({
        type: 'project',
        action: 'update',
        targetId: project._id,
        targetName: project.project_name,
        userId: user._id,
        username: user.username,
        projectId: project._id,
        details: updateData,
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(project, '更新成功');
    } catch (error) {
      ctx.status = 500;
      ctx.body = ProjectController.error(error.message || '更新失败');
    }
  }

  static async delete(ctx) {
    try {
      const user = ctx.state.user;
      const { _id } = ctx.query;

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

      // 记录操作日志
      await logOperation({
        type: 'project',
        action: 'delete',
        targetId: _id,
        targetName: projectName,
        userId: user._id,
        username: user.username,
        projectId: _id,
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(null, '删除成功');
    } catch (error) {
      ctx.status = 500;
      ctx.body = ProjectController.error(error.message || '删除失败');
    }
  }

  static async get(ctx) {
    try {
      const { _id } = ctx.query;

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
    } catch (error) {
      ctx.status = 500;
      ctx.body = ProjectController.error(error.message || '获取项目详情失败');
    }
  }

  static async addEnvironment(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id, name, host, variables } = ctx.request.body;

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('无效的项目ID');
        return;
      }

      if (!name || !host) {
        ctx.status = 400;
        ctx.body = ProjectController.error('环境名称和主机地址不能为空');
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
        !project.member.some((memberId) => memberId.toString() === user._id.toString()) &&
        user.role !== 'super_admin'
      ) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限修改此项目');
        return;
      }

      // 检查环境名称是否已存在
      if (project.env.some((env) => env.name === name)) {
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

      logger.info({ userId: user._id, projectId: project._id, envName: name }, 'Environment added');
      await createActivity(project._id, user._id, 'environment.added', 'environment', null, `添加了环境 ${name}`, { envName: name });

      // 记录操作日志
      await logOperation({
        type: 'project',
        action: 'add_environment',
        targetId: project._id,
        targetName: `${project.project_name} - ${name}`,
        userId: user._id,
        username: user.username,
        projectId: project._id,
        details: { environmentName: name, host },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(project, '环境添加成功');
    } catch (error) {
      logger.error({ error }, 'Environment add error');
      ctx.status = 500;
      ctx.body = ProjectController.error(
        process.env.NODE_ENV === 'production' ? '添加失败' : error.message || '添加失败'
      );
    }
  }

  static async updateEnvironment(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id, env_name, name, host, variables } = ctx.request.body;

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('无效的项目ID');
        return;
      }

      if (!env_name) {
        ctx.status = 400;
        ctx.body = ProjectController.error('环境名称不能为空');
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
        !project.member.some((memberId) => memberId.toString() === user._id.toString()) &&
        user.role !== 'super_admin'
      ) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限修改此项目');
        return;
      }

      const envIndex = project.env.findIndex((env) => env.name === env_name);
      if (envIndex === -1) {
        ctx.status = 404;
        ctx.body = ProjectController.error('环境不存在');
        return;
      }

      // 如果修改了名称，检查新名称是否已存在
      if (name && name !== env_name && project.env.some((env) => env.name === name)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('环境名称已存在');
        return;
      }

      if (name) {
        project.env[envIndex].name = sanitizeInput(name);
      }
      if (host) {
        project.env[envIndex].host = sanitizeInput(host);
      }
      if (variables !== undefined) {
        project.env[envIndex].variables = variables;
      }

      await project.save();

      logger.info({ userId: user._id, projectId: project._id, envName: env_name }, 'Environment updated');
      
      // 记录操作日志
      await logOperation({
        type: 'project',
        action: 'update_environment',
        targetId: project._id,
        targetName: `${project.project_name} - ${name || env_name}`,
        userId: user._id,
        username: user.username,
        projectId: project._id,
        details: { oldName: env_name, newName: name, host, variables },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(project, '环境更新成功');
    } catch (error) {
      logger.error({ error }, 'Environment update error');
      ctx.status = 500;
      ctx.body = ProjectController.error(
        process.env.NODE_ENV === 'production' ? '更新失败' : error.message || '更新失败'
      );
    }
  }

  static async deleteEnvironment(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id, env_name } = ctx.query;

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('无效的项目ID');
        return;
      }

      if (!env_name) {
        ctx.status = 400;
        ctx.body = ProjectController.error('环境名称不能为空');
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
        !project.member.some((memberId) => memberId.toString() === user._id.toString()) &&
        user.role !== 'super_admin'
      ) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限修改此项目');
        return;
      }

      const envIndex = project.env.findIndex((env) => env.name === env_name);
      if (envIndex === -1) {
        ctx.status = 404;
        ctx.body = ProjectController.error('环境不存在');
        return;
      }

      project.env.splice(envIndex, 1);
      await project.save();

      logger.info({ userId: user._id, projectId: project._id, envName: env_name }, 'Environment deleted');
      await createActivity(project._id, user._id, 'environment.deleted', 'environment', null, `删除了环境 ${env_name}`, { envName: env_name });
      
      // 记录操作日志
      await logOperation({
        type: 'project',
        action: 'delete_environment',
        targetId: project._id,
        targetName: `${project.project_name} - ${env_name}`,
        userId: user._id,
        username: user.username,
        projectId: project._id,
        details: { environmentName: env_name },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(project, '环境删除成功');
    } catch (error) {
      logger.error({ error }, 'Environment delete error');
      ctx.status = 500;
      ctx.body = ProjectController.error(
        process.env.NODE_ENV === 'production' ? '删除失败' : error.message || '删除失败'
      );
    }
  }

  static async addMember(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id, member_email } = ctx.request.body;

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('无效的项目ID');
        return;
      }

      if (!member_email) {
        ctx.status = 400;
        ctx.body = ProjectController.error('成员邮箱不能为空');
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
        user.role !== 'super_admin'
      ) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限管理项目成员');
        return;
      }

      const User = (await import('../Models/User.js')).default;
      const member = await User.findOne({ email: member_email });
      if (!member) {
        ctx.status = 404;
        ctx.body = ProjectController.error('用户不存在');
        return;
      }

      if (project.member.some((memberId) => memberId.toString() === member._id.toString())) {
        ctx.status = 400;
        ctx.body = ProjectController.error('成员已在项目中');
        return;
      }

      project.member.push(member._id);
      await project.save();

      logger.info({ userId: user._id, projectId: project._id, memberId: member._id }, 'Project member added');
      await createActivity(project._id, user._id, 'member.added', 'member', member._id, `添加了成员 ${member.username || member.email}`, { memberName: member.username || member.email });
      
      // 记录操作日志
      await logOperation({
        type: 'project',
        action: 'add_member',
        targetId: project._id,
        targetName: project.project_name,
        userId: user._id,
        username: user.username,
        projectId: project._id,
        details: { memberId: member._id, memberName: member.username || member.email, memberEmail: member.email },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(project, '成员添加成功');
    } catch (error) {
      logger.error({ error }, 'Project add member error');
      ctx.status = 500;
      ctx.body = ProjectController.error(
        process.env.NODE_ENV === 'production' ? '添加失败' : error.message || '添加失败'
      );
    }
  }

  static async removeMember(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id, member_id } = ctx.query;

      if (!validateObjectId(project_id) || !validateObjectId(member_id)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('无效的项目ID或成员ID');
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
        user.role !== 'super_admin'
      ) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限管理项目成员');
        return;
      }

      const memberIndex = project.member.findIndex(
        (memberId) => memberId.toString() === member_id
      );
      if (memberIndex === -1) {
        ctx.status = 404;
        ctx.body = ProjectController.error('成员不在项目中');
        return;
      }

      project.member.splice(memberIndex, 1);
      await project.save();

      logger.info({ userId: user._id, projectId: project._id, memberId: member_id }, 'Project member removed');
      
      // 记录操作日志
      await logOperation({
        type: 'project',
        action: 'remove_member',
        targetId: project._id,
        targetName: project.project_name,
        userId: user._id,
        username: user.username,
        projectId: project._id,
        details: { memberId: member_id },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(project, '成员移除成功');
    } catch (error) {
      logger.error({ error }, 'Project remove member error');
      ctx.status = 500;
      ctx.body = ProjectController.error(
        process.env.NODE_ENV === 'production' ? '移除失败' : error.message || '移除失败'
      );
    }
  }

  static async migrate(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id, target_group_id } = ctx.request.body;

      if (!validateObjectId(project_id) || !validateObjectId(target_group_id)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('无效的项目ID或目标分组ID');
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
        user.role !== 'super_admin'
      ) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限迁移此项目');
        return;
      }

      const Group = (await import('../Models/Group.js')).default;
      const targetGroup = await Group.findById(target_group_id);
      if (!targetGroup) {
        ctx.status = 404;
        ctx.body = ProjectController.error('目标分组不存在');
        return;
      }

      project.group_id = target_group_id;
      await project.save();

      logger.info({ userId: user._id, projectId: project._id, targetGroupId: target_group_id }, 'Project migrated');
      
      // 记录操作日志
      await logOperation({
        type: 'project',
        action: 'migrate',
        targetId: project._id,
        targetName: project.project_name,
        userId: user._id,
        username: user.username,
        projectId: project._id,
        details: { targetGroupId: target_group_id, targetGroupName: targetGroup.group_name },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(project, '项目迁移成功');
    } catch (error) {
      logger.error({ error }, 'Project migrate error');
      ctx.status = 500;
      ctx.body = ProjectController.error(
        process.env.NODE_ENV === 'production' ? '迁移失败' : error.message || '迁移失败'
      );
    }
  }

  static async copy(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id, new_project_name, target_group_id } = ctx.request.body;

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('无效的项目ID');
        return;
      }

      if (!new_project_name) {
        ctx.status = 400;
        ctx.body = ProjectController.error('新项目名称不能为空');
        return;
      }

      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = ProjectController.error('项目不存在');
        return;
      }

      const targetGroupId = target_group_id || project.group_id;
      const Group = (await import('../Models/Group.js')).default;
      const targetGroup = await Group.findById(targetGroupId);
      if (!targetGroup) {
        ctx.status = 404;
        ctx.body = ProjectController.error('目标分组不存在');
        return;
      }

      const isMember = targetGroup.member.some(
        (memberId) => memberId.toString() === user._id.toString()
      );
      const isOwner = targetGroup.uid.toString() === user._id.toString();
      const isSuperAdmin = user.role === 'super_admin';

      if (!isMember && !isOwner && !isSuperAdmin) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限在目标分组中创建项目');
        return;
      }

      // 创建新项目
      const newProject = new Project({
        project_name: sanitizeInput(new_project_name),
        project_desc: project.project_desc,
        group_id: targetGroupId,
        uid: user._id,
        basepath: project.basepath,
        icon: project.icon,
        color: project.color,
        member: [user._id],
        env: JSON.parse(JSON.stringify(project.env || [])),
        tag: JSON.parse(JSON.stringify(project.tag || [])),
        mock_strict: project.mock_strict,
        enable_json5: project.enable_json5,
        mock_script: project.mock_script,
      });
      await newProject.save();

      // 复制接口分类
      const InterfaceCat = (await import('../Models/InterfaceCat.js')).default;
      const Interface = (await import('../Models/Interface.js')).default;
      const cats = await InterfaceCat.find({ project_id: project._id });
      const catMap = new Map();

      for (const cat of cats) {
        const newCat = new InterfaceCat({
          name: cat.name,
          desc: cat.desc,
          project_id: newProject._id,
          uid: user._id,
        });
        await newCat.save();
        catMap.set(cat._id.toString(), newCat._id);
      }

      // 复制接口
      const interfaces = await Interface.find({ project_id: project._id });
      for (const inter of interfaces) {
        const newInterface = new Interface({
          ...inter.toObject(),
          _id: undefined,
          project_id: newProject._id,
          catid: inter.catid ? catMap.get(inter.catid.toString()) : null,
          uid: user._id,
        });
        await newInterface.save();
      }

      logger.info({ userId: user._id, projectId: project._id, newProjectId: newProject._id }, 'Project copied');
      
      // 记录操作日志
      await logOperation({
        type: 'project',
        action: 'copy',
        targetId: newProject._id,
        targetName: newProject.project_name,
        userId: user._id,
        username: user.username,
        projectId: newProject._id,
        details: { sourceProjectId: project._id, sourceProjectName: project.project_name, targetGroupId: targetGroupId },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(newProject, '项目拷贝成功');
    } catch (error) {
      logger.error({ error }, 'Project copy error');
      ctx.status = 500;
      ctx.body = ProjectController.error(
        process.env.NODE_ENV === 'production' ? '拷贝失败' : error.message || '拷贝失败'
      );
    }
  }

  static async getActivities(ctx) {
    try {
      const { project_id } = ctx.query;

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('无效的项目ID');
        return;
      }

      const Activity = (await import('../Models/Activity.js')).default;
      const activities = await Activity.find({ project_id })
        .populate('user_id', 'username email avatar')
        .sort({ created_at: -1 })
        .limit(100);

      ctx.body = ProjectController.success(activities);
    } catch (error) {
      logger.error({ error }, 'Get activities error');
      ctx.status = 500;
      ctx.body = ProjectController.error(
        process.env.NODE_ENV === 'production' ? '获取失败' : error.message || '获取失败'
      );
    }
  }

  static async addTag(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id, name, desc } = ctx.request.body;

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('无效的项目ID');
        return;
      }

      if (!name || !name.trim()) {
        ctx.status = 400;
        ctx.body = ProjectController.error('Tag 名称不能为空');
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
        !project.member.some((memberId) => memberId.toString() === user._id.toString()) &&
        user.role !== 'super_admin'
      ) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限修改此项目');
        return;
      }

      // 检查 Tag 名称是否已存在
      if (project.tag.some((tag) => tag.name === name.trim())) {
        ctx.status = 400;
        ctx.body = ProjectController.error('Tag 名称已存在');
        return;
      }

      project.tag.push({
        name: sanitizeInput(name.trim()),
        desc: desc ? sanitizeInput(desc) : '',
      });

      await project.save();

      logger.info({ userId: user._id, projectId: project._id, tagName: name }, 'Tag added');
      await createActivity(project._id, user._id, 'tag.added', 'tag', null, `添加了 Tag ${name}`, { tagName: name });

      // 记录操作日志
      await logOperation({
        type: 'project',
        action: 'add_tag',
        targetId: project._id,
        targetName: `${project.project_name} - ${name}`,
        userId: user._id,
        username: user.username,
        projectId: project._id,
        details: { tagName: name, tagDesc: desc },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(project, 'Tag 添加成功');
    } catch (error) {
      logger.error({ error }, 'Tag add error');
      ctx.status = 500;
      ctx.body = ProjectController.error(
        process.env.NODE_ENV === 'production' ? '添加失败' : error.message || '添加失败'
      );
    }
  }

  static async updateTag(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id, tag_name, name, desc } = ctx.request.body;

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('无效的项目ID');
        return;
      }

      if (!tag_name) {
        ctx.status = 400;
        ctx.body = ProjectController.error('Tag 名称不能为空');
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
        !project.member.some((memberId) => memberId.toString() === user._id.toString()) &&
        user.role !== 'super_admin'
      ) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限修改此项目');
        return;
      }

      const tagIndex = project.tag.findIndex((tag) => tag.name === tag_name);
      if (tagIndex === -1) {
        ctx.status = 404;
        ctx.body = ProjectController.error('Tag 不存在');
        return;
      }

      // 如果修改名称，检查新名称是否已存在
      if (name && name.trim() !== tag_name) {
        if (project.tag.some((tag, index) => index !== tagIndex && tag.name === name.trim())) {
          ctx.status = 400;
          ctx.body = ProjectController.error('Tag 名称已存在');
          return;
        }
      }

      if (name) {
        project.tag[tagIndex].name = sanitizeInput(name.trim());
      }
      if (desc !== undefined) {
        project.tag[tagIndex].desc = sanitizeInput(desc);
      }

      await project.save();

      logger.info({ userId: user._id, projectId: project._id, tagName: name || tag_name }, 'Tag updated');
      await createActivity(project._id, user._id, 'tag.updated', 'tag', null, `更新了 Tag ${name || tag_name}`, { tagName: name || tag_name });

      // 记录操作日志
      await logOperation({
        type: 'project',
        action: 'update_tag',
        targetId: project._id,
        targetName: `${project.project_name} - ${name || tag_name}`,
        userId: user._id,
        username: user.username,
        projectId: project._id,
        details: { oldName: tag_name, newName: name, desc },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(project, 'Tag 更新成功');
    } catch (error) {
      logger.error({ error }, 'Tag update error');
      ctx.status = 500;
      ctx.body = ProjectController.error(
        process.env.NODE_ENV === 'production' ? '更新失败' : error.message || '更新失败'
      );
    }
  }

  static async deleteTag(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id, tag_name } = ctx.query;

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = ProjectController.error('无效的项目ID');
        return;
      }

      if (!tag_name) {
        ctx.status = 400;
        ctx.body = ProjectController.error('Tag 名称不能为空');
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
        !project.member.some((memberId) => memberId.toString() === user._id.toString()) &&
        user.role !== 'super_admin'
      ) {
        ctx.status = 403;
        ctx.body = ProjectController.error('无权限修改此项目');
        return;
      }

      const tagIndex = project.tag.findIndex((tag) => tag.name === tag_name);
      if (tagIndex === -1) {
        ctx.status = 404;
        ctx.body = ProjectController.error('Tag 不存在');
        return;
      }

      project.tag.splice(tagIndex, 1);
      await project.save();

      logger.info({ userId: user._id, projectId: project._id, tagName: tag_name }, 'Tag deleted');
      await createActivity(project._id, user._id, 'tag.deleted', 'tag', null, `删除了 Tag ${tag_name}`, { tagName: tag_name });

      // 记录操作日志
      await logOperation({
        type: 'project',
        action: 'delete_tag',
        targetId: project._id,
        targetName: `${project.project_name} - ${tag_name}`,
        userId: user._id,
        username: user.username,
        projectId: project._id,
        details: { tagName: tag_name },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ProjectController.success(project, 'Tag 删除成功');
    } catch (error) {
      logger.error({ error }, 'Tag delete error');
      ctx.status = 500;
      ctx.body = ProjectController.error(
        process.env.NODE_ENV === 'production' ? '删除失败' : error.message || '删除失败'
      );
    }
  }

  // Admin APIs - only for super_admin
  static async listAllProjects(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = ProjectController.error('只有超级管理员可以查看所有项目');
        return;
      }

      let projects = [];
      try {
        projects = await Project.find({})
          .populate('group_id', 'group_name')
          .populate('uid', 'username email avatar')
          .sort({ created_at: -1 })
          .lean();
      } catch (populateError) {
        logger.warn({ error: populateError.message }, 'Populate failed, trying without populate');
        try {
          projects = await Project.find({})
            .sort({ created_at: -1 })
            .lean();
        } catch (queryError) {
          logger.error({ error: queryError.message, stack: queryError.stack }, 'Project query failed');
          throw queryError;
        }
      }
      
      // 确保每个项目都有 env 字段（即使为空数组）
      projects = projects.map((project) => ({
        ...project,
        env: project.env || [],
      }));

      ctx.body = ProjectController.success(Array.isArray(projects) ? projects : []);
    } catch (error) {
      logger.error({ error }, 'List all projects error');
      ctx.status = 500;
      ctx.body = ProjectController.error(error.message || '获取项目列表失败');
    }
  }
}

export default ProjectController;

