import CLIToken from '../Models/CLIToken.js';
import User from '../Models/User.js';
import { logger } from '../Utils/logger.js';
import { hashToken } from '../Utils/security.js';

/**
 * Authenticate CI callers via CLI token (hashed).
 * Accepts Authorization: Bearer <token> or X-CLI-Token header.
 * Falls back to JWT authMiddleware when no CLI token is present (caller should chain).
 */
export const cliTokenAuth = async (ctx, next) => {
  try {
    const authHeader = ctx.headers.authorization;
    const bearer = authHeader?.replace(/^Bearer\s+/i, '') || null;
    const headerToken = ctx.get('X-CLI-Token') || ctx.get('X-Cicd-Token');
    let token = headerToken || null;

    // Prefer dedicated CLI header; Bearer may be JWT — only treat as CLI if hash matches
    if (!token && bearer) {
      token = bearer;
    }

    if (!token && ctx.query.token) {
      if (process.env.NODE_ENV === 'production') {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: '请使用 Authorization 或 X-CLI-Token Header 传递 CLI Token',
        };
        return;
      }
      token = ctx.query.token;
    }

    if (!token) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '未提供 CLI Token',
      };
      return;
    }

    const tokenHash = hashToken(token);
    let cliToken = await CLIToken.findOne({ tokenHash });
    if (!cliToken) {
      cliToken = await CLIToken.findOne({ token }).select('+token');
    }

    if (!cliToken) {
      // Not a CLI token — let JWT middleware handle if chained differently
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '无效的 CLI Token',
      };
      return;
    }

    if (cliToken.isExpired()) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'CLI Token 已过期',
      };
      return;
    }

    await cliToken.updateLastUsed();

    const user = await User.findById(cliToken.createdBy);
    if (!user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'CLI Token 关联用户不存在',
      };
      return;
    }

    ctx.state.cliToken = cliToken;
    ctx.state.user = user;
    if (cliToken.projectId) {
      ctx.state.projectId = cliToken.projectId;
    }

    await next();
  } catch (error) {
    logger.error({ error: error.message }, 'CLI token auth error');
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: 'CLI Token 认证失败',
    };
  }
};

/**
 * Accept either JWT (authMiddleware already ran) or CLI token.
 * Use after optional JWT: if ctx.state.user set, continue; else try CLI token.
 */
export const jwtOrCliTokenAuth = async (ctx, next) => {
  if (ctx.state.user) {
    await next();
    return;
  }
  return cliTokenAuth(ctx, next);
};
