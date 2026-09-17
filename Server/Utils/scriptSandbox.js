import vm from 'node:vm';
import { logger } from './logger.js';

/**
 * Postman-compatible-ish script sandbox for pre-request and test scripts.
 * Not a security boundary — only trusted project scripts.
 */
export function createPmSandbox({
  request = {},
  response = null,
  environment = {},
  variables = {},
  globals = {},
  iterationData = {},
} = {}) {
  const envStore = { ...environment };
  const varStore = { ...variables };
  const globalStore = { ...globals };

  const pm = {
    environment: {
      get: (key) => envStore[key],
      set: (key, value) => {
        envStore[key] = value;
      },
      unset: (key) => {
        delete envStore[key];
      },
      toObject: () => ({ ...envStore }),
    },
    variables: {
      get: (key) => varStore[key] ?? envStore[key] ?? globalStore[key] ?? iterationData[key],
      set: (key, value) => {
        varStore[key] = value;
      },
      unset: (key) => {
        delete varStore[key];
      },
      toObject: () => ({ ...varStore }),
    },
    globals: {
      get: (key) => globalStore[key],
      set: (key, value) => {
        globalStore[key] = value;
      },
      unset: (key) => {
        delete globalStore[key];
      },
      toObject: () => ({ ...globalStore }),
    },
    iterationData: {
      get: (key) => iterationData[key],
      toObject: () => ({ ...iterationData }),
    },
    request: {
      url: request.url,
      method: request.method,
      headers: request.headers || {},
      body: request.body,
      // Mutators for pre-request
      setHeader: (name, value) => {
        request.headers = request.headers || {};
        request.headers[name] = value;
      },
      removeHeader: (name) => {
        if (request.headers) delete request.headers[name];
      },
    },
    response: response
      ? {
          code: response.statusCode ?? response.status_code ?? response.status,
          status: String(response.statusCode ?? response.status_code ?? ''),
          headers: response.headers || {},
          json: () => {
            const body = response.body ?? response.data;
            if (typeof body === 'string') {
              try {
                return JSON.parse(body);
              } catch {
                return null;
              }
            }
            return body;
          },
          text: () => {
            const body = response.body ?? response.data;
            return typeof body === 'string' ? body : JSON.stringify(body);
          },
        }
      : undefined,
    test: (name, fn) => {
      try {
        fn();
        pm.__tests.push({ name, passed: true });
      } catch (error) {
        pm.__tests.push({ name, passed: false, message: error.message });
      }
    },
    expect: (actual) => ({
      to: {
        eql: (expected) => {
          if (actual !== expected) {
            throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
          }
        },
        equal: (expected) => {
          if (actual != expected) {
            throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
          }
        },
      },
    }),
    __tests: [],
  };

  return {
    pm,
    request,
    getEnvironment: () => envStore,
    getVariables: () => varStore,
    getGlobals: () => globalStore,
    getTests: () => pm.__tests,
  };
}

export function runScript(script, sandboxBundle, { timeout = 5000, name = 'ApiAdminScript' } = {}) {
  if (!script || !String(script).trim()) {
    return { ok: true, tests: [], error: null };
  }

  const { pm, request } = sandboxBundle;
  const context = {
    pm,
    request,
    console: {
      log: (...args) => logger.info({ script: name }, ...args),
      warn: (...args) => logger.warn({ script: name }, ...args),
      error: (...args) => logger.error({ script: name }, ...args),
    },
  };

  try {
    const contextified = vm.createContext(context, {
      name,
      codeGeneration: { strings: false, wasm: false },
    });
    vm.runInContext(`"use strict";\n${script}`, contextified, {
      timeout,
      displayErrors: true,
      breakOnSigint: true,
    });
    const failed = pm.__tests.filter((t) => !t.passed);
    return {
      ok: failed.length === 0,
      tests: pm.__tests,
      error: failed.length ? failed.map((t) => t.message || t.name).join('; ') : null,
    };
  } catch (error) {
    logger.error({ error: error.message, name }, 'Script execution failed');
    return { ok: false, tests: pm.__tests, error: error.message };
  }
}

export function applyEnvToString(value, env = {}, vars = {}, iteration = {}) {
  if (typeof value !== 'string') return value;
  return value.replace(/\{\{([^{}]+)\}\}/g, (_, key) => {
    const k = key.trim();
    if (Object.prototype.hasOwnProperty.call(iteration, k)) return String(iteration[k]);
    if (Object.prototype.hasOwnProperty.call(vars, k)) return String(vars[k]);
    if (Object.prototype.hasOwnProperty.call(env, k)) return String(env[k]);
    return `{{${k}}}`;
  });
}

export function deepResolveTemplates(data, env, vars, iteration) {
  if (typeof data === 'string') return applyEnvToString(data, env, vars, iteration);
  if (Array.isArray(data)) return data.map((item) => deepResolveTemplates(item, env, vars, iteration));
  if (data && typeof data === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      out[k] = deepResolveTemplates(v, env, vars, iteration);
    }
    return out;
  }
  return data;
}
