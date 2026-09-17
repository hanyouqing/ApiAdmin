import axios from 'axios';
import vm from 'node:vm';
import Mock from './safeMock.js';
import { logger } from './logger.js';
import { assertSafeOutboundUrl } from './security.js';
import TestCase from '../Models/TestCase.js';
import Interface from '../Models/Interface.js';
import Project from '../Models/Project.js';
import { createPmSandbox, runScript, deepResolveTemplates } from './scriptSandbox.js';
import { executeBeforeTestHook, executeAfterTestHook } from '../Middleware/pluginHook.js';
import { resolveEnvironmentContext, loadProjectGlobals } from './variableResolver.js';

export class TestRunner {
  constructor(context = {}) {
    this.context = context;
    this.records = [];
    this.variables = { ...(context.variables || {}) };
    this.globals = { ...(context.globals || {}) };
  }

  async runTestCase(testCase, environment = {}, testCollection = null, iterationData = {}) {
    const startTime = Date.now();
    let result = {
      testCaseId: testCase._id,
      status: 'running',
      request: null,
      response: null,
      assertionResult: null,
      error: null,
      duration: 0,
    };

    try {
      const interfaceData = await Interface.findById(testCase.interface_id);
      if (!interfaceData) {
        throw new Error('Interface not found');
      }

      const project = await Project.findById(interfaceData.project_id);
      if (!project) {
        throw new Error('Project not found');
      }

      if (!Object.keys(this.globals).length) {
        Object.assign(this.globals, await loadProjectGlobals(project._id));
      }

      const resolved = await resolveEnvironmentContext(project._id, environment);
      const envMap = { ...resolved.envMap };
      let templateEnv = { ...resolved.globals, ...this.globals, ...envMap };
      const baseUrl = resolved.baseUrl || environment.base_url || environment.host || '';

      let requestPath = testCase.request.path;
      let query = { ...(testCase.request.query || {}) };
      let body = testCase.request.body || {};
      let headers = { ...(testCase.request.headers || {}) };
      let pathParams = { ...(testCase.request.path_params || {}) };

      const mutableRequest = {
        url: '',
        method: testCase.request.method,
        headers,
        body,
        query,
        path: requestPath,
      };

      const preScript =
        testCase.pre_request_script ||
        interfaceData.pre_request_script ||
        '';
      if (preScript.trim()) {
        const sandbox = createPmSandbox({
          request: mutableRequest,
          environment: envMap,
          variables: this.variables,
          globals: this.globals,
          iterationData,
        });
        const preResult = runScript(preScript, sandbox, { name: 'pre-request' });
        if (!preResult.ok && preResult.error) {
          logger.warn({ error: preResult.error }, 'Pre-request script error');
        }
        Object.assign(envMap, sandbox.getEnvironment());
        Object.assign(this.variables, sandbox.getVariables());
        Object.assign(this.globals, sandbox.getGlobals());
        headers = mutableRequest.headers || headers;
        body = mutableRequest.body ?? body;
        query = mutableRequest.query || query;
      }

      templateEnv = { ...resolved.globals, ...this.globals, ...envMap };

      pathParams = deepResolveTemplates(
        this.resolveVariables(pathParams, this.records),
        templateEnv,
        this.variables,
        iterationData
      );
      requestPath = deepResolveTemplates(requestPath, templateEnv, this.variables, iterationData);
      Object.keys(pathParams).forEach((key) => {
        requestPath = requestPath.replace(`{${key}}`, pathParams[key]);
        requestPath = requestPath.replace(`:${key}`, pathParams[key]);
      });

      query = deepResolveTemplates(
        this.resolveVariables(query, this.records),
        templateEnv,
        this.variables,
        iterationData
      );
      body = deepResolveTemplates(
        this.resolveVariables(body, this.records),
        templateEnv,
        this.variables,
        iterationData
      );
      headers = deepResolveTemplates(
        this.resolveVariables(headers, this.records),
        templateEnv,
        this.variables,
        iterationData
      );

      if (testCollection) {
        await executeBeforeTestHook(testCollection, testCase);
      }

      const url = assertSafeOutboundUrl(`${baseUrl}${requestPath}`);
      result.request = {
        url,
        method: testCase.request.method,
        query,
        body,
        headers,
        pathParams,
      };

      const response = await axios({
        method: testCase.request.method,
        url,
        params: query,
        data: body,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        timeout: 30000,
        validateStatus: () => true,
      });

      const duration = Date.now() - startTime;

      result.response = {
        statusCode: response.status,
        headers: response.headers,
        body: response.data,
        duration,
      };

      result.duration = duration;

      this.records.push({
        key: testCase._id.toString(),
        request: result.request,
        response: result.response,
      });

      const assertionScript =
        testCase.assertion_script ||
        interfaceData.test_script ||
        '';

      if (assertionScript.trim()) {
        const sandbox = createPmSandbox({
          request: result.request,
          response: result.response,
          environment: envMap,
          variables: this.variables,
          globals: this.globals,
          iterationData,
        });
        const assertResult = runScript(assertionScript, sandbox, { name: 'test-script' });
        Object.assign(this.variables, sandbox.getVariables());
        const pmFailed = sandbox.getTests().some((t) => !t.passed);
        result.assertionResult = {
          passed: assertResult.ok && !pmFailed,
          message: assertResult.error || (assertResult.ok ? 'All assertions passed' : 'Assertion failed'),
          errors: assertResult.error ? [assertResult.error] : [],
          tests: sandbox.getTests(),
        };
        result.status = result.assertionResult.passed ? 'passed' : 'failed';
      } else {
        result.status = response.status >= 200 && response.status < 300 ? 'passed' : 'failed';
        result.assertionResult = {
          passed: result.status === 'passed',
          message: 'No assertion script',
        };
      }
    } catch (error) {
      result.status = 'error';
      result.error = {
        message: error.message,
        stack: error.stack,
      };
      result.duration = Date.now() - startTime;
    }

    await executeAfterTestHook(testCollection, testCase, result);

    return result;
  }

  async runTestCollection(collectionId, environment = {}, options = {}) {
    const TestCollection = (await import('../Models/TestCollection.js')).default;
    const collection = await TestCollection.findById(collectionId).populate('test_cases');
    
    if (!collection) {
      throw new Error('Test collection not found');
    }

    const testCases = await TestCase.find({
      collection_id: collectionId,
      enabled: true,
    })
      .sort({ order: 1 })
      .populate('interface_id');

    const iterations = Array.isArray(options.iteration_data) && options.iteration_data.length
      ? options.iteration_data
      : [{}];

    const results = [];
    const startTime = Date.now();

    for (let iter = 0; iter < iterations.length; iter++) {
      const iterationData = iterations[iter] || {};
      for (const testCase of testCases) {
        const result = await this.runTestCase(testCase, environment, collection, iterationData);
        results.push({
          ...result,
          testCaseName: testCase.name,
          testCaseId: testCase._id,
          iteration: iter,
          iterationData,
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const passed = results.filter((r) => r.status === 'passed').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const errors = results.filter((r) => r.status === 'error').length;

    return {
      collectionId,
      collectionName: collection.name,
      total: results.length,
      passed,
      failed,
      errors,
      duration: totalDuration,
      results,
      iterations: iterations.length,
      runAt: new Date(),
    };
  }

  resolveVariables(data, records) {
    if (typeof data === 'string') {
      return this.resolveVariableExpression(data, records);
    } else if (Array.isArray(data)) {
      return data.map((item) => this.resolveVariables(item, records));
    } else if (data && typeof data === 'object') {
      const resolved = {};
      for (const [key, value] of Object.entries(data)) {
        resolved[key] = this.resolveVariables(value, records);
      }
      return resolved;
    }
    return data;
  }

  resolveVariableExpression(expression, records) {
    if (typeof expression !== 'string') {
      return expression;
    }

    const variablePattern = /\$\.(\w+)\.(params|body|header)\.([\w.]+)/g;
    let resolved = expression;

    resolved = resolved.replace(variablePattern, (match, key, type, path) => {
      const record = records.find((r) => r.key === key);
      if (!record) {
        logger.warn({ match, key }, 'Variable record not found');
        return match;
      }

      let value;
      if (type === 'params') {
        value = this.getNestedValue(record.request.query || {}, path);
      } else if (type === 'body') {
        value = this.getNestedValue(record.response.body || {}, path);
      } else if (type === 'header') {
        value = this.getNestedValue(record.response.headers || {}, path);
      }

      return value !== undefined ? value : match;
    });

    if (resolved.includes('@')) {
      try {
        resolved = Mock.mock(resolved);
      } catch (error) {
        logger.warn({ error, expression }, 'Mock.js parsing failed');
      }
    }

    try {
      if (resolved.startsWith('{') || resolved.startsWith('[')) {
        return JSON.parse(resolved);
      }
    } catch (error) {
    }

    return resolved;
  }

  getNestedValue(obj, path) {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    return value;
  }

  async executeAssertions(script, response, request) {
    try {
      const sandbox = {
        assert: {
          equal: (actual, expected, message) => {
            if (actual !== expected) {
              throw new Error(message || `Expected ${expected}, but got ${actual}`);
            }
          },
          deepEqual: (actual, expected, message) => {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) {
              throw new Error(message || 'Objects are not deeply equal');
            }
          },
          ok: (value, message) => {
            if (!value) {
              throw new Error(message || 'Assertion failed');
            }
          },
          notEqual: (actual, expected, message) => {
            if (actual === expected) {
              throw new Error(message || `Expected not ${expected}, but got ${actual}`);
            }
          },
        },
        status: response.statusCode,
        params: request.query || {},
        body: response.body,
        header: response.headers,
        records: this.records,
        log: (...args) => logger.info({ testAssertion: true }, ...args),
        console: {
          log: (...args) => logger.info({ testAssertion: true }, ...args),
          error: (...args) => logger.error({ testAssertion: true }, ...args),
          warn: (...args) => logger.warn({ testAssertion: true }, ...args),
        },
      };

      const contextified = vm.createContext(sandbox, {
        name: 'ApiAdminTestAssertion',
        codeGeneration: { strings: false, wasm: false },
      });

      const wrappedScript = `
        (function() {
          "use strict";
          try {
            ${script}
            return { passed: true, message: 'All assertions passed' };
          } catch (error) {
            return { passed: false, message: error.message, errors: [error.message] };
          }
        })();
      `;

      const result = vm.runInContext(wrappedScript, contextified, {
        timeout: 10000,
        displayErrors: true,
        breakOnSigint: true,
      });

      return {
        passed: result.passed || false,
        message: result.message || 'Assertion completed',
        errors: result.errors || [],
      };
    } catch (error) {
      logger.error({ error, script: script.substring(0, 100) }, 'Assertion script execution error');
      return {
        passed: false,
        message: `Assertion script execution failed: ${error.message}`,
        errors: [error.message],
      };
    }
  }
}

