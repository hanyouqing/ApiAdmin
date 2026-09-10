import jwt from 'jsonwebtoken';
import User from '../Models/User.js';
import config from '../Utils/config.js';
import { logger } from '../Utils/logger.js';

function getJWTSecret() {
  const secret = config.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
  }
  return secret;
}

export const authMiddleware = async (ctx, next) => {
  try {
    const JWT_SECRET = getJWTSecret();

    if (!JWT_SECRET) {
      logger.error('JWT_SECRET is not configured');
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '服务器配置错误',
      };
      return;
    }

    const authHeader = ctx.headers.authorization;
    const queryToken = ctx.query.token;
    const cookieToken = ctx.cookies.get('token');

    // Prefer Authorization / Cookie. Query-string tokens are rejected in production (leak via logs/Referer).
    let token =
      authHeader?.replace(/^Bearer\s+/i, '') ||
      cookieToken ||
      null;

    if (!token && queryToken) {
      if (process.env.NODE_ENV === 'production') {
        logger.warn({ path: ctx.path }, 'Rejected query-string token in production');
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: '请使用 Authorization Header 或 Cookie 传递认证令牌',
        };
        return;
      }
      token = queryToken;
    }

    if (!token) {
      logger.debug({
        hasAuthHeader: !!authHeader,
        hasQueryToken: !!queryToken,
        hasCookieToken: !!cookieToken,
      }, 'No token provided');
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '未提供认证令牌',
      };
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        logger.debug({
          expiredAt: err.expiredAt,
        }, 'Token expired');
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: '认证令牌已过期',
        };
        return;
      }
      if (err.name === 'JsonWebTokenError') {
        const isSignatureError = err.message === 'invalid signature';
        logger.warn({
          error: err.message,
          isSignatureError,
        }, isSignatureError ? 'Invalid token signature' : 'Invalid token format');
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: isSignatureError ? '认证令牌签名无效，请重新登录' : '无效的认证令牌',
        };
        return;
      }
      logger.error({
        error: {
          name: err.name,
          message: err.message,
        },
      }, 'JWT verification error');
      throw err;
    }

    if (!decoded.userId) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '无效的认证令牌',
      };
      return;
    }

    let user;
    try {
      user = await User.findById(decoded.userId);

      if (!user) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: '用户不存在',
        };
        return;
      }
    } catch (dbError) {
      logger.error({
        error: dbError.message,
        userId: decoded.userId,
      }, 'Failed to fetch user from database');
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '认证服务暂时不可用',
      };
      return;
    }

    ctx.state.user = user;
    await next();
  } catch (error) {
    logger.error({
      error: {
        name: error?.name,
        message: error?.message,
      },
      url: ctx.url,
      method: ctx.method,
    }, 'Auth middleware error');
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: '认证失败',
    };
  }
};
