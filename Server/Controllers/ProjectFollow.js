import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import ProjectFollow from '../Models/ProjectFollow.js';
import Project from '../Models/Project.js';

class ProjectFollowController extends BaseController {
  static get ControllerName() { return 'ProjectFollowController'; }

  static async followProject(ctx) {
    try {
      const user = ctx.state.user;
      const { projectId } = ctx.params;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = ProjectFollowController.error('无效的项目 ID');
        return;
      }

      const project = await Project.findById(projectId);
      if (!project) {
        ctx.status = 404;
        ctx.body = ProjectFollowController.error('项目不存在');
        return;
      }

      // 检查是否已关注
      const existing = await ProjectFollow.findOne({
        userId: user._id,
        projectId,
      });

      if (existing) {
        ctx.body = ProjectFollowController.success(null, '已关注该项目');
        return;
      }

      const follow = new ProjectFollow({
        userId: user._id,
        projectId,
      });

      await follow.save();

      logger.info({ userId: user._id, projectId }, 'Project followed');

      ctx.body = ProjectFollowController.success(null, '关注项目成功');
    } catch (error) {
      if (error.code === 11000) {
        ctx.body = ProjectFollowController.success(null, '已关注该项目');
        return;
      }
      logger.error({ error }, 'Follow project error');
      ctx.status = 500;
      ctx.body = ProjectFollowController.error(
        process.env.NODE_ENV === 'production'
          ? '关注项目失败'
          : error.message || '关注项目失败'
      );
    }
  }

  static async unfollowProject(ctx) {
    try {
      const user = ctx.state.user;
      const { projectId } = ctx.params;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = ProjectFollowController.error('无效的项目 ID');
        return;
      }

      const follow = await ProjectFollow.findOneAndDelete({
        userId: user._id,
        projectId,
      });

      if (!follow) {
        ctx.status = 404;
        ctx.body = ProjectFollowController.error('未关注该项目');
        return;
      }

      logger.info({ userId: user._id, projectId }, 'Project unfollowed');

      ctx.body = ProjectFollowController.success(null, '取消关注成功');
    } catch (error) {
      logger.error({ error }, 'Unfollow project error');
      ctx.status = 500;
      ctx.body = ProjectFollowController.error(
        process.env.NODE_ENV === 'production'
          ? '取消关注失败'
          : error.message || '取消关注失败'
      );
    }
  }

  static async listFollowing(ctx) {
    try {
      const user = ctx.state.user;
      const { page = 1, pageSize = 10 } = ctx.query;

      const skip = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const [follows, total] = await Promise.all([
        ProjectFollow.find({ userId: user._id })
          .populate('projectId', 'project_name desc updatedAt')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        ProjectFollow.countDocuments({ userId: user._id }),
      ]);

      const list = follows
        .filter(f => f.projectId) // 过滤已删除的项目
        .map(f => ({
          id: f.projectId._id.toString(),
          projectName: f.projectId.project_name,
          description: f.projectId.desc || '',
          followedAt: f.createdAt,
          lastUpdateAt: f.projectId.updatedAt,
        }));

      ctx.body = ProjectFollowController.success({
        list,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize)),
        },
      });
    } catch (error) {
      logger.error({ error }, 'List following projects error');
      ctx.status = 500;
      ctx.body = ProjectFollowController.error(
        process.env.NODE_ENV === 'production'
          ? '获取关注列表失败'
          : error.message || '获取关注列表失败'
      );
    }
  }

  static async checkFollowing(ctx) {
    try {
      const user = ctx.state.user;
      const { projectId } = ctx.params;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = ProjectFollowController.error('无效的项目 ID');
        return;
      }

      const follow = await ProjectFollow.findOne({
        userId: user._id,
        projectId,
      });

      ctx.body = ProjectFollowController.success({
        following: !!follow,
        followedAt: follow?.createdAt || null,
      });
    } catch (error) {
      logger.error({ error }, 'Check following error');
      ctx.status = 500;
      ctx.body = ProjectFollowController.error(
        process.env.NODE_ENV === 'production'
          ? '检查关注状态失败'
          : error.message || '检查关注状态失败'
      );
    }
  }
}

export default ProjectFollowController;

