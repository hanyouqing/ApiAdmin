import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import ProjectMember from '../Models/ProjectMember.js';
import GroupMember from '../Models/GroupMember.js';
import RolePermission from '../Models/RolePermission.js';
import Project from '../Models/Project.js';
import Group from '../Models/Group.js';
import User from '../Models/User.js';

class PermissionController extends BaseController {
  static get ControllerName() { return 'PermissionController'; }

  // ========== 项目成员权限管理 ==========

  // 添加项目成员
  static async addProjectMember(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id, user_id, role, permissions } = ctx.request.body;

      if (!validateObjectId(project_id) || !validateObjectId(user_id)) {
        ctx.status = 400;
        ctx.body = PermissionController.error('项目ID和用户ID不能为空');
        return;
      }

      // 检查项目是否存在
      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = PermissionController.error('项目不存在');
        return;
      }

      // 检查用户是否存在
      const targetUser = await User.findById(user_id);
      if (!targetUser) {
        ctx.status = 404;
        ctx.body = PermissionController.error('用户不存在');
        return;
      }

      // 检查当前用户权限（必须是项目负责人或超级管理员）
      const hasPermission = await this.checkProjectPermission(user._id, project_id, 'manage_members');
      if (!hasPermission) {
        ctx.status = 403;
        ctx.body = PermissionController.error('无权限管理项目成员');
        return;
      }

      // 检查是否已经是成员
      const existing = await ProjectMember.findOne({ project_id, user_id });
      if (existing) {
        ctx.status = 400;
        ctx.body = PermissionController.error('用户已经是项目成员');
        return;
      }

      // 创建成员记录
      const member = new ProjectMember({
        project_id,
        user_id,
        role: role || 'viewer',
        permissions: permissions || {},
        invited_by: user._id,
      });

      await member.save();

      // 更新项目的成员列表（向后兼容）
      if (!project.member.includes(user_id)) {
        project.member.push(user_id);
        await project.save();
      }

      logger.info({ userId: user._id, projectId: project_id, memberId: user_id }, 'Project member added');

      ctx.body = PermissionController.success(member, '项目成员添加成功');
    } catch (error) {
      if (error.code === 11000) {
        ctx.status = 400;
        ctx.body = PermissionController.error('用户已经是项目成员');
        return;
      }
      logger.error({ error }, 'Add project member error');
      ctx.status = 500;
      ctx.body = PermissionController.error(
        process.env.NODE_ENV === 'production'
          ? '添加项目成员失败'
          : error.message || '添加项目成员失败'
      );
    }
  }

  // 更新项目成员权限
  static async updateProjectMember(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id, user_id } = ctx.params;
      const { role, permissions } = ctx.request.body;

      if (!validateObjectId(project_id) || !validateObjectId(user_id)) {
        ctx.status = 400;
        ctx.body = PermissionController.error('项目ID和用户ID不能为空');
        return;
      }

      // 检查权限
      const hasPermission = await this.checkProjectPermission(user._id, project_id, 'manage_members');
      if (!hasPermission) {
        ctx.status = 403;
        ctx.body = PermissionController.error('无权限修改项目成员');
        return;
      }

      const member = await ProjectMember.findOne({ project_id, user_id });
      if (!member) {
        ctx.status = 404;
        ctx.body = PermissionController.error('项目成员不存在');
        return;
      }

      // 不能修改项目所有者的角色
      if (member.role === 'owner' && role && role !== 'owner') {
        ctx.status = 400;
        ctx.body = PermissionController.error('不能修改项目所有者的角色');
        return;
      }

      if (role !== undefined) {
        member.role = role;
      }
      if (permissions !== undefined) {
        Object.assign(member.permissions, permissions);
      }

      await member.save();

      logger.info({ userId: user._id, projectId: project_id, memberId: user_id }, 'Project member updated');

      ctx.body = PermissionController.success(member, '项目成员权限更新成功');
    } catch (error) {
      logger.error({ error }, 'Update project member error');
      ctx.status = 500;
      ctx.body = PermissionController.error(
        process.env.NODE_ENV === 'production'
          ? '更新项目成员权限失败'
          : error.message || '更新项目成员权限失败'
      );
    }
  }

  // 移除项目成员
  static async removeProjectMember(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id, user_id } = ctx.params;

      if (!validateObjectId(project_id) || !validateObjectId(user_id)) {
        ctx.status = 400;
        ctx.body = PermissionController.error('项目ID和用户ID不能为空');
        return;
      }

      // 检查权限
      const hasPermission = await this.checkProjectPermission(user._id, project_id, 'manage_members');
      if (!hasPermission) {
        ctx.status = 403;
        ctx.body = PermissionController.error('无权限移除项目成员');
        return;
      }

      const member = await ProjectMember.findOne({ project_id, user_id });
      if (!member) {
        ctx.status = 404;
        ctx.body = PermissionController.error('项目成员不存在');
        return;
      }

      // 不能移除项目所有者
      if (member.role === 'owner') {
        ctx.status = 400;
        ctx.body = PermissionController.error('不能移除项目所有者');
        return;
      }

      await member.deleteOne();

      // 更新项目的成员列表（向后兼容）
      const project = await Project.findById(project_id);
      if (project) {
        project.member = project.member.filter(
          (id) => id.toString() !== user_id.toString()
        );
        await project.save();
      }

      logger.info({ userId: user._id, projectId: project_id, memberId: user_id }, 'Project member removed');

      ctx.body = PermissionController.success(null, '项目成员移除成功');
    } catch (error) {
      logger.error({ error }, 'Remove project member error');
      ctx.status = 500;
      ctx.body = PermissionController.error(
        process.env.NODE_ENV === 'production'
          ? '移除项目成员失败'
          : error.message || '移除项目成员失败'
      );
    }
  }

  // 获取项目成员列表
  static async listProjectMembers(ctx) {
    try {
      const { project_id } = ctx.params;

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = PermissionController.error('项目ID不能为空');
        return;
      }

      const members = await ProjectMember.find({ project_id })
        .populate('user_id', 'username email avatar')
        .populate('invited_by', 'username')
        .sort({ role: 1, joined_at: -1 });

      ctx.body = PermissionController.success(members);
    } catch (error) {
      logger.error({ error }, 'List project members error');
      ctx.status = 500;
      ctx.body = PermissionController.error(
        process.env.NODE_ENV === 'production'
          ? '获取项目成员列表失败'
          : error.message || '获取项目成员列表失败'
      );
    }
  }

  // 批量添加项目成员
  static async batchAddProjectMembers(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id, members } = ctx.request.body;

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = PermissionController.error('项目ID不能为空');
        return;
      }

      if (!Array.isArray(members) || members.length === 0) {
        ctx.status = 400;
        ctx.body = PermissionController.error('成员列表不能为空');
        return;
      }

      // 检查权限
      const hasPermission = await this.checkProjectPermission(user._id, project_id, 'manage_members');
      if (!hasPermission) {
        ctx.status = 403;
        ctx.body = PermissionController.error('无权限管理项目成员');
        return;
      }

      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = PermissionController.error('项目不存在');
        return;
      }

      let successCount = 0;
      let failedCount = 0;
      const failedMembers = [];

      for (const memberData of members) {
        try {
          const { user_id, role, permissions } = memberData;

          if (!validateObjectId(user_id)) {
            failedCount++;
            failedMembers.push({ user_id, reason: '无效的用户ID' });
            continue;
          }

          // 检查是否已经是成员
          const existing = await ProjectMember.findOne({ project_id, user_id });
          if (existing) {
            failedCount++;
            failedMembers.push({ user_id, reason: '用户已经是项目成员' });
            continue;
          }

          const member = new ProjectMember({
            project_id,
            user_id,
            role: role || 'viewer',
            permissions: permissions || {},
            invited_by: user._id,
          });

          await member.save();

          // 更新项目的成员列表
          if (!project.member.includes(user_id)) {
            project.member.push(user_id);
          }

          successCount++;
        } catch (error) {
          failedCount++;
          failedMembers.push({
            user_id: memberData.user_id,
            reason: error.message || '未知错误',
          });
        }
      }

      await project.save();

      logger.info({ userId: user._id, projectId: project_id, successCount, failedCount }, 'Batch add project members');

      ctx.body = PermissionController.success({
        successCount,
        failedCount,
        failedMembers,
      }, '批量添加完成');
    } catch (error) {
      logger.error({ error }, 'Batch add project members error');
      ctx.status = 500;
      ctx.body = PermissionController.error(
        process.env.NODE_ENV === 'production'
          ? '批量添加项目成员失败'
          : error.message || '批量添加项目成员失败'
      );
    }
  }

  // ========== 分组成员权限管理 ==========

  // 添加分组成员
  static async addGroupMember(ctx) {
    try {
      const user = ctx.state.user;
      const { group_id, user_id, role, permissions } = ctx.request.body;

      if (!validateObjectId(group_id) || !validateObjectId(user_id)) {
        ctx.status = 400;
        ctx.body = PermissionController.error('分组ID和用户ID不能为空');
        return;
      }

      const group = await Group.findById(group_id);
      if (!group) {
        ctx.status = 404;
        ctx.body = PermissionController.error('分组不存在');
        return;
      }

      const hasPermission = await this.checkGroupPermission(user._id, group_id, 'manage_members');
      if (!hasPermission) {
        ctx.status = 403;
        ctx.body = PermissionController.error('无权限管理分组成员');
        return;
      }

      const existing = await GroupMember.findOne({ group_id, user_id });
      if (existing) {
        ctx.status = 400;
        ctx.body = PermissionController.error('用户已经是分组成员');
        return;
      }

      const member = new GroupMember({
        group_id,
        user_id,
        role: role || 'member',
        permissions: permissions || {},
        invited_by: user._id,
      });

      await member.save();

      // 更新分组的成员列表（向后兼容）
      if (!group.member.includes(user_id)) {
        group.member.push(user_id);
        await group.save();
      }

      logger.info({ userId: user._id, groupId: group_id, memberId: user_id }, 'Group member added');

      ctx.body = PermissionController.success(member, '分组成员添加成功');
    } catch (error) {
      if (error.code === 11000) {
        ctx.status = 400;
        ctx.body = PermissionController.error('用户已经是分组成员');
        return;
      }
      logger.error({ error }, 'Add group member error');
      ctx.status = 500;
      ctx.body = PermissionController.error(
        process.env.NODE_ENV === 'production'
          ? '添加分组成员失败'
          : error.message || '添加分组成员失败'
      );
    }
  }

  // 更新分组成员权限
  static async updateGroupMember(ctx) {
    try {
      const user = ctx.state.user;
      const { group_id, user_id } = ctx.params;
      const { role, permissions } = ctx.request.body;

      if (!validateObjectId(group_id) || !validateObjectId(user_id)) {
        ctx.status = 400;
        ctx.body = PermissionController.error('分组ID和用户ID不能为空');
        return;
      }

      const hasPermission = await this.checkGroupPermission(user._id, group_id, 'manage_members');
      if (!hasPermission) {
        ctx.status = 403;
        ctx.body = PermissionController.error('无权限修改分组成员');
        return;
      }

      const member = await GroupMember.findOne({ group_id, user_id });
      if (!member) {
        ctx.status = 404;
        ctx.body = PermissionController.error('分组成员不存在');
        return;
      }

      if (member.role === 'owner' && role && role !== 'owner') {
        ctx.status = 400;
        ctx.body = PermissionController.error('不能修改分组所有者的角色');
        return;
      }

      if (role !== undefined) {
        member.role = role;
      }
      if (permissions !== undefined) {
        Object.assign(member.permissions, permissions);
      }

      await member.save();

      logger.info({ userId: user._id, groupId: group_id, memberId: user_id }, 'Group member updated');

      ctx.body = PermissionController.success(member, '分组成员权限更新成功');
    } catch (error) {
      logger.error({ error }, 'Update group member error');
      ctx.status = 500;
      ctx.body = PermissionController.error(
        process.env.NODE_ENV === 'production'
          ? '更新分组成员权限失败'
          : error.message || '更新分组成员权限失败'
      );
    }
  }

  // 移除分组成员
  static async removeGroupMember(ctx) {
    try {
      const user = ctx.state.user;
      const { group_id, user_id } = ctx.params;

      if (!validateObjectId(group_id) || !validateObjectId(user_id)) {
        ctx.status = 400;
        ctx.body = PermissionController.error('分组ID和用户ID不能为空');
        return;
      }

      const hasPermission = await this.checkGroupPermission(user._id, group_id, 'manage_members');
      if (!hasPermission) {
        ctx.status = 403;
        ctx.body = PermissionController.error('无权限移除分组成员');
        return;
      }

      const member = await GroupMember.findOne({ group_id, user_id });
      if (!member) {
        ctx.status = 404;
        ctx.body = PermissionController.error('分组成员不存在');
        return;
      }

      if (member.role === 'owner') {
        ctx.status = 400;
        ctx.body = PermissionController.error('不能移除分组所有者');
        return;
      }

      await member.deleteOne();

      const group = await Group.findById(group_id);
      if (group) {
        group.member = group.member.filter(
          (id) => id.toString() !== user_id.toString()
        );
        await group.save();
      }

      logger.info({ userId: user._id, groupId: group_id, memberId: user_id }, 'Group member removed');

      ctx.body = PermissionController.success(null, '分组成员移除成功');
    } catch (error) {
      logger.error({ error }, 'Remove group member error');
      ctx.status = 500;
      ctx.body = PermissionController.error(
        process.env.NODE_ENV === 'production'
          ? '移除分组成员失败'
          : error.message || '移除分组成员失败'
      );
    }
  }

  // 获取分组成员列表
  static async listGroupMembers(ctx) {
    try {
      const { group_id } = ctx.params;

      if (!validateObjectId(group_id)) {
        ctx.status = 400;
        ctx.body = PermissionController.error('分组ID不能为空');
        return;
      }

      const members = await GroupMember.find({ group_id })
        .populate('user_id', 'username email avatar')
        .populate('invited_by', 'username')
        .sort({ role: 1, joined_at: -1 });

      ctx.body = PermissionController.success(members);
    } catch (error) {
      logger.error({ error }, 'List group members error');
      ctx.status = 500;
      ctx.body = PermissionController.error(
        process.env.NODE_ENV === 'production'
          ? '获取分组成员列表失败'
          : error.message || '获取分组成员列表失败'
      );
    }
  }

  // ========== 角色权限管理 ==========

  // 获取角色权限列表
  static async listRolePermissions(ctx) {
    try {
      const permissions = await RolePermission.find({}).sort({ role: 1 });

      ctx.body = PermissionController.success(permissions);
    } catch (error) {
      logger.error({ error }, 'List role permissions error');
      ctx.status = 500;
      ctx.body = PermissionController.error(
        process.env.NODE_ENV === 'production'
          ? '获取角色权限列表失败'
          : error.message || '获取角色权限列表失败'
      );
    }
  }

  // 获取特定角色的权限
  static async getRolePermission(ctx) {
    try {
      const { role } = ctx.params;

      if (!['super_admin', 'group_leader', 'project_leader', 'developer', 'guest'].includes(role)) {
        ctx.status = 400;
        ctx.body = PermissionController.error('无效的角色');
        return;
      }

      let permission = await RolePermission.findOne({ role });
      if (!permission) {
        // 如果不存在，初始化默认权限
        await RolePermission.initDefaultPermissions();
        permission = await RolePermission.findOne({ role });
      }

      ctx.body = PermissionController.success(permission);
    } catch (error) {
      logger.error({ error }, 'Get role permission error');
      ctx.status = 500;
      ctx.body = PermissionController.error(
        process.env.NODE_ENV === 'production'
          ? '获取角色权限失败'
          : error.message || '获取角色权限失败'
      );
    }
  }

  // 更新角色权限（仅超级管理员）
  static async updateRolePermission(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = PermissionController.error('无权限修改角色权限');
        return;
      }

      const { role } = ctx.params;
      const { permissions, description } = ctx.request.body;

      if (!['super_admin', 'group_leader', 'project_leader', 'developer', 'guest'].includes(role)) {
        ctx.status = 400;
        ctx.body = PermissionController.error('无效的角色');
        return;
      }

      const permission = await RolePermission.findOneAndUpdate(
        { role },
        {
          $set: {
            ...(permissions && { permissions }),
            ...(description !== undefined && { description }),
          },
        },
        { upsert: true, new: true }
      );

      logger.info({ userId: user._id, role }, 'Role permission updated');

      ctx.body = PermissionController.success(permission, '角色权限更新成功');
    } catch (error) {
      logger.error({ error }, 'Update role permission error');
      ctx.status = 500;
      ctx.body = PermissionController.error(
        process.env.NODE_ENV === 'production'
          ? '更新角色权限失败'
          : error.message || '更新角色权限失败'
      );
    }
  }

  // 初始化默认角色权限
  static async initRolePermissions(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = PermissionController.error('无权限初始化角色权限');
        return;
      }

      await RolePermission.initDefaultPermissions();

      logger.info({ userId: user._id }, 'Role permissions initialized');

      ctx.body = PermissionController.success(null, '角色权限初始化成功');
    } catch (error) {
      logger.error({ error }, 'Init role permissions error');
      ctx.status = 500;
      ctx.body = PermissionController.error(
        process.env.NODE_ENV === 'production'
          ? '初始化角色权限失败'
          : error.message || '初始化角色权限失败'
      );
    }
  }

  // ========== 权限检查辅助方法 ==========

  // 检查项目权限
  static async checkProjectPermission(userId, projectId, permission) {
    // 超级管理员拥有所有权限
    const user = await User.findById(userId);
    if (user && user.role === 'super_admin') {
      return true;
    }

    // 检查项目成员权限
    const member = await ProjectMember.findOne({ project_id: projectId, user_id: userId });
    if (member && member.permissions[permission]) {
      return true;
    }

    // 检查是否是项目所有者
    const project = await Project.findById(projectId);
    if (project && project.uid.toString() === userId.toString()) {
      return true;
    }

    return false;
  }

  // 检查分组权限
  static async checkGroupPermission(userId, groupId, permission) {
    const user = await User.findById(userId);
    if (user && user.role === 'super_admin') {
      return true;
    }

    const member = await GroupMember.findOne({ group_id: groupId, user_id: userId });
    if (member && member.permissions[permission]) {
      return true;
    }

    const group = await Group.findById(groupId);
    if (group && group.uid.toString() === userId.toString()) {
      return true;
    }

    return false;
  }

  // 获取用户的项目权限
  static async getUserProjectPermission(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id } = ctx.params;

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = PermissionController.error('项目ID不能为空');
        return;
      }

      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = PermissionController.error('项目不存在');
        return;
      }

      // 检查是否是项目所有者
      const isOwner = project.uid.toString() === user._id.toString();

      // 检查项目成员权限
      const member = await ProjectMember.findOne({
        project_id,
        user_id: user._id,
      });

      // 超级管理员拥有所有权限
      const isSuperAdmin = user.role === 'super_admin';

      const permissions = {
        isOwner,
        isSuperAdmin,
        role: member?.role || null,
        permissions: member?.permissions || {},
        hasFullAccess: isSuperAdmin || isOwner || member?.role === 'owner',
      };

      ctx.body = PermissionController.success(permissions);
    } catch (error) {
      logger.error({ error }, 'Get user project permission error');
      ctx.status = 500;
      ctx.body = PermissionController.error(
        process.env.NODE_ENV === 'production'
          ? '获取用户项目权限失败'
          : error.message || '获取用户项目权限失败'
      );
    }
  }
}

export default PermissionController;


