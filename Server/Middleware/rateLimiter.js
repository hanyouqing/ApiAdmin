import { createRequire } from 'module';
import Redis from 'ioredis';

const require = createRequire(import.meta.url);
const rateLimit = require('koa-ratelimit');

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : null;

const createRateLimiter = (options = {}) => {
  const {
    max = 100,
    duration = 15 * 60 * 1000,
    message = 'Too many requests, please try again later',
  } = options;

  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // 在开发环境放宽限制
  const effectiveMax = isDevelopment ? max * 10 : max;
  const effectiveDuration = isDevelopment ? duration / 10 : duration;

  const limiterOptions = {
    driver: redis ? 'redis' : 'memory',
    db: redis || new Map(),
    duration: effectiveDuration,
    max: effectiveMax,
    id: (ctx) => {
      return ctx.state.user?._id?.toString() || ctx.ip;
    },
    errorMessage: message,
    throw: false,
  };

  const limiter = rateLimit(limiterOptions);

  return async (ctx, next) => {
    try {
      await limiter(ctx, next);
      
      // 检查是否被限流（koa-ratelimit 会设置 ctx.status = 429）
      if (ctx.status === 429) {
        ctx.body = {
          success: false,
          message: message,
        };
        return;
      }
    } catch (error) {
      // 如果限流器抛出错误
      if (error.status === 429 || ctx.status === 429) {
        ctx.status = 429;
        ctx.body = {
          success: false,
          message: typeof error.message === 'string' ? error.message : message,
        };
        return;
      }
      throw error;
    }
  };
};

export const apiRateLimiter = createRateLimiter({
  max: 100,
  duration: 15 * 60 * 1000,
  message: 'Too many API requests, please try again later',
});

export const authRateLimiter = createRateLimiter({
  max: 5,
  duration: 15 * 60 * 1000,
  message: 'Too many login attempts, please try again in 15 minutes',
});

export const registerRateLimiter = createRateLimiter({
  max: 3,
  duration: 60 * 60 * 1000,
  message: 'Too many registration attempts, please try again in 1 hour',
});

export const emailCodeRateLimiter = createRateLimiter({
  max: 10,
  duration: 15 * 60 * 1000,
  message: 'Too many email code requests, please try again in 15 minutes',
});
