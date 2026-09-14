import CLIToken from '../Models/CLIToken.js';
import { logger } from '../Utils/logger.js';

/**
 * Authenticate CI/CLI requests via Authorization: Bearer <cli-token>
 * or X-CLI-Token header. Sets ctx.state.user from token.createdBy.
 */
export const cliTokenAuth = async (ctx, next) => {
  try {
    const authHeader = ctx.headers.authorization;
    const token =
      ctx.get('X-CLI-Token') ||
      authHeader?.replace(/^Bearer\s+/i, '') ||
      (process.env.NODE_ENV !== 'production' ? ctx.query.token : null);

    if (!token) {
      ctx.status = 401;
      ctx.body = { success: false, message: '未提供 CLI Token' };
      return;
    }

    const cliToken = await CLIToken.findOne({ token }).populate(
      'createdBy',
      '_id username email role'
    );
    if (!cliToken) {
      ctx.status = 401;
      ctx.body = { success: false, message: '无效的 CLI Token' };
      return;
    }

    if (cliToken.isExpired()) {
      ctx.status = 401;
      ctx.body = { success: false, message: 'CLI Token 已过期' };
      return;
    }

    await cliToken.updateLastUsed();

    const user = cliToken.createdBy;
    if (!user) {
      ctx.status = 401;
      ctx.body = { success: false, message: 'CLI Token 关联用户无效' };
      return;
    }

    ctx.state.cliToken = cliToken;
    ctx.state.user = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role || 'user',
    };
    if (cliToken.projectId) {
      ctx.state.projectId = cliToken.projectId;
    }

    await next();
  } catch (error) {
    logger.error({ error: error.message }, 'CLI token auth error');
    ctx.status = 401;
    ctx.body = { success: false, message: 'CLI Token 认证失败' };
  }
};

/** Prefer CLI token when present; otherwise JWT auth middleware. */
export const authOrCliToken = async (ctx, next) => {
  if (ctx.get('X-CLI-Token')) {
    return cliTokenAuth(ctx, next);
  }

  const authHeader = ctx.headers.authorization || '';
  const raw = authHeader.replace(/^Bearer\s+/i, '');
  if (raw) {
    const found = await CLIToken.findOne({ token: raw }).select('_id');
    if (found) {
      return cliTokenAuth(ctx, next);
    }
  }

  const { authMiddleware } = await import('./auth.js');
  return authMiddleware(ctx, next);
};
