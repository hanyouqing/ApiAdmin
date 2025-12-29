import { logger } from '../logger.js';
import Interface from '../../Models/Interface.js';
import InterfaceCat from '../../Models/InterfaceCat.js';

export class SwaggerImporter {
  async import(data, options = {}) {
    const { projectId, userId, mode = 'normal' } = options;
    const spec = typeof data === 'string' ? JSON.parse(data) : data;

    if (!spec.paths) {
      throw new Error('Invalid Swagger/OpenAPI format');
    }

    const results = {
      imported: 0,
      skipped: 0,
      updated: 0,
      errors: [],
    };

    const isOpenAPI3 = spec.openapi && spec.openapi.startsWith('3');
    const paths = spec.paths || {};

    for (const [path, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method.toLowerCase())) {
          await this.importOperation(operation, path, method.toUpperCase(), projectId, userId, mode, spec, isOpenAPI3, results);
        }
      }
    }

    return results;
  }

  async importOperation(operation, path, method, projectId, userId, mode, spec, isOpenAPI3, results) {
    try {
      const existing = await Interface.findOne({
        project_id: projectId,
        path,
        method,
      });

      // 处理 parameters，可能是数组或字符串
      let parameters = operation.parameters || [];
      
      // 如果 parameters 是字符串，尝试解析
      if (typeof parameters === 'string') {
        try {
          parameters = JSON.parse(parameters);
        } catch (e) {
          logger.warn({ path, method, parameters: parameters.substring(0, 200) }, 'Failed to parse parameters as JSON, treating as empty array');
          parameters = [];
        }
      }
      
      // 确保 parameters 是数组
      if (!Array.isArray(parameters)) {
        // 如果不是数组，记录警告
        if (parameters && typeof parameters === 'object') {
          logger.warn({ path, method, parametersType: typeof parameters }, 'Parameters is not an array, converting to array');
          parameters = [parameters];
        } else {
          parameters = [];
        }
      }
      
      // 检查 parameters 数组中是否有字符串元素
      parameters = parameters.map((p) => {
        if (typeof p === 'string') {
          try {
            return JSON.parse(p);
          } catch (e) {
            logger.warn({ path, method, param: p.substring(0, 100) }, 'Failed to parse parameter element as JSON');
            return null;
          }
        }
        return p;
      }).filter((p) => p !== null);
      
      // 处理 query 参数，确保返回的是对象数组
      // parameters 应该已经是处理过的数组，直接使用
      const query = parameters
        .filter((p) => p && typeof p === 'object' && p.in === 'query')
        .map((p) => {
          // 确保所有字段都是正确的类型
          const schema = p.schema || {};
          const queryItem = {
            name: String(p.name || ''),
            type: String(schema.type || p.type || 'string'),
            required: Boolean(p.required || false),
            default: String(schema.default !== undefined ? schema.default : (p.default !== undefined ? p.default : '')),
            desc: String(p.description || p.desc || ''),
            example: String(schema.example !== undefined ? schema.example : (p.example !== undefined ? p.example : '')),
          };
          // 确保 default 和 example 值不为 undefined 或 null
          if (queryItem.default === 'undefined' || queryItem.default === 'null') {
            queryItem.default = '';
          }
          if (queryItem.example === 'undefined' || queryItem.example === 'null') {
            queryItem.example = '';
          }
          return queryItem;
        });

      const headers = parameters
        .filter((p) => p && typeof p === 'object' && p.in === 'header')
        .map((p) => ({
          name: String(p.name || ''),
          value: String(p.value || ''),
          required: Boolean(p.required || false),
          desc: String(p.description || p.desc || ''),
        }));

      let reqBody = '';
      let reqBodyType = 'json';
      let reqBodyForm = [];
      let reqBodyOther = '';
      
      if (operation.requestBody) {
        const content = operation.requestBody.content || {};
        
        if (content['application/json']) {
          reqBody = JSON.stringify(content['application/json'].schema || {}, null, 2);
          reqBodyType = 'json';
        } else if (content['application/x-www-form-urlencoded'] || content['multipart/form-data']) {
          reqBodyType = 'form';
          const schema = content['application/x-www-form-urlencoded']?.schema || content['multipart/form-data']?.schema || {};
          
          // 处理 form 数据
          if (schema.properties) {
            reqBodyForm = Object.entries(schema.properties).map(([name, prop]) => {
              const propSchema = prop.schema || prop;
              return {
                name: String(name),
                type: String(propSchema.type || 'string'),
                required: Boolean((schema.required || []).includes(name) || propSchema.required || false),
                default: String(propSchema.default !== undefined ? propSchema.default : ''),
                desc: String(propSchema.description || prop.description || ''),
              };
            });
          }
        } else {
          // 处理其他类型（raw, text, xml 等）
          const contentType = Object.keys(content)[0] || 'text/plain';
          const bodyContent = content[contentType];
          
          if (bodyContent?.schema) {
            reqBodyType = 'raw';
            reqBodyOther = JSON.stringify(bodyContent.schema, null, 2);
          } else if (bodyContent?.example) {
            reqBodyType = 'raw';
            reqBodyOther = typeof bodyContent.example === 'string' 
              ? bodyContent.example 
              : JSON.stringify(bodyContent.example, null, 2);
          }
        }
      }

      let resBody = '{}';
      const responses = operation.responses || {};
      // 尝试多个成功状态码
      const successResponse = responses['200'] || responses['201'] || responses['202'] || 
                             responses['204'] || responses['default'] || Object.values(responses)[0];
      if (successResponse) {
        const content = successResponse.content || {};
        if (content['application/json']) {
          const schema = content['application/json'].schema || {};
          resBody = JSON.stringify(schema, null, 2);
        } else if (content['application/xml']) {
          const schema = content['application/xml'].schema || {};
          resBody = JSON.stringify(schema, null, 2);
        } else if (successResponse.schema) {
          // OpenAPI 2.0 格式
          resBody = JSON.stringify(successResponse.schema, null, 2);
        }
      }

      // 确保 req_query 和 req_headers 是数组，且每个元素都是对象
      // query 应该已经是对象数组，但需要再次验证
      let safeQuery = [];
      if (Array.isArray(query)) {
        // 过滤出有效的对象
        safeQuery = query.filter((q) => q && typeof q === 'object' && q !== null);
      } else if (typeof query === 'string') {
        // 如果 query 是字符串，尝试解析
        try {
          // 首先尝试 JSON 解析
          const parsed = JSON.parse(query);
          safeQuery = Array.isArray(parsed) ? parsed.filter((q) => q && typeof q === 'object' && q !== null) : [];
        } catch (jsonError) {
          // 如果 JSON 解析失败，尝试处理 JavaScript 代码字符串
          // 这种字符串通常包含字符串拼接，如 "[\n' + ' {\n' + ..."
          try {
            // 检查是否是 JavaScript 代码字符串格式
            if (query.includes("' + '") || query.includes('" + "')) {
              // 检查字符串是否包含危险的代码
              if (query.includes('eval(') || query.includes('Function(') || query.includes('require(') || 
                  query.includes('__proto__') || query.includes('constructor')) {
                throw new Error('Unsafe string detected');
              }
              
              // 移除字符串拼接标记，然后尝试 JSON 解析
              // 不使用 new Function() 以避免 CSP 违规
              const cleanedQuery = query
                .replace(/' \+ '/g, '')
                .replace(/" \+ "/g, '')
                .trim();
              
              // 尝试将清理后的字符串解析为 JSON
              try {
                const parsed = JSON.parse(cleanedQuery);
                safeQuery = Array.isArray(parsed) ? parsed.filter((q) => q && typeof q === 'object' && q !== null) : [];
              } catch (parseError) {
                // 如果 JSON 解析仍然失败，尝试提取数组内容
                // 使用正则表达式匹配数组结构，避免使用 eval/Function
                const arrayMatch = cleanedQuery.match(/^\[[\s\S]*\]$/);
                if (arrayMatch) {
                  // 尝试提取对象内容
                  const objectMatches = cleanedQuery.match(/\{[^}]*\}/g);
                  if (objectMatches && objectMatches.length > 0) {
                    const parsedObjects = [];
                    for (const objStr of objectMatches) {
                      try {
                        const obj = JSON.parse(objStr);
                        if (obj && typeof obj === 'object') {
                          parsedObjects.push(obj);
                        }
                      } catch {
                        // 忽略无法解析的对象
                      }
                    }
                    safeQuery = parsedObjects;
                  } else {
                    safeQuery = [];
                  }
                } else {
                  throw new Error('Not a valid array format');
                }
              }
            } else {
              // 尝试其他解析方法
              throw new Error('Not a JavaScript code string');
            }
          } catch (jsError) {
            logger.warn({ 
              path, 
              method, 
              query: query.substring(0, 200),
              error: jsError.message 
            }, 'Failed to parse req_query, using empty array');
            safeQuery = [];
          }
        }
      } else {
        // query 既不是数组也不是字符串，使用空数组
        logger.warn({ path, method, queryType: typeof query }, 'Query is neither array nor string, using empty array');
        safeQuery = [];
      }
      
      // 确保每个 query 项都是正确的格式
      safeQuery = safeQuery.map((q) => {
        // 确保 q 是对象
        if (!q || typeof q !== 'object') {
          return null;
        }
        const queryItem = {
          name: String(q.name || ''),
          type: String(q.type || 'string'),
          required: Boolean(q.required || false),
          default: String(q.default !== undefined ? q.default : ''),
          desc: String(q.desc || q.description || ''),
          example: String(q.example !== undefined ? q.example : ''),
        };
        // 确保 default 和 example 值不为 undefined 或 null
        if (queryItem.default === 'undefined' || queryItem.default === 'null') {
          queryItem.default = '';
        }
        if (queryItem.example === 'undefined' || queryItem.example === 'null') {
          queryItem.example = '';
        }
        return queryItem;
      }).filter((q) => q !== null);

      // 如果 headers 是字符串，尝试解析
      let safeHeaders = [];
      if (Array.isArray(headers)) {
        safeHeaders = headers.filter((h) => h && typeof h === 'object');
      } else if (typeof headers === 'string') {
        try {
          const parsed = JSON.parse(headers);
          safeHeaders = Array.isArray(parsed) ? parsed.filter((h) => h && typeof h === 'object') : [];
        } catch (e) {
          logger.warn({ path, method, headers }, 'Failed to parse req_headers as JSON');
          safeHeaders = [];
        }
      }
      
      // 确保每个 header 项都是正确的格式
      safeHeaders = safeHeaders.map((h) => ({
        name: String(h.name || ''),
        value: String(h.value || ''),
        required: Boolean(h.required || false),
        desc: String(h.desc || h.description || ''),
      }));

      const interfaceData = {
        project_id: projectId,
        catid: null,
        title: operation.summary || operation.operationId || `${method} ${path}`,
        path,
        method,
        req_query: safeQuery,
        req_headers: safeHeaders,
        req_body_type: reqBodyType,
        req_body: reqBody,
        req_body_form: reqBodyForm,
        req_body_other: reqBodyOther,
        res_body: resBody,
        res_body_type: 'json',
        status: 'developing',
        desc: operation.description || '',
        tag: Array.isArray(operation.tags) ? operation.tags : [],
        uid: userId,
      };

      if (existing && mode === 'mergin') {
        // 合并模式：更新现有接口
        Object.assign(existing, interfaceData);
        await existing.save();
        results.updated++;
      } else if (existing && mode === 'good') {
        // 智能模式：合并更新，保留现有数据
        Object.assign(existing, {
          ...interfaceData,
          req_query: existing.req_query || interfaceData.req_query,
          req_headers: existing.req_headers || interfaceData.req_headers,
          req_body: existing.req_body || interfaceData.req_body,
          res_body: existing.res_body || interfaceData.res_body,
        });
        await existing.save();
        results.updated++;
      } else {
        if (existing && mode === 'normal') {
          results.skipped++;
          return;
        }
        const newInterface = new Interface(interfaceData);
        await newInterface.save();
        results.imported++;
      }
    } catch (error) {
      logger.error({ error, path, method }, 'Import operation error');
      results.errors.push({ path, method, error: error.message });
    }
  }
}

