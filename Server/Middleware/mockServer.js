import Interface from '../Models/Interface.js';
import Project from '../Models/Project.js';
import { logger } from '../Utils/logger.js';
import { executeMockScript } from '../Utils/mockScriptExecutor.js';

export const mockServer = async (ctx, next) => {
  if (!ctx.path.startsWith('/mock/')) {
    return await next();
  }

  try {
    const pathParts = ctx.path.replace('/mock/', '').split('/');
    if (pathParts.length < 2) {
      ctx.status = 404;
      ctx.body = { error: 'Invalid mock path' };
      return;
    }

    const projectId = pathParts[0];
    const interfacePath = '/' + pathParts.slice(1).join('/');
    const method = ctx.method.toUpperCase();

    const project = await Project.findById(projectId);
    if (!project) {
      ctx.status = 404;
      ctx.body = { error: 'Project not found' };
      return;
    }

    const interfaceData = await Interface.findOne({
      project_id: projectId,
      path: interfacePath,
      method: method,
    });

    if (!interfaceData) {
      ctx.status = 404;
      ctx.body = { error: 'Interface not found' };
      return;
    }

    if (project.mock_strict) {
      const validationResult = validateMockRequest(ctx, interfaceData);
      if (!validationResult.valid) {
        ctx.status = 400;
        ctx.body = { error: validationResult.message };
        return;
      }
    }

    let responseData = null;
    let statusCode = 200;
    let delay = 0;
    let responseHeaders = {};

    const MockExpectation = (await import('../Models/MockExpectation.js')).default;
    const expectation = await MockExpectation.findOne({
      interface_id: interfaceData._id,
      enabled: true,
    })
      .sort({ priority: -1, created_at: -1 });

    if (expectation && matchesExpectation(ctx, expectation)) {
      responseData = expectation.response.body;
      statusCode = expectation.response.status_code;
      delay = expectation.response.delay || 0;
      responseHeaders = expectation.response.headers || {};
      logger.info({ expectationId: expectation._id, interfaceId: interfaceData._id }, 'Mock expectation matched');
    } else {
      let mockData = interfaceData.res_body || '{}';
      let parsedMockData = {};

      try {
        if (interfaceData.res_body_type === 'json') {
          const Mock = (await import('mockjs')).default;
          const JSON5 = (await import('json5')).default;

          if (project.enable_json5) {
            parsedMockData = JSON5.parse(mockData);
          } else {
            parsedMockData = JSON.parse(mockData);
          }

          parsedMockData = Mock.mock(parsedMockData);
          parsedMockData = replaceVariables(parsedMockData, ctx);
        } else {
          parsedMockData = mockData;
        }

        const scriptContext = {
          header: ctx.headers,
          params: { ...ctx.query, ...(ctx.request.body || {}) },
          cookie: ctx.cookies || {},
          mockJson: parsedMockData,
          resHeader: {},
          httpCode: 200,
          delay: 0,
        };

        let scriptResult = null;
        
        if (interfaceData.mock_script && interfaceData.mock_script.trim()) {
          try {
            scriptResult = await executeMockScript(interfaceData.mock_script, scriptContext);
            if (scriptResult) {
              responseHeaders = { ...responseHeaders, ...scriptResult.resHeader };
              statusCode = scriptResult.httpCode;
              delay = scriptResult.delay;
              parsedMockData = scriptResult.body || parsedMockData;
            }
          } catch (error) {
            logger.error({ error, interfaceId: interfaceData._id }, 'Interface mock script execution error');
          }
        }

        if (!scriptResult && project.mock_script && project.mock_script.trim()) {
          try {
            scriptResult = await executeMockScript(project.mock_script, scriptContext);
            if (scriptResult) {
              responseHeaders = { ...responseHeaders, ...scriptResult.resHeader };
              statusCode = scriptResult.httpCode;
              delay = scriptResult.delay;
              parsedMockData = scriptResult.body || parsedMockData;
            }
          } catch (error) {
            logger.error({ error, projectId: project._id }, 'Project mock script execution error');
          }
        }

        if (interfaceData.res_body_type === 'json') {
          responseData = JSON.stringify(parsedMockData, null, 2);
        } else {
          responseData = parsedMockData;
        }
      } catch (error) {
        logger.error({ error, interfaceId: interfaceData._id }, 'Mock data generation error');
        ctx.status = 500;
        ctx.body = { error: 'Failed to generate mock data' };
        return;
      }
    }

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    ctx.status = statusCode;
    ctx.set('Content-Type', 'application/json');
    for (const [key, value] of Object.entries(responseHeaders)) {
      ctx.set(key, value);
    }
    ctx.body = responseData;
  } catch (error) {
    logger.error({ error, path: ctx.path }, 'Mock server error');
    ctx.status = 500;
    ctx.body = { error: 'Internal server error' };
  }
};

const matchesExpectation = (ctx, expectation) => {
  if (expectation.ip_filter && ctx.ip !== expectation.ip_filter) {
    return false;
  }

  if (expectation.query_filter && Object.keys(expectation.query_filter).length > 0) {
    for (const [key, value] of Object.entries(expectation.query_filter)) {
      if (ctx.query[key] !== value) {
        return false;
      }
    }
  }

  if (expectation.body_filter && Object.keys(expectation.body_filter).length > 0) {
    const body = ctx.request.body || {};
    for (const [key, value] of Object.entries(expectation.body_filter)) {
      if (body[key] !== value) {
        return false;
      }
    }
  }

  return true;
};

const validateMockRequest = (ctx, interfaceData) => {
  const query = ctx.query;
  const body = ctx.request.body || {};

  for (const param of interfaceData.req_query || []) {
    if (param.required && !query[param.name]) {
      return {
        valid: false,
        message: `Missing required query parameter: ${param.name}`,
      };
    }
  }

  if (interfaceData.req_body_type === 'form') {
    for (const param of interfaceData.req_body_form || []) {
      if (param.required && !body[param.name]) {
        return {
          valid: false,
          message: `Missing required form parameter: ${param.name}`,
        };
      }
    }
  }

  return { valid: true };
};

const replaceVariables = (data, ctx) => {
  if (typeof data === 'string') {
    return data
      .replace(/\$\{query\.(\w+)\}/g, (match, key) => ctx.query[key] || match)
      .replace(/\$\{body\.(\w+)\}/g, (match, key) => {
        const body = ctx.request.body || {};
        return body[key] || match;
      })
      .replace(/\$\{header\.(\w+)\}/g, (match, key) => ctx.headers[key.toLowerCase()] || match);
  }

  if (Array.isArray(data)) {
    return data.map((item) => replaceVariables(item, ctx));
  }

  if (data && typeof data === 'object') {
    const result = {};
    for (const key in data) {
      result[key] = replaceVariables(data[key], ctx);
    }
    return result;
  }

  return data;
};

