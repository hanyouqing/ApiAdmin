import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import Project from '../Models/Project.js';
import OperationLog from '../Models/OperationLog.js';
import ProjectMember from '../Models/ProjectMember.js';

class UserCenterController extends BaseController {
  static get ControllerName() { return 'UserCenterController'; }

  static async getUserProjects(ctx) {
    try {
      const user = ctx.state.user;
      const { role, page = 1, pageSize = 10 } = ctx.query;

      // 查找用户参与的项目
      // 1. 作为项目负责人的项目
      // 2. 作为项目成员的项目
      const query = {
        $or: [
          { uid: user._id },
          { members: { $elemMatch: { uid: user._id } } },
        ],
      };

      if (role) {
        // 如果指定了角色，进一步筛选
        // TODO: 根据角色筛选
      }

      const skip = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const [projects, total] = await Promise.all([
        Project.find(query)
          .populate('group_id', 'group_name')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit),
        Project.countDocuments(query),
      ]);

      // 获取用户在项目中的成员信息（包括加入时间）
      const projectIds = projects.map(p => p._id);
      const projectMembers = await ProjectMember.find({
        project_id: { $in: projectIds },
        user_id: user._id,
      }).lean();

      const memberMap = new Map();
      for (const member of projectMembers) {
        memberMap.set(member.project_id.toString(), member);
      }

      const list = projects.map(project => {
        // 确定用户在该项目中的角色
        let userRole = 'guest';
        let joinedAt = project.createdAt;

        if (project.uid?.toString() === user._id.toString()) {
          userRole = 'project_leader';
          joinedAt = project.createdAt; // 项目负责人使用项目创建时间
        } else {
          const member = memberMap.get(project._id.toString());
          if (member) {
            userRole = member.role || 'developer';
            joinedAt = member.joined_at || project.createdAt;
          } else if (project.member?.some(m => m.toString() === user._id.toString())) {
            // 兼容旧的数据结构
            userRole = 'developer';
            joinedAt = project.createdAt;
          }
        }

        return {
          id: project._id.toString(),
          projectName: project.project_name,
          description: project.desc || '',
          role: userRole,
          joinedAt: joinedAt,
        };
      });

      ctx.body = UserCenterController.success({
        list,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize)),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Get user projects error');
      ctx.status = 500;
      ctx.body = UserCenterController.error(
        process.env.NODE_ENV === 'production'
          ? '获取用户项目失败'
          : error.message || '获取用户项目失败'
      );
    }
  }

  static async getUserStats(ctx) {
    try {
      const user = ctx.state.user;
      const { startDate, endDate } = ctx.query;

      const query = { userId: user._id };

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
        }
      }

      // 获取操作统计
      const logs = await OperationLog.find(query);

      const totalActions = logs.length;
      const actionsByType = {};
      const actionsByDate = {};

      for (const log of logs) {
        // 按类型统计
        actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;

        // 按日期统计
        const date = log.createdAt.toISOString().split('T')[0];
        actionsByDate[date] = (actionsByDate[date] || 0) + 1;
      }

      // 转换为数组格式
      const actionsByDateArray = Object.entries(actionsByDate).map(([date, count]) => ({
        date,
        count,
      }));

      // 获取项目贡献数
      const projectsContributed = await Project.countDocuments({
        $or: [
          { uid: user._id },
          { members: { $elemMatch: { uid: user._id } } },
        ],
      });

      // 获取创建的接口数
      const interfacesCreated = await OperationLog.countDocuments({
        userId: user._id,
        action: 'create',
        type: 'interface',
      });

      // 获取执行的测试数
      const testsRun = await OperationLog.countDocuments({
        userId: user._id,
        action: 'run',
        type: 'test',
      });

      ctx.body = UserCenterController.success({
        totalActions,
        actionsByType,
        actionsByDate: actionsByDateArray,
        projectsContributed,
        interfacesCreated,
        testsRun,
      });
    } catch (error) {
      logger.error({ error }, 'Get user stats error');
      ctx.status = 500;
      ctx.body = UserCenterController.error(
        process.env.NODE_ENV === 'production'
          ? '获取用户统计失败'
          : error.message || '获取用户统计失败'
      );
    }
  }
}

export default UserCenterController;


