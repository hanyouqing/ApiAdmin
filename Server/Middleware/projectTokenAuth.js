import ProjectToken from '../Models/ProjectToken.js';
import { logger } from '../Utils/logger.js';
import { hashToken } from '../Utils/security.js';

export const projectTokenAuth = async (ctx, next) => {
  try {
    const authHeader = ctx.headers.authorization;
    const headerToken = authHeader?.replace(/^Bearer\s+/i, '') || ctx.get('X-Project-Token');
    let token = headerToken || null;

    if (!token && ctx.query.token) {
      if (process.env.NODE_ENV === 'production') {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: '请使用 Authorization 或 X-Project-Token Header 传递项目 Token',
        };
        return;
      }
      token = ctx.query.token;
    }

    if (!token) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '未提供项目 Token',
      };
      return;
    }

    const tokenHash = hashToken(token);
    let projectToken = await ProjectToken.findOne({ tokenHash });
    if (!projectToken) {
      // Backward compatibility for legacy plaintext tokens
      projectToken = await ProjectToken.findOne({ token }).select('+token');
    }

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

    await projectToken.updateLastUsed();

    ctx.state.projectToken = projectToken;
    ctx.state.projectId = projectToken.projectId;

    await next();
  } catch (error) {
    logger.error({ error: error.message }, 'Project token auth error');
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: '项目 Token 认证失败',
    };
  }
};
