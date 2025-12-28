import { logger } from '../Utils/logger.js';

export const requestLogger = async (ctx, next) => {
  const start = Date.now();
  
  await next();
  
  const duration = Date.now() - start;
  
  const logData = {
    method: ctx.method,
    url: ctx.url,
    status: ctx.status,
    duration: `${duration}ms`,
    ip: ctx.ip,
    userAgent: ctx.headers['user-agent'],
  };

  if (ctx.state.user) {
    logData.userId = ctx.state.user._id.toString();
  }

  if (ctx.status >= 400) {
    logger.warn(logData, 'Request failed');
  } else if (ctx.url.startsWith('/api')) {
    logger.info(logData, 'API request');
  }
};

