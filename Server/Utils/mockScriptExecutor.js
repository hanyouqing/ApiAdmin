import vm from 'node:vm';
import Mock from './safeMock.js';
import { logger } from './logger.js';

function isMockScriptAllowed() {
  if (process.env.ALLOW_MOCK_SCRIPTS === 'false') {
    return false;
  }
  // Production: custom scripts are off unless explicitly opted in.
  // Node vm is not a security boundary; treat this as an emergency escape hatch only.
  if (process.env.NODE_ENV === 'production') {
    return process.env.ALLOW_MOCK_SCRIPTS === 'true' && process.env.ALLOW_UNSAFE_MOCK_SCRIPTS === 'true';
  }
  return process.env.ALLOW_MOCK_SCRIPTS !== 'false';
}

function createSandbox(context) {
  return {
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
  };
}

export const executeMockScript = async (script, context) => {
  if (!script || script.trim() === '') {
    return null;
  }

  if (!isMockScriptAllowed()) {
    logger.warn(
      { production: process.env.NODE_ENV === 'production' },
      'Mock script execution skipped (disabled for production safety)'
    );
    return null;
  }

  try {
    const sandbox = createSandbox(context);
    const contextified = vm.createContext(sandbox, {
      name: 'ApiAdminMockScript',
      codeGeneration: { strings: false, wasm: false },
    });

    const wrappedScript = `
      (function() {
        "use strict";
        ${script}
        return {
          resHeader: resHeader,
          httpCode: httpCode,
          delay: delay,
          body: mockJson
        };
      })();
    `;

    const result = vm.runInContext(wrappedScript, contextified, {
      timeout: 1000,
      displayErrors: true,
      breakOnSigint: true,
    });

    if (result && typeof result === 'object') {
      return {
        resHeader: result.resHeader || sandbox.resHeader,
        httpCode: result.httpCode || sandbox.httpCode,
        delay: Math.min(result.delay || sandbox.delay || 0, 5000),
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
    logger.error({ error: error.message, script: script.substring(0, 100) }, 'Mock script execution error');
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
    /globalThis\./,
    /__dirname/,
    /__filename/,
    /eval\s*\(/,
    /Function\s*\(/,
    /setInterval\s*\(/,
    /setTimeout\s*\(/,
    /WebAssembly/,
    /child_process/,
    /fs\./,
    /Buffer\./,
    /constructor\s*\(/,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(script)) {
      return {
        valid: false,
        message: `Script contains forbidden pattern: ${pattern}`,
      };
    }
  }

  if (!isMockScriptAllowed()) {
    return {
      valid: false,
      message: 'Custom mock scripts are disabled in this environment',
    };
  }

  try {
    const sandbox = createSandbox({});
    const contextified = vm.createContext(sandbox, {
      codeGeneration: { strings: false, wasm: false },
    });
    vm.runInContext(`(function() { "use strict"; ${script} })()`, contextified, {
      timeout: 100,
    });
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      message: `Script syntax error: ${error.message}`,
    };
  }
};
