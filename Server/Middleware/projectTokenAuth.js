import ProjectToken from '../Models/ProjectToken.js';
import { logger } from '../Utils/logger.js';

export const projectTokenAuth = async (ctx, next) => {
  try {
    const authHeader = ctx.headers.authorization;
    const token = authHeader?.replace(/^Bearer\s+/i, '') || ctx.query.token;

    if (!token) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '未提供项目 Token',
      };
      return;
    }

    const projectToken = await ProjectToken.findOne({ token });

    if (!projectToken) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '无效的项目 Token',
      };
      return;
    }

    if (projectToken.isExpired()) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '项目 Token 已过期',
      };
      return;
    }

    // 更新最后使用时间
    await projectToken.updateLastUsed();

    ctx.state.projectToken = projectToken;
    ctx.state.projectId = projectToken.projectId;

    await next();
  } catch (error) {
    logger.error({ error }, 'Project token auth error');
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: '项目 Token 认证失败',
    };
  }
};

