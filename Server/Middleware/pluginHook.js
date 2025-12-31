import { pluginManager } from '../Utils/pluginManager.js';
import { logger } from '../Utils/logger.js';

/**
 * 插件 Hook 中间件
 * 在请求处理过程中执行相关 Hook
 */
export const pluginHookMiddleware = async (ctx, next) => {
  try {
    const requestContext = {
      method: ctx.method,
      url: ctx.url,
      path: ctx.path,
      query: ctx.query,
      body: ctx.request.body,
      headers: ctx.headers,
      params: ctx.params,
      state: ctx.state,
      ip: ctx.ip,
    };

    const beforeRequestResult = await pluginManager.executeHook('beforeRequest', {
      request: requestContext,
      ctx,
    });

    if (beforeRequestResult && beforeRequestResult.request) {
      if (beforeRequestResult.request.headers) {
        Object.assign(ctx.headers, beforeRequestResult.request.headers);
      }
      if (beforeRequestResult.request.body) {
        ctx.request.body = beforeRequestResult.request.body;
      }
      if (beforeRequestResult.request.query) {
        Object.assign(ctx.query, beforeRequestResult.request.query);
      }
    }

    await next();

    const responseContext = {
      status: ctx.status,
      body: ctx.body,
      headers: ctx.response.headers,
    };

    await pluginManager.executeHook('afterResponse', {
      request: requestContext,
      response: responseContext,
      ctx,
    });
  } catch (error) {
    logger.error({ error }, 'Plugin hook middleware error');
    await next();
  }
};

/**
 * 接口创建 Hook
 */
export async function executeInterfaceCreateHook(interfaceData, user) {
  try {
    await pluginManager.executeHook('onInterfaceCreate', {
      interface: interfaceData,
      user,
    });
  } catch (error) {
    logger.error({ error }, 'Interface create hook error');
  }
}

/**
 * 接口更新 Hook
 */
export async function executeInterfaceUpdateHook(interfaceData, user, oldData) {
  try {
    await pluginManager.executeHook('onInterfaceUpdate', {
      interface: interfaceData,
      user,
      oldData,
    });
  } catch (error) {
    logger.error({ error }, 'Interface update hook error');
  }
}

/**
 * 接口删除 Hook
 */
export async function executeInterfaceDeleteHook(interfaceId, user) {
  try {
    await pluginManager.executeHook('onInterfaceDelete', {
      interfaceId,
      user,
    });
  } catch (error) {
    logger.error({ error }, 'Interface delete hook error');
  }
}

/**
 * 接口运行 Hook
 */
export async function executeInterfaceRunHook(interfaceData, requestData, responseData) {
  try {
    await pluginManager.executeHook('onInterfaceRun', {
      interface: interfaceData,
      request: requestData,
      response: responseData,
    });
  } catch (error) {
    logger.error({ error }, 'Interface run hook error');
  }
}

/**
 * Mock 前 Hook
 */
export async function executeBeforeMockHook(interfaceData, requestData) {
  try {
    const result = await pluginManager.executeHook('beforeMock', {
      interface: interfaceData,
      request: requestData,
    });
    return result;
  } catch (error) {
    logger.error({ error }, 'Before mock hook error');
    return null;
  }
}

/**
 * Mock 后 Hook
 */
export async function executeAfterMockHook(interfaceData, requestData, mockData) {
  try {
    const result = await pluginManager.executeHook('afterMock', {
      interface: interfaceData,
      request: requestData,
      mockData,
    });
    return result?.mockData || mockData;
  } catch (error) {
    logger.error({ error }, 'After mock hook error');
    return mockData;
  }
}

/**
 * 测试前 Hook
 */
export async function executeBeforeTestHook(testCollection, testCase) {
  try {
    const result = await pluginManager.executeHook('beforeTest', {
      collection: testCollection,
      testCase,
    });
    return result;
  } catch (error) {
    logger.error({ error }, 'Before test hook error');
    return null;
  }
}

/**
 * 测试后 Hook
 */
export async function executeAfterTestHook(testCollection, testCase, result) {
  try {
    await pluginManager.executeHook('afterTest', {
      collection: testCollection,
      testCase,
      result,
    });
  } catch (error) {
    logger.error({ error }, 'After test hook error');
  }
}


