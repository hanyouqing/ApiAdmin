import { logger } from '../logger.js';
import Interface from '../../Models/Interface.js';
import InterfaceCat from '../../Models/InterfaceCat.js';

export class SwaggerImporter {
  async import(data, options = {}) {
    const { projectId, userId, mode = 'normal' } = options;
    
    // 安全解析数据
    let spec;
    try {
      spec = typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
      logger.error({ error, dataType: typeof data }, 'Failed to parse Swagger data');
      throw new Error('Invalid Swagger/OpenAPI format: Failed to parse JSON data');
    }

    // 验证数据格式
    if (!spec || typeof spec !== 'object') {
      throw new Error('Invalid Swagger/OpenAPI format: Data is not an object');
    }

    if (!spec.paths) {
      logger.warn({ specKeys: Object.keys(spec) }, 'Swagger spec missing paths property');
      throw new Error('Invalid Swagger/OpenAPI format: Missing "paths" property');
    }

    const results = {
      imported: 0,
      skipped: 0,
      updated: 0,
      errors: [],
    };

    const isOpenAPI3 = spec.openapi && spec.openapi.startsWith('3');
    const paths = spec.paths || {};

    // 安全遍历路径
    try {
      for (const [path, pathItem] of Object.entries(paths)) {
        if (!pathItem || typeof pathItem !== 'object') {
          logger.warn({ path }, 'Invalid path item, skipping');
          continue;
        }
        
        for (const [method, operation] of Object.entries(pathItem)) {
          if (!['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method.toLowerCase())) {
            continue;
          }
          
          if (!operation || typeof operation !== 'object') {
            logger.warn({ path, method }, 'Invalid operation, skipping');
            continue;
          }
          
          try {
            await this.importOperation(operation, path, method.toUpperCase(), projectId, userId, mode, spec, isOpenAPI3, results);
          } catch (error) {
            logger.error({ error, path, method }, 'Failed to import operation');
            results.errors.push({ 
              path, 
              method, 
              error: error.message || 'Unknown error' 
            });
          }
        }
      }
    } catch (error) {
      logger.error({ error }, 'Error during import loop');
      throw new Error(`Import failed: ${error.message}`);
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
      // 首先记录原始类型，用于调试
      const originalParametersType = typeof operation.parameters;
      const originalParametersIsArray = Array.isArray(operation.parameters);
      logger.debug({ path, method, originalParametersType, originalParametersIsArray, hasParameters: !!operation.parameters }, 'Processing parameters');
      
      let parameters = operation.parameters || [];
      
      // 如果 parameters 是字符串，尝试解析
      if (typeof parameters === 'string') {
        try {
          parameters = JSON.parse(parameters);
        } catch (e) {
          // 如果 JSON 解析失败，尝试使用 parseArrayString 处理 JavaScript 代码字符串
          logger.warn({ path, method, parameters: parameters.substring(0, 200) }, 'Failed to parse parameters as JSON, trying parseArrayString');
          try {
            const parsed = this.parseArrayString(parameters, 'parameters', path, method);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // 如果解析成功，使用解析后的数组
              parameters = parsed;
            } else {
              parameters = [];
            }
          } catch (parseError) {
            logger.warn({ path, method, error: parseError.message }, 'Failed to parse parameters with parseArrayString, using empty array');
            parameters = [];
          }
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
          logger.warn({ path, method, paramPreview: p.substring(0, 200) }, 'Parameter element is a string, attempting to parse');
          try {
            const parsed = JSON.parse(p);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              return parsed;
            }
            // 如果解析结果是数组，尝试提取第一个对象
            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
              return parsed[0];
            }
          } catch (e) {
            // 如果 JSON 解析失败，尝试使用 parseArrayString
            try {
              const parsed = this.parseArrayString(p, 'parameter_element', path, method);
              if (Array.isArray(parsed) && parsed.length > 0) {
                logger.info({ path, method, parsedCount: parsed.length }, 'Successfully parsed parameter element using parseArrayString');
                return parsed[0]; // 返回第一个对象
              }
            } catch (parseError) {
              logger.warn({ path, method, param: p.substring(0, 100), error: parseError.message }, 'Failed to parse parameter element');
            }
          }
          return null;
        }
        // 确保返回的是对象，不是数组或其他类型
        if (p && typeof p === 'object' && !Array.isArray(p)) {
          return p;
        }
        return null;
      }).filter((p) => p !== null && typeof p === 'object' && !Array.isArray(p));
      
      // 处理 query 参数，确保返回的是对象数组
      // parameters 应该已经是处理过的数组，直接使用
      // 首先确保 parameters 中的每个元素都是对象，不是字符串
      const validParameters = parameters.filter((p) => {
        if (!p || typeof p !== 'object' || Array.isArray(p)) {
          if (typeof p === 'string') {
            logger.warn({ path, method, pPreview: p.substring(0, 100) }, 'Parameter element is a string, will be filtered out');
          }
          return false;
        }
        return true;
      });
      
      let query = validParameters
        .filter((p) => p && typeof p === 'object' && !Array.isArray(p) && p.in === 'query')
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
      
      // 最终验证：确保 query 数组中的每个元素都是对象，不是字符串
      query = query.filter((q) => {
        if (!q || typeof q !== 'object' || Array.isArray(q) || typeof q === 'string') {
          if (typeof q === 'string') {
            logger.error({ path, method, qPreview: q.substring(0, 100) }, 'Query item is a string after processing, this should not happen');
          }
          return false;
        }
        return true;
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
      
      // 确保 req_body_form 是数组，处理可能的字符串输入
      if (typeof reqBodyForm === 'string') {
        reqBodyForm = this.parseArrayString(reqBodyForm, 'req_body_form', path, method);
      } else if (!Array.isArray(reqBodyForm)) {
        logger.warn({ path, method, reqBodyFormType: typeof reqBodyForm }, 'req_body_form is not an array, using empty array');
        reqBodyForm = [];
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

      // 确保 req_query 是数组，且每个元素都是对象
      // query 应该已经是对象数组，但需要再次验证
      let safeQuery = [];
      
      // 首先检查 query 本身是否是字符串（可能是 JavaScript 代码字符串）
      if (typeof query === 'string') {
        logger.info({ path, method, queryLength: query.length }, 'Query is a string, parsing with parseArrayString');
        safeQuery = this.parseArrayString(query, 'req_query', path, method);
      } else if (Array.isArray(query)) {
        // 过滤出有效的对象，并处理可能的字符串元素
        safeQuery = query
          .map((q) => {
            // 如果元素是字符串，尝试解析
            if (typeof q === 'string') {
              logger.warn({ path, method, qLength: q.length }, 'Query element is a string, attempting to parse');
              try {
                const parsed = JSON.parse(q);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                  q = parsed;
                } else {
                  // 如果是数组，尝试使用 parseArrayString
                  const parsedArray = this.parseArrayString(q, 'req_query_item', path, method);
                  if (Array.isArray(parsedArray) && parsedArray.length > 0) {
                    q = parsedArray[0];
                  } else {
                    return null;
                  }
                }
              } catch (e) {
                // 如果不是 JSON，尝试使用 parseArrayString
                const parsedArray = this.parseArrayString(q, 'req_query_item', path, method);
                if (Array.isArray(parsedArray) && parsedArray.length > 0) {
                  q = parsedArray[0];
                } else {
                  return null;
                }
              }
            }
            // 确保 q 是对象
            if (!q || typeof q !== 'object' || Array.isArray(q)) {
              return null;
            }
            return q;
          })
          .filter((q) => q !== null && typeof q === 'object' && !Array.isArray(q));
      } else {
        // query 既不是数组也不是字符串，使用空数组
        logger.warn({ path, method, queryType: typeof query }, 'Query is neither array nor string, using empty array');
        safeQuery = [];
      }
      
      // 确保每个 query 项都是正确的格式
      safeQuery = safeQuery
        .map((q) => {
          // 如果 q 仍然是字符串，再次尝试解析
          if (typeof q === 'string') {
            logger.warn({ path, method, qPreview: q.substring(0, 200) }, 'safeQuery element is still a string, attempting to parse');
            try {
              const parsed = JSON.parse(q);
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                q = parsed;
              } else if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
                // 如果解析结果是数组，使用第一个对象
                q = parsed[0];
              } else {
                // 尝试使用 parseArrayString
                const parsedArray = this.parseArrayString(q, 'req_query_item_final', path, method);
                if (Array.isArray(parsedArray) && parsedArray.length > 0) {
                  q = parsedArray[0];
                } else {
                  return null;
                }
              }
            } catch (e) {
              // 如果不是 JSON，尝试使用 parseArrayString
              const parsedArray = this.parseArrayString(q, 'req_query_item_final', path, method);
              if (Array.isArray(parsedArray) && parsedArray.length > 0) {
                q = parsedArray[0];
              } else {
                logger.warn({ path, method, error: e.message, qPreview: q.substring(0, 100) }, 'Failed to parse safeQuery element as string');
                return null;
              }
            }
          }
          // 确保 q 是对象，不是字符串或数组
          if (!q || typeof q !== 'object' || Array.isArray(q) || typeof q === 'string') {
            if (typeof q === 'string') {
              logger.error({ path, method, qPreview: q.substring(0, 100) }, 'Query element is still a string after parsing, filtering out');
            }
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
        })
        .filter((q) => q !== null && typeof q === 'object' && !Array.isArray(q) && typeof q !== 'string');

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

      // 最终验证：确保所有数组字段都是真正的数组，且每个元素都是对象
      // 再次检查 safeQuery 和 reqBodyForm，确保它们不是字符串
      let finalQuery = [];
      if (Array.isArray(safeQuery)) {
        // 过滤并验证每个元素都是对象
        finalQuery = safeQuery
          .map((q) => {
            // 如果元素仍然是字符串，尝试解析
            if (typeof q === 'string') {
              logger.error({ path, method, qPreview: q.substring(0, 200) }, 'safeQuery element is still a string, attempting final parse');
              try {
                const parsed = this.parseArrayString(q, 'req_query_element_final', path, method);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  logger.info({ path, method, parsedCount: parsed.length }, 'Successfully parsed safeQuery string element');
                  return parsed[0];
                }
              } catch (e) {
                logger.error({ path, method, error: e.message, qPreview: q.substring(0, 100) }, 'Failed to parse safeQuery element');
              }
              return null;
            }
            // 确保是对象，不是字符串或数组
            if (q && typeof q === 'object' && !Array.isArray(q) && typeof q !== 'string') {
              return q;
            }
            if (typeof q === 'string') {
              logger.error({ path, method, qPreview: q.substring(0, 100) }, 'Query element is still a string after processing, filtering out');
            }
            return null;
          })
          .filter((q) => q !== null && typeof q === 'object' && !Array.isArray(q) && typeof q !== 'string');
      } else if (typeof safeQuery === 'string') {
        // 如果仍然是字符串，最后一次尝试解析
        logger.error({ path, method, safeQueryPreview: safeQuery.substring(0, 200) }, 'safeQuery is still a string, attempting final parse');
        finalQuery = this.parseArrayString(safeQuery, 'req_query_final', path, method);
      } else {
        logger.warn({ path, method, safeQueryType: typeof safeQuery }, 'safeQuery is neither array nor string, using empty array');
        finalQuery = [];
      }
      
      let finalReqBodyForm = [];
      if (Array.isArray(reqBodyForm)) {
        // 过滤并验证每个元素都是对象
        finalReqBodyForm = reqBodyForm
          .map((f) => {
            // 如果元素仍然是字符串，尝试解析
            if (typeof f === 'string') {
              logger.warn({ path, method, fLength: f.length }, 'reqBodyForm element is still a string, attempting final parse');
              try {
                const parsed = this.parseArrayString(f, 'req_body_form_element_final', path, method);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  return parsed[0];
                }
              } catch (e) {
                logger.warn({ path, method, error: e.message }, 'Failed to parse reqBodyForm element');
              }
              return null;
            }
            // 确保是对象
            if (f && typeof f === 'object' && !Array.isArray(f)) {
              return f;
            }
            return null;
          })
          .filter((f) => f !== null && typeof f === 'object' && !Array.isArray(f));
      } else if (typeof reqBodyForm === 'string') {
        // 如果仍然是字符串，最后一次尝试解析
        logger.warn({ path, method, reqBodyFormLength: reqBodyForm.length }, 'reqBodyForm is still a string, attempting final parse');
        finalReqBodyForm = this.parseArrayString(reqBodyForm, 'req_body_form_final', path, method);
      } else {
        logger.warn({ path, method, reqBodyFormType: typeof reqBodyForm }, 'reqBodyForm is neither array nor string, using empty array');
        finalReqBodyForm = [];
      }
      
      // 最终类型检查：确保 finalQuery 和 finalReqBodyForm 是数组
      if (!Array.isArray(finalQuery)) {
        logger.error({ path, method, finalQueryType: typeof finalQuery }, 'finalQuery is not an array after all processing, using empty array');
        finalQuery = [];
      }
      if (!Array.isArray(finalReqBodyForm)) {
        logger.error({ path, method, finalReqBodyFormType: typeof finalReqBodyForm }, 'finalReqBodyForm is not an array after all processing, using empty array');
        finalReqBodyForm = [];
      }
      
      // 最终验证：确保 finalQuery 和 finalReqBodyForm 是数组，且每个元素都是对象
      // 再次检查，防止字符串元素，并尝试解析任何剩余的字符串
      let validatedQuery = [];
      if (Array.isArray(finalQuery)) {
        validatedQuery = finalQuery
          .map((q) => {
            // 如果元素仍然是字符串，最后一次尝试解析
            if (typeof q === 'string') {
              logger.error({ path, method, qPreview: q.substring(0, 200) }, 'finalQuery element is still a string in final validation, attempting parse');
              try {
                const parsed = this.parseArrayString(q, 'req_query_final_validation', path, method);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  logger.info({ path, method, parsedCount: parsed.length }, 'Successfully parsed finalQuery string element');
                  return parsed[0];
                }
              } catch (e) {
                logger.error({ path, method, error: e.message, qPreview: q.substring(0, 100) }, 'Failed to parse finalQuery element in final validation');
              }
              return null;
            }
            // 确保是对象
            if (q && typeof q === 'object' && !Array.isArray(q) && typeof q !== 'string') {
              return q;
            }
            return null;
          })
          .filter((q) => q !== null && typeof q === 'object' && !Array.isArray(q) && typeof q !== 'string');
      }
      
      let validatedReqBodyForm = [];
      if (Array.isArray(finalReqBodyForm)) {
        validatedReqBodyForm = finalReqBodyForm
          .map((f) => {
            // 如果元素仍然是字符串，最后一次尝试解析
            if (typeof f === 'string') {
              logger.error({ path, method, fPreview: f.substring(0, 200) }, 'finalReqBodyForm element is still a string in final validation, attempting parse');
              try {
                const parsed = this.parseArrayString(f, 'req_body_form_final_validation', path, method);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  logger.info({ path, method, parsedCount: parsed.length }, 'Successfully parsed finalReqBodyForm string element');
                  return parsed[0];
                }
              } catch (e) {
                logger.error({ path, method, error: e.message, fPreview: f.substring(0, 100) }, 'Failed to parse finalReqBodyForm element in final validation');
              }
              return null;
            }
            // 确保是对象
            if (f && typeof f === 'object' && !Array.isArray(f) && typeof f !== 'string') {
              return f;
            }
            return null;
          })
          .filter((f) => f !== null && typeof f === 'object' && !Array.isArray(f) && typeof f !== 'string');
      }

      // 如果验证后数组为空但原始数据不为空，记录错误
      if (validatedQuery.length === 0 && finalQuery.length > 0) {
        logger.error({ 
          path, 
          method, 
          finalQueryLength: finalQuery.length,
          firstElementType: typeof finalQuery[0],
          firstElementPreview: typeof finalQuery[0] === 'string' ? finalQuery[0].substring(0, 200) : String(finalQuery[0])
        }, 'All query parameters were filtered out, check data format');
      }
      if (validatedReqBodyForm.length === 0 && finalReqBodyForm.length > 0) {
        logger.error({ 
          path, 
          method, 
          finalReqBodyFormLength: finalReqBodyForm.length,
          firstElementType: typeof finalReqBodyForm[0],
          firstElementPreview: typeof finalReqBodyForm[0] === 'string' ? finalReqBodyForm[0].substring(0, 200) : String(finalReqBodyForm[0])
        }, 'All req_body_form parameters were filtered out, check data format');
      }

      // 最终安全检查：确保 validatedQuery 和 validatedReqBodyForm 不包含字符串元素
      // 如果 validatedQuery 本身是字符串，尝试解析
      if (typeof validatedQuery === 'string') {
        logger.error({ path, method, validatedQueryPreview: validatedQuery.substring(0, 200) }, 'validatedQuery is a string, attempting final parse');
        validatedQuery = this.parseArrayString(validatedQuery, 'req_query_absolute_final', path, method);
      }
      // 确保 validatedQuery 是数组，且每个元素都是对象
      if (!Array.isArray(validatedQuery)) {
        logger.error({ path, method, validatedQueryType: typeof validatedQuery }, 'validatedQuery is not an array, using empty array');
        validatedQuery = [];
      }
      // 再次过滤，确保没有字符串元素
      validatedQuery = validatedQuery.filter((q) => {
        if (typeof q === 'string') {
          logger.error({ path, method, qPreview: q.substring(0, 200) }, 'Found string element in validatedQuery, attempting final parse');
          const parsed = this.parseArrayString(q, 'req_query_element_absolute_final', path, method);
          return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
        }
        return q && typeof q === 'object' && !Array.isArray(q);
      }).filter((q) => q !== null && typeof q === 'object' && !Array.isArray(q));

      // 同样处理 validatedReqBodyForm
      if (typeof validatedReqBodyForm === 'string') {
        logger.error({ path, method, validatedReqBodyFormPreview: validatedReqBodyForm.substring(0, 200) }, 'validatedReqBodyForm is a string, attempting final parse');
        validatedReqBodyForm = this.parseArrayString(validatedReqBodyForm, 'req_body_form_absolute_final', path, method);
      }
      if (!Array.isArray(validatedReqBodyForm)) {
        logger.error({ path, method, validatedReqBodyFormType: typeof validatedReqBodyForm }, 'validatedReqBodyForm is not an array, using empty array');
        validatedReqBodyForm = [];
      }
      validatedReqBodyForm = validatedReqBodyForm.filter((f) => {
        if (typeof f === 'string') {
          logger.error({ path, method, fPreview: f.substring(0, 200) }, 'Found string element in validatedReqBodyForm, attempting final parse');
          const parsed = this.parseArrayString(f, 'req_body_form_element_absolute_final', path, method);
          return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
        }
        return f && typeof f === 'object' && !Array.isArray(f);
      }).filter((f) => f !== null && typeof f === 'object' && !Array.isArray(f));

      const interfaceData = {
        project_id: projectId,
        catid: null,
        title: operation.summary || operation.operationId || `${method} ${path}`,
        path,
        method,
        req_query: validatedQuery,
        req_headers: Array.isArray(safeHeaders) ? safeHeaders : [],
        req_body_type: reqBodyType,
        req_body: reqBody,
        req_body_form: validatedReqBodyForm,
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
        try {
          await existing.save();
          results.updated++;
        } catch (saveError) {
          logger.error({ error: saveError, path, method, interfaceData }, 'Failed to save interface in mergin mode');
          throw saveError; // 重新抛出，让外层 catch 处理
        }
      } else if (existing && mode === 'good') {
        // 智能模式：合并更新，保留现有数据
        Object.assign(existing, {
          ...interfaceData,
          req_query: existing.req_query || interfaceData.req_query,
          req_headers: existing.req_headers || interfaceData.req_headers,
          req_body: existing.req_body || interfaceData.req_body,
          res_body: existing.res_body || interfaceData.res_body,
        });
        try {
          await existing.save();
          results.updated++;
        } catch (saveError) {
          logger.error({ error: saveError, path, method, interfaceData }, 'Failed to save interface in good mode');
          throw saveError; // 重新抛出，让外层 catch 处理
        }
      } else {
        if (existing && mode === 'normal') {
          results.skipped++;
          return;
        }
        const newInterface = new Interface(interfaceData);
        try {
          await newInterface.save();
          results.imported++;
        } catch (saveError) {
          logger.error({ error: saveError, path, method, interfaceData }, 'Failed to save new interface');
          throw saveError; // 重新抛出，让外层 catch 处理
        }
      }
    } catch (error) {
      logger.error({ error, path, method, errorStack: error.stack }, 'Import operation error');
      // 提取更详细的错误信息
      let errorMessage = error.message || 'Unknown error';
      if (error.name === 'ValidationError') {
        // Mongoose 验证错误
        const validationErrors = Object.values(error.errors || {}).map((e) => e.message).join(', ');
        errorMessage = `Validation failed: ${validationErrors}`;
      } else if (error.name === 'CastError') {
        // Mongoose 类型转换错误
        errorMessage = `Type conversion failed: ${error.message}`;
      }
      results.errors.push({ path, method, error: errorMessage });
    }
  }

  /**
   * 解析数组字符串（可能是 JSON 或 JavaScript 代码字符串格式）
   * @param {string} str - 要解析的字符串
   * @param {string} fieldName - 字段名称（用于日志）
   * @param {string} path - API 路径（用于日志）
   * @param {string} method - HTTP 方法（用于日志）
   * @returns {Array} 解析后的数组
   */
  parseArrayString(str, fieldName, path, method) {
    if (!str || typeof str !== 'string') {
      return [];
    }

    try {
      // 首先尝试 JSON 解析
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => item && typeof item === 'object' && item !== null);
      }
      return [];
    } catch (jsonError) {
      // 如果 JSON 解析失败，尝试处理 JavaScript 代码字符串
      // 这种字符串通常包含字符串拼接，如 "[\n' + ' {\n' + ..."
      try {
        // 检查是否是 JavaScript 代码字符串格式
        if (str.includes("' + '") || str.includes('" + "') || str.includes("' + \"") || str.includes('" + \'')) {
          // 检查字符串是否包含危险的代码
          if (str.includes('eval(') || str.includes('Function(') || str.includes('require(') || 
              str.includes('__proto__') || str.includes('constructor')) {
            throw new Error('Unsafe string detected');
          }
          
          // 移除字符串拼接标记，然后尝试 JSON 解析
          // 不使用 new Function() 以避免 CSP 违规
          // 首先尝试更精确的清理：移除所有 ' + ' 和 " + " 模式
          // 注意：错误信息显示的模式是 "[\n' + ' {\n' + " name: 'project_id',\n" + ...
          // 这意味着需要移除 ' + ' 和 " + " 模式，但保留引号内的内容
          let cleaned = str
            .replace(/' \+ '/g, '')  // 移除 ' + '
            .replace(/" \+ "/g, '')  // 移除 " + "
            .replace(/' \+ "/g, '')  // 移除 ' + "
            .replace(/" \+ '/g, '')  // 移除 " + '
            .replace(/\s*\+\s*/g, '')  // 移除所有剩余的加号和周围空格
            .replace(/\n/g, ' ')  // 将换行符替换为空格
            .replace(/\s+/g, ' ')  // 将多个空格合并为一个
            .trim();
          
          // 如果清理后仍然包含混合引号，统一使用双引号
          // 更智能的引号处理：先处理对象键，然后处理字符串值
          if (cleaned.includes("'") || cleaned.includes('"')) {
            // 先为对象键添加引号（如果还没有）
            cleaned = cleaned.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
            
            // 统一使用双引号：将单引号字符串转换为双引号字符串
            // 需要小心处理：避免将已经用双引号包裹的字符串再次转换
            // 使用更精确的正则表达式：匹配单引号字符串（不在双引号内）
            cleaned = cleaned.replace(/'([^']*)'/g, (match, content) => {
              // 如果内容包含双引号，需要转义
              const escaped = content.replace(/"/g, '\\"');
              return `"${escaped}"`;
            });
          }
          
          logger.debug({ path, method, field: fieldName, cleanedLength: cleaned.length }, 'Cleaned JavaScript code string');
          
          // 尝试将清理后的字符串解析为 JSON
          try {
            const parsed = JSON.parse(cleaned);
            if (Array.isArray(parsed)) {
              const result = parsed.filter((item) => item && typeof item === 'object' && item !== null);
              logger.info({ path, method, field: fieldName, count: result.length }, 'Successfully parsed array from JavaScript code string');
              return result;
            }
            return [];
          } catch (parseError) {
            // 如果 JSON 解析仍然失败，尝试更激进的清理
            // 移除所有引号和加号，只保留内容
            cleaned = cleaned
              .replace(/['"]/g, '"')  // 统一使用双引号
              .replace(/\s*\+\s*/g, '')  // 移除所有加号和空格
              .replace(/\s+/g, ' ')
              .trim();
            
            try {
              const parsed = JSON.parse(cleaned);
              if (Array.isArray(parsed)) {
                const result = parsed.filter((item) => item && typeof item === 'object' && item !== null);
                logger.info({ path, method, field: fieldName, count: result.length }, 'Successfully parsed array after aggressive cleaning');
                return result;
              }
              return [];
            } catch (parseError2) {
              // 如果 JSON 解析仍然失败，尝试手动提取对象
              logger.debug({ path, method, field: fieldName, cleanedPreview: cleaned.substring(0, 300) }, 'Attempting manual object extraction');
              
              // 使用更智能的正则表达式提取对象
              // 匹配 { key: value, key: value } 格式，支持多行和嵌套
              // 改进的正则表达式，更好地匹配对象结构
              // 注意：cleaned 可能包含多个对象，需要分别提取
              const objectPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
              const parsedObjects = [];
              let match;
              
              while ((match = objectPattern.exec(cleaned)) !== null) {
                const objStr = match[0];
                try {
                  // 尝试修复格式：为键添加引号，统一引号
                  let fixedObjStr = objStr
                    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')  // 为键添加引号
                    .replace(/'([^']*)'/g, (match, content) => {
                      // 转义内容中的双引号
                      const escaped = content.replace(/"/g, '\\"');
                      return `"${escaped}"`;
                    });  // 统一使用双引号
                  
                  const obj = JSON.parse(fixedObjStr);
                  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
                    parsedObjects.push(obj);
                  }
                } catch {
                  // 如果 JSON 解析失败，尝试手动解析
                  try {
                    const obj = {};
                    // 改进的键值对匹配，更好地处理各种格式
                    // 匹配 name: 'value' 或 name: "value" 或 name: value
                    // 注意：需要处理值可能包含逗号的情况
                    const pairs = objStr.match(/(\w+)\s*:\s*(?:['"]([^'"]*)['"]|([^,'"}]+))/g);
                    if (pairs) {
                      for (const pair of pairs) {
                        // 匹配 key: 'value' 或 key: "value" 或 key: value
                        const pairMatch = pair.match(/(\w+)\s*:\s*(?:['"]([^'"]*)['"]|([^,'"}]+))/);
                        if (pairMatch) {
                          const key = pairMatch[1];
                          let value = pairMatch[2] || pairMatch[3] || '';
                          value = value.trim().replace(/^['"]|['"]$/g, '');
                          // 处理布尔值
                          if (value === 'true') value = true;
                          else if (value === 'false') value = false;
                          // 处理数字
                          else if (/^\d+$/.test(value)) value = parseInt(value, 10);
                          obj[key] = value;
                        }
                      }
                      if (Object.keys(obj).length > 0) {
                        parsedObjects.push(obj);
                      }
                    }
                  } catch {
                    // 忽略无法解析的对象
                  }
                }
              }
              
              if (parsedObjects.length > 0) {
                logger.info({ path, method, field: fieldName, count: parsedObjects.length }, 'Successfully extracted objects manually');
                return parsedObjects;
              }
              
              // 如果仍然没有提取到对象，尝试更宽松的匹配
              // 直接匹配 name: value 模式，不依赖对象边界
              // 但需要按对象分组（通过检测连续的键值对）
              const allPairs = cleaned.match(/(\w+)\s*:\s*(?:['"]([^'"]*)['"]|([^,'"\s}]+))/g);
              if (allPairs && allPairs.length > 0) {
                // 尝试将匹配到的键值对分组为对象
                // 假设每 5-7 个键值对组成一个对象（name, type, required, default, desc, example）
                const objects = [];
                let currentObj = {};
                for (const pair of allPairs) {
                  const pairMatch = pair.match(/(\w+)\s*:\s*(?:['"]([^'"]*)['"]|([^,'"\s}]+))/);
                  if (pairMatch) {
                    const key = pairMatch[1];
                    let value = pairMatch[2] || pairMatch[3] || '';
                    value = value.trim().replace(/^['"]|['"]$/g, '');
                    if (value === 'true') value = true;
                    else if (value === 'false') value = false;
                    else if (/^\d+$/.test(value)) value = parseInt(value, 10);
                    currentObj[key] = value;
                    
                    // 如果当前对象包含足够的字段，将其添加到数组并开始新对象
                    if (Object.keys(currentObj).length >= 3 && (key === 'example' || key === 'desc' || key === 'default')) {
                      objects.push(currentObj);
                      currentObj = {};
                    }
                  }
                }
                // 添加最后一个对象（如果有）
                if (Object.keys(currentObj).length > 0) {
                  objects.push(currentObj);
                }
                
                if (objects.length > 0) {
                  logger.info({ path, method, field: fieldName, count: objects.length }, 'Successfully extracted objects from all pairs');
                  return objects;
                }
                
                // 如果分组失败，至少返回一个包含所有键值对的对象
                if (Object.keys(currentObj).length > 0) {
                  logger.info({ path, method, field: fieldName }, 'Successfully extracted single object from all pairs');
                  return [currentObj];
                }
              }
              
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
          field: fieldName,
          str: str.substring(0, 200),
          error: jsError.message 
        }, `Failed to parse ${fieldName}, using empty array`);
        return [];
      }
    }
  }
}

