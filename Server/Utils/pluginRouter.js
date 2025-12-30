import Router from 'koa-router';
import { pluginManager } from './pluginManager.js';
import { logger } from './logger.js';
import { authMiddleware } from '../Middleware/auth.js';
import { apiRateLimiter } from '../Middleware/rateLimiter.js';
import { validateObjectId } from './validation.js';

/**
 * 创建插件路由处理器
 */
async function createPluginRouteHandler(route) {
  return async (ctx, next) => {
    try {
      const plugin = pluginManager.getPlugin(route.pluginName);
      if (!plugin) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: `Plugin ${route.pluginName} not found or not loaded`,
        };
        return;
      }

      const pluginData = plugin.data;
      if (!pluginData.enabled) {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: `Plugin ${route.pluginName} is disabled`,
        };
        return;
      }

      let handlerModule;
      try {
        handlerModule = await import(`file://${route.handlerPath}`);
      } catch (error) {
        logger.error({ error, handlerPath: route.handlerPath }, 'Failed to load plugin handler');
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: 'Failed to load plugin handler',
        };
        return;
      }

      const handlerFunction = handlerModule[route.handlerMethod] || handlerModule.default;

      if (typeof handlerFunction !== 'function') {
        logger.error({ handlerMethod: route.handlerMethod }, 'Handler method not found');
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: 'Handler method not found',
        };
        return;
      }

      if (route.validation && Object.keys(route.validation).length > 0) {
        const validation = route.validation;
        
        if (validation.body) {
          const Ajv = (await import('ajv')).default;
          const ajv = new Ajv();
          const validate = ajv.compile(validation.body);
          
          if (!validate(ctx.request.body)) {
            ctx.status = 400;
            ctx.body = {
              success: false,
              message: 'Validation failed',
              errors: validate.errors,
            };
            return;
          }
        }

        if (validation.query) {
          const Ajv = (await import('ajv')).default;
          const ajv = new Ajv();
          const validate = ajv.compile(validation.query);
          
          if (!validate(ctx.query)) {
            ctx.status = 400;
            ctx.body = {
              success: false,
              message: 'Query validation failed',
              errors: validate.errors,
            };
            return;
          }
        }
      }

      await handlerFunction(ctx, next);
    } catch (error) {
      logger.error({ error, route: route.path }, 'Plugin route handler error');
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
      };
    }
  };
}

/**
 * 注册插件路由到主路由
 */
export async function registerPluginRoutes(mainRouter) {
  const routes = pluginManager.getRoutes();

  for (const route of routes) {
    try {
      const handler = await createPluginRouteHandler(route);
      
      const middlewares = [];
      
      if (route.middleware && Array.isArray(route.middleware)) {
        for (const mwName of route.middleware) {
          if (mwName === 'auth') {
            middlewares.push(authMiddleware);
          } else if (mwName === 'rateLimit') {
            middlewares.push(apiRateLimiter);
          }
        }
      }

      switch (route.method) {
        case 'GET':
          mainRouter.get(route.path, ...middlewares, handler);
          break;
        case 'POST':
          mainRouter.post(route.path, ...middlewares, handler);
          break;
        case 'PUT':
          mainRouter.put(route.path, ...middlewares, handler);
          break;
        case 'DELETE':
          mainRouter.delete(route.path, ...middlewares, handler);
          break;
        case 'PATCH':
          mainRouter.patch(route.path, ...middlewares, handler);
          break;
        default:
          logger.warn({ method: route.method, path: route.path }, 'Unsupported HTTP method');
      }

      logger.info({ 
        pluginName: route.pluginName, 
        method: route.method, 
        path: route.path 
      }, 'Plugin route registered');
    } catch (error) {
      logger.error({ error, route: route.path }, 'Failed to register plugin route');
    }
  }
}

