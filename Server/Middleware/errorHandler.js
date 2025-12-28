import { logger, logError } from '../Utils/logger.js';

export const errorHandler = async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    logError(err, {
      method: ctx.method,
      url: ctx.url,
      ip: ctx.ip,
      userId: ctx.state.user?._id,
    });

    ctx.status = err.status || err.statusCode || 500;
    
    const isProduction = process.env.NODE_ENV === 'production';
    
    ctx.body = {
      success: false,
      message: isProduction 
        ? '服务器内部错误' 
        : err.message || '服务器内部错误',
      ...(isProduction ? {} : { stack: err.stack }),
    };

    if (!ctx.headerSent) {
      ctx.app.emit('error', err, ctx);
    }
  }
};

