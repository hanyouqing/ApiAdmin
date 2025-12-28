import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const logRequest = (ctx, duration) => {
  const logData = {
    method: ctx.method,
    url: ctx.url,
    status: ctx.status,
    duration: `${duration}ms`,
    ip: ctx.ip,
    userAgent: ctx.headers['user-agent'],
  };

  if (ctx.state.user) {
    logData.userId = ctx.state.user._id;
  }

  if (ctx.status >= 400) {
    logger.warn(logData, 'Request failed');
  } else {
    logger.info(logData, 'Request completed');
  }
};

export const logError = (error, context = {}) => {
  logger.error(
    {
      ...context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    },
    'Error occurred'
  );
};

