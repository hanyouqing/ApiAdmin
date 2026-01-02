import Group from '../Models/Group.js';
import Project from '../Models/Project.js';
import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import { logOperation } from '../Utils/operationLogger.js';
import mongoose from 'mongoose';

class GroupController extends BaseController {
  static async list(ctx) {
    try {
      const user = ctx.state.user;
      if (!user || !user._id) {
        ctx.status = 401;
        ctx.body = GroupController.error('用户未认证');
        return;
      }

      // 确保 user._id 是 ObjectId 类型
      // Mongoose 通常能自动处理，但为了确保兼容性，我们显式转换
      let userId = user._id;
      if (userId && !(userId instanceof mongoose.Types.ObjectId)) {
        if (mongoose.Types.ObjectId.isValid(userId)) {
          userId = new mongoose.Types.ObjectId(userId);
        }
      }

      let groups = [];
      try {
        // 超级管理员可以查看所有分组
        const query = user.role === 'super_admin' 
          ? {} 
          : { $or: [{ uid: userId }, { member: userId }] };

        // 先尝试不使用 populate，避免 populate 失败
        groups = await Group.find(query)
          .sort({ created_at: -1 })
          .lean();
        
        // 如果查询成功，尝试 populate（可选）
        if (groups.length > 0) {
          try {
            const populatedGroups = await Group.find(query)
              .populate('uid', 'username email avatar')
              .populate('member', 'username email avatar')
              .sort({ created_at: -1 })
              .lean();
            groups = populatedGroups;
          } catch (populateError) {
            // populate 失败不影响，使用未 populate 的数据
            logger.warn({ error: populateError.message }, 'Populate failed, using unpopulated data');
          }
        }
      } catch (queryError) {
        logger.error({ 
          error: queryError.message, 
          stack: queryError.stack,
          userId: userId?.toString(),
          userIdType: typeof userId,
        }, 'Group query failed');
        throw queryError;
      }

      // 确保返回数组
      if (!Array.isArray(groups)) {
        logger.warn('Groups query did not return an array, converting');
        groups = [];
      }

      // 为每个分组添加项目数量
      if (groups.length > 0) {
        try {
          const groupIds = groups.map(g => g._id);
          // 使用聚合查询获取每个分组的项目数量
          const projectCounts = await Project.aggregate([
            { $match: { group_id: { $in: groupIds } } },
            { $group: { _id: '$group_id', count: { $sum: 1 } } }
          ]);

          // 创建项目数量映射
          const countMap = new Map();
          projectCounts.forEach(item => {
            countMap.set(item._id.toString(), item.count);
          });

          // 为每个分组添加项目数量
          groups = groups.map(group => ({
            ...group,
            project_count: countMap.get(group._id.toString()) || 0
          }));
        } catch (countError) {
          logger.warn({ error: countError.message }, 'Failed to get project counts, continuing without counts');
          // 如果获取项目数量失败，为每个分组设置默认值0
          groups = groups.map(group => ({
            ...group,
            project_count: 0
          }));
        }
      }

      ctx.body = GroupController.success(groups);
    } catch (error) {
      logger.error({ 
        error: error.message, 
        stack: error.stack, 
        userId: ctx.state.user?._id,
        userType: typeof ctx.state.user?._id,
        userIdValue: ctx.state.user?._id?.toString?.() || ctx.state.user?._id,
      }, 'Group list error');
      ctx.status = 500;
      ctx.body = GroupController.error(
        process.env.NODE_ENV === 'production' 
          ? '获取分组列表失败' 
          : error.message || '获取分组列表失败'
      );
    }
  }

  static async add(ctx) {
    try {
      const user = ctx.state.user;
      let { group_name, group_desc } = ctx.request.body;

      if (!group_name) {
        ctx.status = 400;
        ctx.body = GroupController.error('分组名称不能为空');
        return;
      }

      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = GroupController.error('只有超级管理员可以创建分组');
        return;
      }

      group_name = sanitizeInput(group_name);
      if (group_name.length > 50) {
        ctx.status = 400;
        ctx.body = GroupController.error('分组名称长度不能超过50个字符');
        return;
      }

      if (group_desc) {
        group_desc = sanitizeInput(group_desc);
        if (group_desc.length > 500) {
          ctx.status = 400;
          ctx.body = GroupController.error('分组描述长度不能超过500个字符');
          return;
        }
      }

      // 检查分组名称是否已存在（全局唯一）
      const existingGroup = await Group.findOne({ group_name });
      if (existingGroup) {
        ctx.status = 400;
        ctx.body = GroupController.error('分组名称已存在，请使用其他名称');
        return;
      }

      const group = new Group({
        group_name,
        group_desc: group_desc || '',
        uid: user._id,
        member: [user._id],
      });

      await group.save();

      // 自动创建分组成员记录（owner 角色）
      try {
        const GroupMember = (await import('../Models/GroupMember.js')).default;
        const groupMember = new GroupMember({
          group_id: group._id,
          user_id: user._id,
          role: 'owner',
          invited_by: user._id,
        });
        await groupMember.save();
        logger.info({ userId: user._id, groupId: group._id }, 'Group member (owner) created');
      } catch (memberError) {
        // 如果创建成员记录失败，记录错误但不影响分组创建
        logger.warn({ error: memberError, groupId: group._id }, 'Failed to create group member record');
      }

      logger.info({ userId: user._id, groupId: group._id }, 'Group created');
      
      // 记录操作日志
      await logOperation({
        type: 'group',
        action: 'create',
        targetId: group._id,
        targetName: group_name,
        userId: user._id,
        username: user.username,
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = GroupController.success(group, '创建成功');
    } catch (error) {
      logger.error({ error }, 'Group add error');
      ctx.status = 500;
      ctx.body = GroupController.error(
        process.env.NODE_ENV === 'production' 
          ? '创建失败' 
          : error.message || '创建失败'
      );
    }
  }

  static async update(ctx) {
    try {
      const user = ctx.state.user;
      const { _id, group_name, group_desc } = ctx.request.body;

      const group = await Group.findById(_id);

      if (!group) {
        ctx.status = 404;
        ctx.body = GroupController.error('分组不存在');
        return;
      }

      if (group.uid.toString() !== user._id.toString() && user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = GroupController.error('无权限修改此分组');
        return;
      }

      // 如果更新了分组名称，检查是否已存在同名分组
      if (group_name && group_name !== group.group_name) {
        const existingGroup = await Group.findOne({ 
          group_name,
          _id: { $ne: group._id } // 排除当前分组
        });
        if (existingGroup) {
          ctx.status = 400;
          ctx.body = GroupController.error('分组名称已存在，请使用其他名称');
          return;
        }
      }

      if (group_name) {
        group.group_name = group_name;
      }
      if (group_desc !== undefined) {
        group.group_desc = group_desc;
      }

      await group.save();
      
      // 记录操作日志
      await logOperation({
        type: 'group',
        action: 'update',
        targetId: group._id,
        targetName: group.group_name,
        userId: user._id,
        username: user.username,
        details: { group_name, group_desc },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = GroupController.success(group, '更新成功');
    } catch (error) {
      ctx.status = 500;
      ctx.body = GroupController.error(error.message || '更新失败');
    }
  }

  static async delete(ctx) {
    try {
      const user = ctx.state.user;
      const { _id } = ctx.query;

      if (!_id || !validateObjectId(_id)) {
        ctx.status = 400;
        ctx.body = GroupController.error('无效的分组ID');
        return;
      }

      const group = await Group.findById(_id);

      if (!group) {
        ctx.status = 404;
        ctx.body = GroupController.error('分组不存在');
        return;
      }

      if (group.uid.toString() !== user._id.toString() && user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = GroupController.error('无权限删除此分组');
        return;
      }

      const Project = (await import('../Models/Project.js')).default;
      const projectCount = await Project.countDocuments({ group_id: _id });
      
      if (projectCount > 0) {
        ctx.status = 400;
        ctx.body = GroupController.error(`分组下还有${projectCount}个项目，请先删除项目`);
        return;
      }

      const groupName = group.group_name;
      await Group.findByIdAndDelete(_id);

      logger.info({ userId: user._id, groupId: _id }, 'Group deleted');
      
      // 记录操作日志
      await logOperation({
        type: 'group',
        action: 'delete',
        targetId: _id,
        targetName: groupName,
        userId: user._id,
        username: user.username,
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = GroupController.success(null, '删除成功');
    } catch (error) {
      logger.error({ 
        error: error.message, 
        stack: error.stack, 
        name: error.name,
        userId: ctx.state.user?._id,
        groupId: ctx.query._id
      }, 'Group delete error');
      ctx.status = 500;
      ctx.body = GroupController.error(
        process.env.NODE_ENV === 'production' 
          ? '删除失败' 
          : error.message || '删除失败'
      );
    }
  }

  static async get(ctx) {
    try {
      const { _id } = ctx.query;

      const group = await Group.findById(_id)
        .populate('uid', 'username email avatar')
        .populate('member', 'username email avatar');

      if (!group) {
        ctx.status = 404;
        ctx.body = GroupController.error('分组不存在');
        return;
      }

      ctx.body = GroupController.success(group);
    } catch (error) {
      ctx.status = 500;
      ctx.body = GroupController.error(error.message || '获取分组详情失败');
    }
  }

  static async addMember(ctx) {
    try {
      const user = ctx.state.user;
      const { group_id, member_email } = ctx.request.body;

      if (!validateObjectId(group_id)) {
        ctx.status = 400;
        ctx.body = GroupController.error('无效的分组ID');
        return;
      }

      if (!member_email) {
        ctx.status = 400;
        ctx.body = GroupController.error('成员邮箱不能为空');
        return;
      }

      const group = await Group.findById(group_id);
      if (!group) {
        ctx.status = 404;
        ctx.body = GroupController.error('分组不存在');
        return;
      }

      if (
        group.uid.toString() !== user._id.toString() &&
        user.role !== 'super_admin'
      ) {
        ctx.status = 403;
        ctx.body = GroupController.error('无权限管理分组成员');
        return;
      }

      const User = (await import('../Models/User.js')).default;
      const member = await User.findOne({ email: member_email });
      if (!member) {
        ctx.status = 404;
        ctx.body = GroupController.error('用户不存在');
        return;
      }

      if (group.member.some((memberId) => memberId.toString() === member._id.toString())) {
        ctx.status = 400;
        ctx.body = GroupController.error('成员已在分组中');
        return;
      }

      group.member.push(member._id);
      await group.save();

      logger.info({ userId: user._id, groupId: group._id, memberId: member._id }, 'Group member added');

      // 记录操作日志
      await logOperation({
        type: 'group',
        action: 'add_member',
        targetId: group._id,
        targetName: group.group_name,
        userId: user._id,
        username: user.username,
        details: { memberId: member._id, memberName: member.username || member.email, memberEmail: member.email },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = GroupController.success(group, '成员添加成功');
    } catch (error) {
      logger.error({ error }, 'Group add member error');
      ctx.status = 500;
      ctx.body = GroupController.error(
        process.env.NODE_ENV === 'production' ? '添加失败' : error.message || '添加失败'
      );
    }
  }

  static async removeMember(ctx) {
    try {
      const user = ctx.state.user;
      const { group_id, member_id } = ctx.query;

      if (!validateObjectId(group_id) || !validateObjectId(member_id)) {
        ctx.status = 400;
        ctx.body = GroupController.error('无效的分组ID或成员ID');
        return;
      }

      const group = await Group.findById(group_id);
      if (!group) {
        ctx.status = 404;
        ctx.body = GroupController.error('分组不存在');
        return;
      }

      if (
        group.uid.toString() !== user._id.toString() &&
        user.role !== 'super_admin'
      ) {
        ctx.status = 403;
        ctx.body = GroupController.error('无权限管理分组成员');
        return;
      }

      const memberIndex = group.member.findIndex(
        (memberId) => memberId.toString() === member_id
      );
      if (memberIndex === -1) {
        ctx.status = 404;
        ctx.body = GroupController.error('成员不在分组中');
        return;
      }

      group.member.splice(memberIndex, 1);
      await group.save();

      logger.info({ userId: user._id, groupId: group._id, memberId: member_id }, 'Group member removed');
      
      // 记录操作日志
      await logOperation({
        type: 'group',
        action: 'remove_member',
        targetId: group._id,
        targetName: group.group_name,
        userId: user._id,
        username: user.username,
        details: { memberId: member_id },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = GroupController.success(group, '成员移除成功');
    } catch (error) {
      logger.error({ error }, 'Group remove member error');
      ctx.status = 500;
      ctx.body = GroupController.error(
        process.env.NODE_ENV === 'production' ? '移除失败' : error.message || '移除失败'
      );
    }
  }

  static async setLeader(ctx) {
    try {
      const user = ctx.state.user;
      const { group_id, member_id } = ctx.request.body;

      if (!validateObjectId(group_id) || !validateObjectId(member_id)) {
        ctx.status = 400;
        ctx.body = GroupController.error('无效的分组ID或成员ID');
        return;
      }

      const group = await Group.findById(group_id);
      if (!group) {
        ctx.status = 404;
        ctx.body = GroupController.error('分组不存在');
        return;
      }

      if (
        group.uid.toString() !== user._id.toString() &&
        user.role !== 'super_admin'
      ) {
        ctx.status = 403;
        ctx.body = GroupController.error('无权限设置分组组长');
        return;
      }

      if (!group.member.some((memberId) => memberId.toString() === member_id)) {
        ctx.status = 400;
        ctx.body = GroupController.error('成员不在分组中');
        return;
      }

      group.uid = member_id;
      await group.save();

      logger.info({ userId: user._id, groupId: group._id, newLeaderId: member_id }, 'Group leader set');
      
      // 记录操作日志
      await logOperation({
        type: 'group',
        action: 'set_leader',
        targetId: group._id,
        targetName: group.group_name,
        userId: user._id,
        username: user.username,
        details: { newLeaderId: member_id },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = GroupController.success(group, '组长设置成功');
    } catch (error) {
      logger.error({ error }, 'Group set leader error');
      ctx.status = 500;
      ctx.body = GroupController.error(
        process.env.NODE_ENV === 'production' ? '设置失败' : error.message || '设置失败'
      );
    }
  }
}

export default GroupController;

