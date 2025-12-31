import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import ProjectToken from '../Models/ProjectToken.js';
import Project from '../Models/Project.js';

class ProjectTokenController extends BaseController {
  static get ControllerName() { return 'ProjectTokenController'; }

  static async generateToken(ctx) {
    try {
      const user = ctx.state.user;
      const { projectId } = ctx.params;
      let { name, expiresAt } = ctx.request.body;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = ProjectTokenController.error('无效的项目 ID');
        return;
      }

      if (!name) {
        ctx.status = 400;
        ctx.body = ProjectTokenController.error('Token 名称不能为空');
        return;
      }

      const project = await Project.findById(projectId);
      if (!project) {
        ctx.status = 404;
        ctx.body = ProjectTokenController.error('项目不存在');
        return;
      }

      name = sanitizeInput(name);
      const expiresAtDate = expiresAt ? new Date(expiresAt) : null;

      const token = ProjectToken.generateToken();

      const projectToken = new ProjectToken({
        token,
        name,
        projectId,
        expiresAt: expiresAtDate,
        createdBy: user._id,
      });

      await projectToken.save();

      logger.info({ userId: user._id, projectId, tokenId: projectToken._id }, 'Project token generated');

      ctx.body = ProjectTokenController.success({
        id: projectToken._id,
        token, // 仅返回一次
        name: projectToken.name,
        expiresAt: projectToken.expiresAt,
        createdAt: projectToken.createdAt,
      }, '项目 Token 生成成功');
    } catch (error) {
      logger.error({ error }, 'Generate project token error');
      ctx.status = 500;
      ctx.body = ProjectTokenController.error(
        process.env.NODE_ENV === 'production'
          ? '生成项目 Token 失败'
          : error.message || '生成项目 Token 失败'
      );
    }
  }

  static async listTokens(ctx) {
    try {
      const { projectId } = ctx.params;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = ProjectTokenController.error('无效的项目 ID');
        return;
      }

      const tokens = await ProjectToken.find({ projectId })
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 });

      // 不返回 token 值
      const tokensData = tokens.map(t => ({
        id: t._id,
        name: t.name,
        expiresAt: t.expiresAt,
        lastUsedAt: t.lastUsedAt,
        createdAt: t.createdAt,
        createdBy: t.createdBy?.username,
      }));

      ctx.body = ProjectTokenController.success(tokensData);
    } catch (error) {
      logger.error({ error }, 'List project tokens error');
      ctx.status = 500;
      ctx.body = ProjectTokenController.error(
        process.env.NODE_ENV === 'production'
          ? '获取项目 Token 列表失败'
          : error.message || '获取项目 Token 列表失败'
      );
    }
  }

  static async deleteToken(ctx) {
    try {
      const user = ctx.state.user;
      const { projectId, tokenId } = ctx.params;

      if (!validateObjectId(projectId) || !validateObjectId(tokenId)) {
        ctx.status = 400;
        ctx.body = ProjectTokenController.error('无效的项目 ID 或 Token ID');
        return;
      }

      const token = await ProjectToken.findOne({
        _id: tokenId,
        projectId,
      });

      if (!token) {
        ctx.status = 404;
        ctx.body = ProjectTokenController.error('项目 Token 不存在');
        return;
      }

      // 检查权限：项目负责人或超级管理员
      const project = await Project.findById(projectId);
      const isProjectLeader = project?.uid?.toString() === user._id.toString();
      if (!isProjectLeader && user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = ProjectTokenController.error('无权限删除此 Token');
        return;
      }

      await token.deleteOne();

      logger.info({ userId: user._id, projectId, tokenId }, 'Project token deleted');

      ctx.body = ProjectTokenController.success(null, '项目 Token 删除成功');
    } catch (error) {
      logger.error({ error }, 'Delete project token error');
      ctx.status = 500;
      ctx.body = ProjectTokenController.error(
        process.env.NODE_ENV === 'production'
          ? '删除项目 Token 失败'
          : error.message || '删除项目 Token 失败'
      );
    }
  }
}

export default ProjectTokenController;


