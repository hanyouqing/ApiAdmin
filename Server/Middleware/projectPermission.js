import ProjectMember from '../Models/ProjectMember.js';
import Project from '../Models/Project.js';
import User from '../Models/User.js';

/**
 * 检查项目权限的中间件
 * @param {string} requiredPermission - 需要的权限名称，如 'edit_interface', 'manage_members'
 */
export const checkProjectPermission = (requiredPermission = null) => {
  return async (ctx, next) => {
    const user = ctx.state.user;
    const projectId = ctx.params.project_id || ctx.params.id || ctx.query.project_id || ctx.request.body.project_id;

    if (!projectId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少项目ID',
      };
      return;
    }

    if (!user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '未授权',
      };
      return;
    }

    // 获取项目
    const project = await Project.findById(projectId);
    if (!project) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '项目不存在',
      };
      return;
    }

    // 超级管理员拥有所有权限
    if (user.role === 'super_admin') {
      ctx.state.project = project;
      ctx.state.hasPermission = true;
      await next();
      return;
    }

    // 检查是否是项目所有者
    const isOwner = project.uid.toString() === user._id.toString();
    if (isOwner) {
      ctx.state.project = project;
      ctx.state.hasPermission = true;
      ctx.state.isOwner = true;
      await next();
      return;
    }

    // 检查项目成员权限
    const member = await ProjectMember.findOne({
      project_id: projectId,
      user_id: user._id,
    });

    if (member) {
      // 如果是 owner 角色，拥有所有权限
      if (member.role === 'owner') {
        ctx.state.project = project;
        ctx.state.hasPermission = true;
        ctx.state.member = member;
        await next();
        return;
      }

      // 如果指定了具体权限，检查是否有该权限
      if (requiredPermission) {
        if (member.permissions[requiredPermission]) {
          ctx.state.project = project;
          ctx.state.hasPermission = true;
          ctx.state.member = member;
          await next();
          return;
        } else {
          ctx.status = 403;
          ctx.body = {
            success: false,
            message: `无权限执行此操作，需要权限: ${requiredPermission}`,
          };
          return;
        }
      } else {
        // 没有指定具体权限，只要有成员身份就可以访问
        ctx.state.project = project;
        ctx.state.hasPermission = true;
        ctx.state.member = member;
        await next();
        return;
      }
    }

    // 检查是否是项目成员（向后兼容旧系统）
    const isMember = project.member.some(
      (memberId) => memberId.toString() === user._id.toString()
    );

    if (isMember && !requiredPermission) {
      // 旧系统的成员，如果没有指定具体权限，允许访问
      ctx.state.project = project;
      ctx.state.hasPermission = true;
      await next();
      return;
    }

    // 没有权限
    ctx.status = 403;
    ctx.body = {
      success: false,
      message: requiredPermission
        ? `无权限执行此操作，需要权限: ${requiredPermission}`
        : '无权限访问此项目',
    };
  };
};

/**
 * 检查分组权限的中间件
 * @param {string} requiredPermission - 需要的权限名称
 */
export const checkGroupPermission = (requiredPermission = null) => {
  return async (ctx, next) => {
    const user = ctx.state.user;
    const groupId = ctx.params.group_id || ctx.params.id || ctx.query.group_id || ctx.request.body.group_id;

    if (!groupId) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少分组ID',
      };
      return;
    }

    if (!user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '未授权',
      };
      return;
    }

    const Group = (await import('../Models/Group.js')).default;
    const GroupMember = (await import('../Models/GroupMember.js')).default;

    const group = await Group.findById(groupId);
    if (!group) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '分组不存在',
      };
      return;
    }

    // 超级管理员拥有所有权限
    if (user.role === 'super_admin') {
      ctx.state.group = group;
      ctx.state.hasPermission = true;
      await next();
      return;
    }

    // 检查是否是分组所有者
    const isOwner = group.uid.toString() === user._id.toString();
    if (isOwner) {
      ctx.state.group = group;
      ctx.state.hasPermission = true;
      ctx.state.isOwner = true;
      await next();
      return;
    }

    // 检查分组成员权限
    const member = await GroupMember.findOne({
      group_id: groupId,
      user_id: user._id,
    });

    if (member) {
      if (member.role === 'owner') {
        ctx.state.group = group;
        ctx.state.hasPermission = true;
        ctx.state.member = member;
        await next();
        return;
      }

      if (requiredPermission) {
        if (member.permissions[requiredPermission]) {
          ctx.state.group = group;
          ctx.state.hasPermission = true;
          ctx.state.member = member;
          await next();
          return;
        } else {
          ctx.status = 403;
          ctx.body = {
            success: false,
            message: `无权限执行此操作，需要权限: ${requiredPermission}`,
          };
          return;
        }
      } else {
        ctx.state.group = group;
        ctx.state.hasPermission = true;
        ctx.state.member = member;
        await next();
        return;
      }
    }

    // 检查是否是分组成员（向后兼容）
    const isMember = group.member.some(
      (memberId) => memberId.toString() === user._id.toString()
    );

    if (isMember && !requiredPermission) {
      ctx.state.group = group;
      ctx.state.hasPermission = true;
      await next();
      return;
    }

    ctx.status = 403;
    ctx.body = {
      success: false,
      message: requiredPermission
        ? `无权限执行此操作，需要权限: ${requiredPermission}`
        : '无权限访问此分组',
    };
  };
};

