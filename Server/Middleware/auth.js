import jwt from 'jsonwebtoken';
import User from '../Models/User.js';
import config from '../Utils/config.js';
import { logger } from '../Utils/logger.js';

// 在运行时获取 JWT_SECRET，而不是在模块加载时
function getJWTSecret() {
  const secret = config.JWT_SECRET;
  if (!secret || secret === 'your-secret-key') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
  }
  return secret;
}

export const authMiddleware = async (ctx, next) => {
  try {
    // 在运行时获取 JWT_SECRET，确保使用最新的配置
    const JWT_SECRET = getJWTSecret();
    
    // 检查 JWT_SECRET 是否配置
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
    const token = 
      authHeader?.replace(/^Bearer\s+/i, '') || 
      ctx.query.token ||
      ctx.cookies.get('token');

    if (!token) {
      logger.debug({
        hasAuthHeader: !!authHeader,
        authHeader: authHeader ? `${authHeader.substring(0, 20)}...` : null,
        hasQueryToken: !!ctx.query.token,
        hasCookieToken: !!ctx.cookies.get('token'),
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
          currentTime: new Date(),
        }, 'Token expired');
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: '认证令牌已过期',
        };
        return;
      }
      if (err.name === 'JsonWebTokenError') {
        // 检查是否是签名错误，可能是 JWT_SECRET 不匹配
        const isSignatureError = err.message === 'invalid signature';
        logger.warn({
          error: err.message,
          tokenPrefix: token.substring(0, 20),
          isSignatureError,
          currentJWTSecret: JWT_SECRET ? `${JWT_SECRET.substring(0, 10)}...` : 'NOT SET',
          hint: isSignatureError ? 'Token signature mismatch. This may indicate JWT_SECRET changed or token was signed with different secret.' : null,
        }, isSignatureError ? 'Invalid token signature (JWT_SECRET mismatch)' : 'Invalid token format');
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
          stack: err.stack,
        },
      }, 'JWT verification error');
      throw err;
    }

    if (!decoded.userId) {
      logger.warn({
        decoded,
      }, 'Token decoded but missing userId');
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '无效的认证令牌',
      };
      return;
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      logger.warn({
        userId: decoded.userId,
      }, 'User not found');
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户不存在',
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
        stack: error?.stack,
        code: error?.code,
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

