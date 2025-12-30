import { VM } from 'vm2';
import axios from 'axios';
import Mock from 'mockjs';
import { logger } from './logger.js';
import TestCase from '../Models/TestCase.js';
import Interface from '../Models/Interface.js';
import Project from '../Models/Project.js';

export class TestRunner {
  constructor(context = {}) {
    this.context = context;
    this.records = [];
  }

  async runTestCase(testCase, environment = {}, testCollection = null) {
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

      const env = project.env.find((e) => e.name === environment.name || e.name === 'default') || project.env[0] || {};
      const baseUrl = env.host || '';

      let requestPath = testCase.request.path;
      const pathParams = this.resolveVariables(testCase.request.path_params || {}, this.records);
      Object.keys(pathParams).forEach((key) => {
        requestPath = requestPath.replace(`{${key}}`, pathParams[key]);
      });

      const url = `${baseUrl}${requestPath}`;
      const query = this.resolveVariables(testCase.request.query || {}, this.records);
      const body = this.resolveVariables(testCase.request.body || {}, this.records);
      const headers = this.resolveVariables(testCase.request.headers || {}, this.records);

      if (testCollection) {
        await executeBeforeTestHook(testCollection, testCase);
      }

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
      });

      const duration = Date.now() - startTime;

      result.response = {
        statusCode: response.status,
        headers: response.headers,
        body: response.data,
        duration,
      };

      result.duration = duration;

      const record = {
        key: testCase._id.toString(),
        request: result.request,
        response: result.response,
      };
      this.records.push(record);

      if (testCase.assertion_script && testCase.assertion_script.trim()) {
        result.assertionResult = await this.executeAssertions(
          testCase.assertion_script,
          result.response,
          result.request
        );
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

  async runTestCollection(collectionId, environment = {}) {
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

    const results = [];
    const startTime = Date.now();

    for (const testCase of testCases) {
      const result = await this.runTestCase(testCase, environment);
      results.push({
        ...result,
        testCaseName: testCase.name,
        testCaseId: testCase._id,
      });
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

      const vm = new VM({
        timeout: 10000,
        sandbox,
        eval: false,
        wasm: false,
      });

      const wrappedScript = `
        (function() {
          try {
            ${script}
            return { passed: true, message: 'All assertions passed' };
          } catch (error) {
            return { passed: false, message: error.message, errors: [error.message] };
          }
        })();
      `;

      const result = vm.run(wrappedScript);

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

