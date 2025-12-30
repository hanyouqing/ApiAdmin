import Mock from 'mockjs';
import JSON5 from 'json5';
import { logger } from './logger.js';

/**
 * 测试用例生成器
 * 用于为导入的接口自动生成测试用例
 */
export class TestCaseGenerator {
  constructor(options = {}) {
    this.strategy = options.strategy || 'mock';
    this.assertionTemplate = options.assertionTemplate || null;
    this.timeout = options.timeout || 30000;
  }

  /**
   * 为接口生成测试用例
   * @param {Object} interfaceData - 接口数据
   * @param {Object} options - 生成选项
   * @returns {Array} 测试用例数组
   */
  async generateTestCases(interfaceData, options = {}) {
    const testCases = [];
    const method = interfaceData.method?.toUpperCase();

    try {
      switch (method) {
        case 'GET':
          testCases.push(...this.generateGETTestCases(interfaceData, options));
          break;
        case 'POST':
          testCases.push(...this.generatePOSTTestCases(interfaceData, options));
          break;
        case 'PUT':
          testCases.push(...this.generatePUTTestCases(interfaceData, options));
          break;
        case 'DELETE':
          testCases.push(...this.generateDELETETestCases(interfaceData, options));
          break;
        case 'PATCH':
          testCases.push(...this.generatePATCHTestCases(interfaceData, options));
          break;
        default:
          testCases.push(...this.generateBasicTestCases(interfaceData, options));
      }
    } catch (error) {
      logger.error({ error, interfaceId: interfaceData._id }, 'Generate test cases error');
    }

    return testCases;
  }

  /**
   * 生成 GET 接口测试用例
   */
  generateGETTestCases(interfaceData, options) {
    const testCases = [];
    const title = interfaceData.title || interfaceData.path;

    // 1. 参数验证测试用例
    if (interfaceData.req_query && interfaceData.req_query.length > 0) {
      const requiredParams = interfaceData.req_query.filter(p => p.required);
      if (requiredParams.length > 0) {
        testCases.push({
          name: `${title} - 必填参数验证`,
          description: '验证必填参数缺失时的错误处理',
          type: 'parameter-validation',
          request: {
            method: 'GET',
            path: interfaceData.path,
            query: this.generateQueryParams(interfaceData.req_query, { includeRequired: false }),
            headers: this.generateHeaders(interfaceData.req_headers),
            path_params: {},
          },
          assertion_script: this.generateParameterValidationAssertion(requiredParams),
        });
      }

      // 参数类型验证
      testCases.push({
        name: `${title} - 参数类型验证`,
        description: '验证参数类型正确性',
        type: 'parameter-type-validation',
        request: {
          method: 'GET',
          path: interfaceData.path,
          query: this.generateQueryParams(interfaceData.req_query, { useInvalidTypes: true }),
          headers: this.generateHeaders(interfaceData.req_headers),
          path_params: {},
        },
        assertion_script: this.generateTypeValidationAssertion(),
      });
    }

    // 2. 正常请求测试用例
    testCases.push({
      name: `${title} - 正常请求`,
      description: '验证正常请求的响应',
      type: 'success',
      request: {
        method: 'GET',
        path: interfaceData.path,
        query: this.generateQueryParams(interfaceData.req_query),
        headers: this.generateHeaders(interfaceData.req_headers),
        path_params: this.generatePathParams(interfaceData.path),
      },
      assertion_script: this.generateResponseAssertion(interfaceData),
    });

    // 3. 响应格式验证
    if (interfaceData.res_body && interfaceData.res_body_type === 'json') {
      testCases.push({
        name: `${title} - 响应格式验证`,
        description: '验证响应数据格式符合定义',
        type: 'response-validation',
        request: {
          method: 'GET',
          path: interfaceData.path,
          query: this.generateQueryParams(interfaceData.req_query),
          headers: this.generateHeaders(interfaceData.req_headers),
          path_params: this.generatePathParams(interfaceData.path),
        },
        assertion_script: this.generateSchemaAssertion(interfaceData.res_body),
      });
    }

    return testCases;
  }

  /**
   * 生成 POST 接口测试用例
   */
  generatePOSTTestCases(interfaceData, options) {
    const testCases = [];
    const title = interfaceData.title || interfaceData.path;

    // 1. 请求体验证
    if (interfaceData.req_body_type === 'json' && interfaceData.req_body) {
      testCases.push({
        name: `${title} - 请求体验证`,
        description: '验证请求体格式正确性',
        type: 'request-validation',
        request: {
          method: 'POST',
          path: interfaceData.path,
          query: this.generateQueryParams(interfaceData.req_query),
          headers: this.generateHeaders(interfaceData.req_headers),
          body: this.generateRequestBody(interfaceData, { useInvalidData: true }),
          path_params: this.generatePathParams(interfaceData.path),
        },
        assertion_script: this.generateRequestValidationAssertion(),
      });
    }

    // 2. 创建成功用例
    testCases.push({
      name: `${title} - 创建成功`,
      description: '验证创建操作成功',
      type: 'success',
      request: {
        method: 'POST',
        path: interfaceData.path,
        query: this.generateQueryParams(interfaceData.req_query),
        headers: this.generateHeaders(interfaceData.req_headers),
        body: this.generateRequestBody(interfaceData),
        path_params: this.generatePathParams(interfaceData.path),
      },
      assertion_script: this.generateCreateSuccessAssertion(interfaceData),
    });

    // 3. 必填字段验证
    if (interfaceData.req_body_type === 'form' && interfaceData.req_body_form) {
      const requiredFields = interfaceData.req_body_form.filter(f => f.required);
      if (requiredFields.length > 0) {
        testCases.push({
          name: `${title} - 必填字段验证`,
          description: '验证必填字段缺失时的错误处理',
          type: 'required-field-validation',
          request: {
            method: 'POST',
            path: interfaceData.path,
            query: this.generateQueryParams(interfaceData.req_query),
            headers: this.generateHeaders(interfaceData.req_headers),
            body: this.generateFormBody(interfaceData.req_body_form, { includeRequired: false }),
            path_params: this.generatePathParams(interfaceData.path),
          },
          assertion_script: this.generateRequiredFieldAssertion(requiredFields),
        });
      }
    }

    return testCases;
  }

  /**
   * 生成 PUT 接口测试用例
   */
  generatePUTTestCases(interfaceData, options) {
    const testCases = [];
    const title = interfaceData.title || interfaceData.path;

    // 1. 更新成功用例
    testCases.push({
      name: `${title} - 更新成功`,
      description: '验证更新操作成功',
      type: 'success',
      request: {
        method: 'PUT',
        path: interfaceData.path,
        query: this.generateQueryParams(interfaceData.req_query),
        headers: this.generateHeaders(interfaceData.req_headers),
        body: this.generateRequestBody(interfaceData),
        path_params: this.generatePathParams(interfaceData.path),
      },
      assertion_script: this.generateUpdateSuccessAssertion(interfaceData),
    });

    // 2. 资源不存在用例
    testCases.push({
      name: `${title} - 资源不存在`,
      description: '验证更新不存在的资源时的错误处理',
      type: 'not-found',
      request: {
        method: 'PUT',
        path: interfaceData.path,
        query: this.generateQueryParams(interfaceData.req_query),
        headers: this.generateHeaders(interfaceData.req_headers),
        body: this.generateRequestBody(interfaceData),
        path_params: this.generatePathParams(interfaceData.path, { useInvalidId: true }),
      },
      assertion_script: this.generateNotFoundAssertion(),
    });

    return testCases;
  }

  /**
   * 生成 DELETE 接口测试用例
   */
  generateDELETETestCases(interfaceData, options) {
    const testCases = [];
    const title = interfaceData.title || interfaceData.path;

    // 1. 删除成功用例
    testCases.push({
      name: `${title} - 删除成功`,
      description: '验证删除操作成功',
      type: 'success',
      request: {
        method: 'DELETE',
        path: interfaceData.path,
        query: this.generateQueryParams(interfaceData.req_query),
        headers: this.generateHeaders(interfaceData.req_headers),
        path_params: this.generatePathParams(interfaceData.path),
      },
      assertion_script: this.generateDeleteSuccessAssertion(),
    });

    // 2. 资源不存在用例
    testCases.push({
      name: `${title} - 资源不存在`,
      description: '验证删除不存在的资源时的错误处理',
      type: 'not-found',
      request: {
        method: 'DELETE',
        path: interfaceData.path,
        query: this.generateQueryParams(interfaceData.req_query),
        headers: this.generateHeaders(interfaceData.req_headers),
        path_params: this.generatePathParams(interfaceData.path, { useInvalidId: true }),
      },
      assertion_script: this.generateNotFoundAssertion(),
    });

    return testCases;
  }

  /**
   * 生成 PATCH 接口测试用例
   */
  generatePATCHTestCases(interfaceData, options) {
    return this.generatePUTTestCases(interfaceData, options);
  }

  /**
   * 生成基础测试用例（通用）
   */
  generateBasicTestCases(interfaceData, options) {
    const testCases = [];
    const title = interfaceData.title || interfaceData.path;

    testCases.push({
      name: `${title} - 基础测试`,
      description: '基础接口测试',
      type: 'basic',
      request: {
        method: interfaceData.method,
        path: interfaceData.path,
        query: this.generateQueryParams(interfaceData.req_query),
        headers: this.generateHeaders(interfaceData.req_headers),
        body: this.generateRequestBody(interfaceData),
        path_params: this.generatePathParams(interfaceData.path),
      },
      assertion_script: this.generateBasicAssertion(),
    });

    return testCases;
  }

  /**
   * 生成查询参数
   */
  generateQueryParams(reqQuery, options = {}) {
    if (!reqQuery || reqQuery.length === 0) {
      return {};
    }

    const params = {};
    for (const param of reqQuery) {
      if (options.includeRequired === false && param.required) {
        continue;
      }

      if (options.useInvalidTypes && param.type) {
        params[param.name] = this.generateInvalidValue(param.type);
      } else {
        params[param.name] = this.generateParamValue(param);
      }
    }

    return params;
  }

  /**
   * 生成请求头
   */
  generateHeaders(reqHeaders) {
    if (!reqHeaders || reqHeaders.length === 0) {
      return {};
    }

    const headers = {};
    for (const header of reqHeaders) {
      if (header.required && header.value) {
        headers[header.name] = header.value;
      }
    }

    return headers;
  }

  /**
   * 生成路径参数
   */
  generatePathParams(path, options = {}) {
    if (!path) {
      return {};
    }

    const params = {};
    const pathParamRegex = /\{(\w+)\}/g;
    let match;
    const usedParams = new Set();

    while ((match = pathParamRegex.exec(path)) !== null) {
      const paramName = match[1];
      if (usedParams.has(paramName)) {
        continue;
      }
      usedParams.add(paramName);

      if (options.useInvalidId) {
        params[paramName] = 'invalid-id-999999';
      } else {
        const paramType = this.inferPathParamType(paramName);
        params[paramName] = this.generatePathParamValue(paramType, paramName);
      }
    }

    return params;
  }

  /**
   * 推断路径参数类型
   */
  inferPathParamType(paramName) {
    const name = paramName.toLowerCase();
    if (name.includes('id')) {
      return 'id';
    } else if (name.includes('uuid')) {
      return 'uuid';
    } else if (name.includes('slug')) {
      return 'slug';
    }
    return 'string';
  }

  /**
   * 生成路径参数值
   */
  generatePathParamValue(type, paramName) {
    switch (type) {
      case 'id':
        return Mock.Random.integer(1, 10000).toString();
      case 'uuid':
        return Mock.Random.guid();
      case 'slug':
        return Mock.Random.word().toLowerCase();
      default:
        return Mock.Random.string(5, 10);
    }
  }

  /**
   * 生成请求体
   */
  generateRequestBody(interfaceData, options = {}) {
    if (interfaceData.req_body_type === 'form') {
      return this.generateFormBody(interfaceData.req_body_form, options);
    } else if (interfaceData.req_body_type === 'json' && interfaceData.req_body) {
      return this.generateJsonBody(interfaceData.req_body, options);
    } else if (interfaceData.req_body_type === 'file') {
      return null;
    }

    return null;
  }

  /**
   * 生成表单请求体
   */
  generateFormBody(reqBodyForm, options = {}) {
    if (!reqBodyForm || reqBodyForm.length === 0) {
      return {};
    }

    const body = {};
    for (const field of reqBodyForm) {
      if (options.includeRequired === false && field.required) {
        continue;
      }

      if (field.default) {
        body[field.name] = field.default;
      } else {
        body[field.name] = this.generateFieldValue(field);
      }
    }

    return body;
  }

  /**
   * 生成 JSON 请求体
   */
  generateJsonBody(reqBody, options = {}) {
    try {
      let parsedBody;
      try {
        parsedBody = JSON5.parse(reqBody);
      } catch (e) {
        parsedBody = JSON.parse(reqBody);
      }

      if (options.useInvalidData) {
        return this.generateInvalidJsonData(parsedBody);
      }

      return this.generateDataFromTemplate(parsedBody);
    } catch (error) {
      logger.warn({ error }, 'Failed to parse request body');
      return {};
    }
  }

  /**
   * 从模板生成数据（支持 Mockjs）
   */
  generateDataFromTemplate(template) {
    try {
      if (typeof template === 'object' && template !== null) {
        const mockData = Mock.mock(template);
        return mockData;
      }
      return template;
    } catch (error) {
      logger.warn({ error }, 'Failed to generate data from template');
      return template;
    }
  }

  /**
   * 生成参数值
   */
  generateParamValue(param) {
    if (param.example) {
      return param.example;
    }

    if (param.default) {
      return param.default;
    }

    return this.generateValueByType(param.type);
  }

  /**
   * 生成字段值
   */
  generateFieldValue(field) {
    if (field.example) {
      return field.example;
    }

    if (field.default) {
      return field.default;
    }

    return this.generateValueByType(field.type);
  }

  /**
   * 根据类型生成值
   */
  generateValueByType(type) {
    switch (type?.toLowerCase()) {
      case 'string':
        return Mock.Random.string(5, 10);
      case 'number':
      case 'integer':
        return Mock.Random.integer(1, 100);
      case 'boolean':
        return Mock.Random.boolean();
      case 'array':
        return [];
      case 'object':
        return {};
      case 'email':
        return Mock.Random.email();
      case 'url':
        return Mock.Random.url();
      case 'date':
        return Mock.Random.date();
      default:
        return Mock.Random.string(5, 10);
    }
  }

  /**
   * 生成无效值（用于类型验证测试）
   */
  generateInvalidValue(type) {
    switch (type?.toLowerCase()) {
      case 'string':
        return 123;
      case 'number':
      case 'integer':
        return 'invalid-number';
      case 'boolean':
        return 'invalid-boolean';
      default:
        return null;
    }
  }

  /**
   * 生成无效的 JSON 数据
   */
  generateInvalidJsonData(template) {
    if (typeof template === 'object' && template !== null) {
      const invalid = {};
      for (const key in template) {
        if (typeof template[key] === 'string') {
          invalid[key] = 123;
        } else if (typeof template[key] === 'number') {
          invalid[key] = 'invalid';
        } else {
          invalid[key] = template[key];
        }
      }
      return invalid;
    }
    return template;
  }

  /**
   * 生成参数验证断言
   */
  generateParameterValidationAssertion(requiredParams) {
    const paramNames = requiredParams.map(p => p.name).join(', ');
    return `
      assert(status >= 400 && status < 500, 'Expected 4xx error for missing required parameters: ${paramNames}');
      assert(body !== null, 'Response body should not be null');
      if (typeof body === 'object' && body.message) {
        log('Error message: ' + body.message);
      }
    `;
  }

  /**
   * 生成类型验证断言
   */
  generateTypeValidationAssertion() {
    return `
      assert(status >= 400 && status < 500, 'Expected 4xx error for invalid parameter types');
      assert(body !== null, 'Response body should not be null');
    `;
  }

  /**
   * 生成响应断言
   */
  generateResponseAssertion(interfaceData) {
    const expectedStatus = this.getExpectedStatus(interfaceData);
    return `
      assert.equal(status, ${expectedStatus}, 'Expected status code ${expectedStatus}');
      assert(body !== null, 'Response body should not be null');
      if (typeof body === 'object') {
        log('Response data: ' + JSON.stringify(body).substring(0, 200));
      }
    `;
  }

  /**
   * 生成 Schema 断言
   */
  generateSchemaAssertion(resBody) {
    try {
      let schema;
      try {
        schema = JSON5.parse(resBody);
      } catch (e) {
        schema = JSON.parse(resBody);
      }

      const assertions = this.generateSchemaAssertions(schema, 'body');
      return `
        assert.equal(status, 200, 'Expected status code 200');
        assert(body !== null, 'Response body should not be null');
        ${assertions}
      `;
    } catch (error) {
      logger.warn({ error }, 'Failed to generate schema assertion');
      return `
        assert.equal(status, 200, 'Expected status code 200');
        assert(body !== null, 'Response body should not be null');
      `;
    }
  }

  /**
   * 生成 Schema 断言（递归）
   */
  generateSchemaAssertions(schema, path) {
    if (typeof schema !== 'object' || schema === null) {
      return '';
    }

    const assertions = [];
    for (const key in schema) {
      const value = schema[key];
      const currentPath = path === 'body' ? `body.${key}` : `${path}.${key}`;

      if (Array.isArray(value)) {
        assertions.push(`assert(Array.isArray(${currentPath}), '${currentPath} should be an array');`);
        if (value.length > 0 && typeof value[0] === 'object') {
          assertions.push(...this.generateSchemaAssertions(value[0], `${currentPath}[0]`).split('\n').filter(s => s.trim()));
        }
      } else if (typeof value === 'object' && value !== null) {
        assertions.push(`assert(typeof ${currentPath} === 'object' && ${currentPath} !== null, '${currentPath} should be an object');`);
        assertions.push(...this.generateSchemaAssertions(value, currentPath).split('\n').filter(s => s.trim()));
      } else {
        const expectedType = typeof value === 'string' ? 'string' : typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'object';
        assertions.push(`assert(typeof ${currentPath} === '${expectedType}', '${currentPath} should be ${expectedType}');`);
      }
    }

    return assertions.join('\n      ');
  }

  /**
   * 生成请求体验证断言
   */
  generateRequestValidationAssertion() {
    return `
      assert(status >= 400 && status < 500, 'Expected 4xx error for invalid request body');
      assert(body !== null, 'Response body should not be null');
    `;
  }

  /**
   * 生成创建成功断言
   */
  generateCreateSuccessAssertion(interfaceData) {
    const expectedStatus = this.getExpectedStatus(interfaceData, 'POST');
    return `
      assert.equal(status, ${expectedStatus}, 'Expected status code ${expectedStatus}');
      assert(body !== null, 'Response body should not be null');
      if (typeof body === 'object' && body.id) {
        log('Created resource ID: ' + body.id);
      }
    `;
  }

  /**
   * 生成更新成功断言
   */
  generateUpdateSuccessAssertion(interfaceData) {
    const expectedStatus = this.getExpectedStatus(interfaceData, 'PUT');
    return `
      assert.equal(status, ${expectedStatus}, 'Expected status code ${expectedStatus}');
      assert(body !== null, 'Response body should not be null');
    `;
  }

  /**
   * 生成删除成功断言
   */
  generateDeleteSuccessAssertion() {
    return `
      assert(status >= 200 && status < 300, 'Expected 2xx status code for successful deletion');
      log('Resource deleted successfully');
    `;
  }

  /**
   * 生成必填字段断言
   */
  generateRequiredFieldAssertion(requiredFields) {
    const fieldNames = requiredFields.map(f => f.name).join(', ');
    return `
      assert(status >= 400 && status < 500, 'Expected 4xx error for missing required fields: ${fieldNames}');
      assert(body !== null, 'Response body should not be null');
      if (typeof body === 'object' && body.message) {
        log('Error message: ' + body.message);
      }
    `;
  }

  /**
   * 生成资源不存在断言
   */
  generateNotFoundAssertion() {
    return `
      assert.equal(status, 404, 'Expected 404 status code for non-existent resource');
      assert(body !== null, 'Response body should not be null');
    `;
  }

  /**
   * 生成基础断言
   */
  generateBasicAssertion() {
    return `
      assert(status >= 200 && status < 500, 'Expected valid status code');
      assert(body !== null, 'Response body should not be null');
    `;
  }

  /**
   * 获取期望的状态码
   */
  getExpectedStatus(interfaceData, method = null) {
    const m = method || interfaceData.method?.toUpperCase();
    switch (m) {
      case 'GET':
        return 200;
      case 'POST':
        return 201;
      case 'PUT':
      case 'PATCH':
        return 200;
      case 'DELETE':
        return 200;
      default:
        return 200;
    }
  }
}

