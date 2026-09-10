import Koa from 'koa';
import Group from '../Models/Group.js';
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

class GroupController extends BaseController {
  static async list(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      if (!user || !user._id) {
        ctx.status = 401;
        ctx.body = GroupController.error('用户未认证');
        return;
      }

      let userId: mongoose.Types.ObjectId;
      if (user._id instanceof mongoose.Types.ObjectId) {
        userId = user._id;
      } else {
        userId = new mongoose.Types.ObjectId(user._id.toString());
      }

      const query = user.role === 'super_admin' 
        ? {} 
        : { $or: [{ uid: userId }, { member: userId }] };

      const groups = await Group.find(query)
        .populate('uid', 'username email avatar')
        .populate('member', 'username email avatar')
        .sort({ created_at: -1 })
        .lean();

      // 为每个分组添加项目数量
      if (groups.length > 0) {
        const groupIds = groups.map((g: any) => g._id);
        const projectCounts = await Project.aggregate([
          { $match: { group_id: { $in: groupIds } } },
          { $group: { _id: '$group_id', count: { $sum: 1 } } }
        ]);

        const countMap = new Map();
        projectCounts.forEach(item => {
          countMap.set(item._id.toString(), item.count);
        });

        const groupsWithCounts = groups.map((group: any) => ({
          ...group,
          project_count: countMap.get(group._id.toString()) || 0
        }));
        ctx.body = GroupController.success(groupsWithCounts);
      } else {
        ctx.body = GroupController.success([]);
      }
    } catch (error: any) {
      logger.error({ error: error.message, userId: ctx.state.user?._id }, 'Group list error');
      ctx.status = 500;
      ctx.body = GroupController.error(
        process.env.NODE_ENV === 'production' ? '获取分组列表失败' : error.message
      );
    }
  }

  static async add(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      let { group_name, group_desc } = ctx.request.body as any;

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
      const existingGroup = await Group.findOne({ group_name });
      if (existingGroup) {
        ctx.status = 400;
        ctx.body = GroupController.error('分组名称已存在，请使用其他名称');
        return;
      }

      const group = new Group({
        group_name,
        group_desc: group_desc ? sanitizeInput(group_desc) : '',
        uid: user._id,
        member: [user._id],
      });

      await group.save();

      try {
        const GroupMember = (await import('../Models/GroupMember.js')).default;
        const groupMember = new GroupMember({
          group_id: group._id,
          user_id: user._id,
          role: 'owner',
          invited_by: user._id,
        });
        await groupMember.save();
      } catch (memberError) {
        logger.warn({ error: memberError, groupId: group._id }, 'Failed to create group member record');
      }

      await logOperation({
        type: 'group',
        action: 'create',
        // @ts-ignore
        targetId: group._id,
        targetName: group_name,
        userId: user._id as any,
        username: user.username,
        ip: ctx.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = GroupController.success(group, '创建成功');
    } catch (error: any) {
      logger.error({ error }, 'Group add error');
      ctx.status = 500;
      ctx.body = GroupController.error(
        process.env.NODE_ENV === 'production' ? '创建失败' : error.message
      );
    }
  }

  static async update(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { _id, group_name, group_desc } = ctx.request.body as any;

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

      if (group_name && group_name !== group.group_name) {
        const existingGroup = await Group.findOne({ 
          group_name,
          _id: { $ne: group._id }
        });
        if (existingGroup) {
          ctx.status = 400;
          ctx.body = GroupController.error('分组名称已存在，请使用其他名称');
          return;
        }
      }

      if (group_name) group.group_name = group_name;
      if (group_desc !== undefined) group.group_desc = group_desc;

      await group.save();
      
      await logOperation({
        type: 'group',
        action: 'update',
        // @ts-ignore
        targetId: group._id,
        targetName: group.group_name,
        userId: user._id as any,
        username: user.username,
        details: { group_name, group_desc },
        ip: ctx.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = GroupController.success(group, '更新成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = GroupController.error(error.message || '更新失败');
    }
  }

  static async delete(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { _id } = ctx.query;

      if (typeof _id !== 'string' || !validateObjectId(_id)) {
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

      const projectCount = await Project.countDocuments({ group_id: _id });
      if (projectCount > 0) {
        ctx.status = 400;
        ctx.body = GroupController.error(`分组下还有${projectCount}个项目，请先删除项目`);
        return;
      }

      const groupName = group.group_name;
      await Group.findByIdAndDelete(_id);

      // @ts-ignore
      await logOperation({
        type: 'group',
        action: 'delete',
        // @ts-ignore
        targetId: new mongoose.Types.ObjectId(_id),
        targetName: groupName,
        userId: user._id as any,
        username: user.username,
        ip: ctx.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = GroupController.success(null, '删除成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = GroupController.error(error.message || '删除失败');
    }
  }

  static async get(ctx: Koa.Context) {
    try {
      const { _id } = ctx.query;
      if (typeof _id !== 'string') {
        ctx.status = 400;
        ctx.body = GroupController.error('无效的ID');
        return;
      }

      const group = await Group.findById(_id)
        .populate('uid', 'username email avatar')
        .populate('member', 'username email avatar');

      if (!group) {
        ctx.status = 404;
        ctx.body = GroupController.error('分组不存在');
        return;
      }

      ctx.body = GroupController.success(group);
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = GroupController.error(error.message || '获取分组详情失败');
    }
  }

  static async canManageGroup(group: any, user: AuthenticatedContext['state']['user']) {
    return (
      group.uid.toString() === user._id.toString() ||
      user.role === 'super_admin' ||
      (user.role === 'group_leader' && group.member.map((m: any) => m.toString()).includes(user._id.toString()))
    );
  }

  static async addMember(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { group_id, member_email } = ctx.request.body as any;

      if (!validateObjectId(group_id) || !member_email) {
        ctx.status = 400;
        ctx.body = GroupController.error('分组ID和成员邮箱不能为空');
        return;
      }

      const group = await Group.findById(group_id);
      if (!group) {
        ctx.status = 404;
        ctx.body = GroupController.error('分组不存在');
        return;
      }

      if (!(await GroupController.canManageGroup(group, user))) {
        ctx.status = 403;
        ctx.body = GroupController.error('无权限管理分组成员');
        return;
      }

      const User = (await import('../Models/User.js')).default;
      const member = await User.findOne({ email: sanitizeInput(member_email).toLowerCase() });
      if (!member) {
        ctx.status = 404;
        ctx.body = GroupController.error('用户不存在');
        return;
      }

      if (group.member.map((m: any) => m.toString()).includes(member._id.toString())) {
        ctx.status = 400;
        ctx.body = GroupController.error('用户已经是分组成员');
        return;
      }

      group.member.push(member._id as any);
      await group.save();
      ctx.body = GroupController.success(group, '成员添加成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = GroupController.error(error.message || '添加成员失败');
    }
  }

  static async removeMember(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const group_id = (ctx.query.group_id || (ctx.request.body as any)?.group_id) as string;
      const member_id = (ctx.query.member_id || (ctx.request.body as any)?.member_id) as string;

      if (!validateObjectId(group_id) || !validateObjectId(member_id)) {
        ctx.status = 400;
        ctx.body = GroupController.error('分组ID和成员ID不能为空');
        return;
      }

      const group = await Group.findById(group_id);
      if (!group) {
        ctx.status = 404;
        ctx.body = GroupController.error('分组不存在');
        return;
      }

      if (!(await GroupController.canManageGroup(group, user))) {
        ctx.status = 403;
        ctx.body = GroupController.error('无权限管理分组成员');
        return;
      }

      if (group.uid.toString() === member_id) {
        ctx.status = 400;
        ctx.body = GroupController.error('不能移除分组所有者');
        return;
      }

      group.member = group.member.filter((m: any) => m.toString() !== member_id) as any;
      await group.save();
      ctx.body = GroupController.success(group, '成员移除成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = GroupController.error(error.message || '移除成员失败');
    }
  }

  static async setLeader(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { group_id, member_id } = ctx.request.body as any;

      if (!validateObjectId(group_id) || !validateObjectId(member_id)) {
        ctx.status = 400;
        ctx.body = GroupController.error('分组ID和成员ID不能为空');
        return;
      }

      const group = await Group.findById(group_id);
      if (!group) {
        ctx.status = 404;
        ctx.body = GroupController.error('分组不存在');
        return;
      }

      if (group.uid.toString() !== user._id.toString() && user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = GroupController.error('只有分组所有者或超级管理员可以设置组长');
        return;
      }

      if (!group.member.map((m: any) => m.toString()).includes(member_id) && group.uid.toString() !== member_id) {
        ctx.status = 400;
        ctx.body = GroupController.error('目标用户不是分组成员');
        return;
      }

      const previousOwner = group.uid;
      group.uid = member_id as any;
      if (!group.member.map((m: any) => m.toString()).includes(previousOwner.toString())) {
        group.member.push(previousOwner as any);
      }
      group.member = group.member.filter((m: any) => m.toString() !== member_id) as any;
      await group.save();

      const User = (await import('../Models/User.js')).default;
      await User.findByIdAndUpdate(member_id, { role: 'group_leader' });

      ctx.body = GroupController.success(group, '组长设置成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = GroupController.error(error.message || '设置组长失败');
    }
  }
}

export default GroupController;
