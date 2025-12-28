import { VM } from 'vm2';
import Mock from 'mockjs';
import { logger } from './logger.js';

export const executeMockScript = async (script, context) => {
  if (!script || script.trim() === '') {
    return null;
  }

  try {
    const sandbox = {
      header: context.header || {},
      params: context.params || {},
      cookie: context.cookie || {},
      mockJson: JSON.parse(JSON.stringify(context.mockJson || {})),
      resHeader: { ...(context.resHeader || {}) },
      httpCode: context.httpCode || 200,
      delay: context.delay || 0,
      Random: Mock.Random,
      console: {
        log: (...args) => logger.info({ mockScript: true }, ...args),
        error: (...args) => logger.error({ mockScript: true }, ...args),
        warn: (...args) => logger.warn({ mockScript: true }, ...args),
      },
      setTimeout: (fn, delay) => {
        return setTimeout(fn, Math.min(delay, 5000));
      },
      Promise: Promise,
    };

    const vm = new VM({
      timeout: 5000,
      sandbox,
      eval: false,
      wasm: false,
    });

    const wrappedScript = `
      (async function() {
        ${script}
        return {
          resHeader: resHeader,
          httpCode: httpCode,
          delay: delay,
          body: mockJson
        };
      })();
    `;

    const result = await vm.run(wrappedScript);

    if (result && typeof result === 'object') {
      return {
        resHeader: result.resHeader || sandbox.resHeader,
        httpCode: result.httpCode || sandbox.httpCode,
        delay: result.delay || sandbox.delay,
        body: result.body || sandbox.mockJson,
      };
    }

    return {
      resHeader: sandbox.resHeader,
      httpCode: sandbox.httpCode,
      delay: sandbox.delay,
      body: sandbox.mockJson,
    };
  } catch (error) {
    logger.error({ error, script: script.substring(0, 100) }, 'Mock script execution error');
    throw new Error(`Mock script execution failed: ${error.message}`);
  }
};

export const validateMockScript = (script) => {
  if (!script || script.trim() === '') {
    return { valid: true };
  }

  const forbiddenPatterns = [
    /require\s*\(/,
    /import\s+/,
    /process\./,
    /global\./,
    /__dirname/,
    /__filename/,
    /eval\s*\(/,
    /Function\s*\(/,
    /setInterval\s*\(/,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(script)) {
      return {
        valid: false,
        message: `Script contains forbidden pattern: ${pattern}`,
      };
    }
  }

  try {
    const vm = new VM({
      timeout: 100,
      sandbox: {
        mockJson: {},
        resHeader: {},
        httpCode: 200,
        delay: 0,
        header: {},
        params: {},
        cookie: {},
      },
      eval: false,
      wasm: false,
    });
    vm.run(`(function() { ${script} })()`);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      message: `Script syntax error: ${error.message}`,
    };
  }
};

