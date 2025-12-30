import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import Interface from '../Models/Interface.js';
import InterfaceVersion from '../Models/InterfaceVersion.js';
import Project from '../Models/Project.js';
import { logOperation } from '../Utils/operationLogger.js';

/**
 * API 设计中心控制器
 * 处理 OpenAPI 3.0+、GraphQL 支持、版本管理等功能
 */
class APIDesignController extends BaseController {
  static get ControllerName() { return 'APIDesignController'; }

  /**
   * 将接口转换为 OpenAPI 3.0+ 规范
   */
  static async convertToOpenAPI(ctx) {
    try {
      const { interfaceId, version = '3.0.0' } = ctx.request.body;

      if (!validateObjectId(interfaceId)) {
        ctx.status = 400;
        ctx.body = APIDesignController.error('无效的接口 ID');
        return;
      }

      const interfaceData = await Interface.findById(interfaceId)
        .populate('project_id');

      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = APIDesignController.error('接口不存在');
        return;
      }

      const openapiSpec = this.generateOpenAPISpec(interfaceData, version);

      ctx.body = APIDesignController.success({
        openapi: openapiSpec,
        version,
      }, 'OpenAPI 规范生成成功');
    } catch (error) {
      logger.error({ error }, 'Convert to OpenAPI error');
      ctx.status = 500;
      ctx.body = APIDesignController.error(
        process.env.NODE_ENV === 'production'
          ? '生成 OpenAPI 规范失败'
          : error.message || '生成 OpenAPI 规范失败'
      );
    }
  }

  /**
   * 将接口转换为 GraphQL Schema
   */
  static async convertToGraphQL(ctx) {
    try {
      const { interfaceId } = ctx.request.body;

      if (!validateObjectId(interfaceId)) {
        ctx.status = 400;
        ctx.body = APIDesignController.error('无效的接口 ID');
        return;
      }

      const interfaceData = await Interface.findById(interfaceId);

      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = APIDesignController.error('接口不存在');
        return;
      }

      const graphqlSchema = this.generateGraphQLSchema(interfaceData);

      ctx.body = APIDesignController.success({
        schema: graphqlSchema,
      }, 'GraphQL Schema 生成成功');
    } catch (error) {
      logger.error({ error }, 'Convert to GraphQL error');
      ctx.status = 500;
      ctx.body = APIDesignController.error(
        process.env.NODE_ENV === 'production'
          ? '生成 GraphQL Schema 失败'
          : error.message || '生成 GraphQL Schema 失败'
      );
    }
  }

  /**
   * 创建接口版本
   */
  static async createVersion(ctx) {
    try {
      const user = ctx.state.user;
      const { interfaceId, version, changeSummary, changeType = 'update' } = ctx.request.body;

      if (!validateObjectId(interfaceId)) {
        ctx.status = 400;
        ctx.body = APIDesignController.error('无效的接口 ID');
        return;
      }

      const interfaceData = await Interface.findById(interfaceId);
      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = APIDesignController.error('接口不存在');
        return;
      }

      const latestVersion = await InterfaceVersion.findOne({ interface_id: interfaceId })
        .sort({ version_number: -1 });

      const versionNumber = latestVersion ? latestVersion.version_number + 1 : 1;
      const versionString = version || `1.0.${versionNumber}`;

      await InterfaceVersion.updateMany(
        { interface_id: interfaceId },
        { $set: { is_current: false } }
      );

      const openapiSpec = this.generateOpenAPISpec(interfaceData, '3.0.0');
      const graphqlSchema = this.generateGraphQLSchema(interfaceData);

      const interfaceVersion = new InterfaceVersion({
        interface_id: interfaceId,
        version: versionString,
        version_number: versionNumber,
        title: interfaceData.title,
        path: interfaceData.path,
        method: interfaceData.method,
        description: interfaceData.desc || '',
        req_query: interfaceData.req_query || [],
        req_headers: interfaceData.req_headers || [],
        req_body_type: interfaceData.req_body_type || 'json',
        req_body: interfaceData.req_body || '',
        req_body_form: interfaceData.req_body_form || [],
        res_body_type: interfaceData.res_body_type || 'json',
        res_body: interfaceData.res_body || '',
        openapi_spec: openapiSpec,
        graphql_schema: graphqlSchema,
        created_by: user._id,
        change_summary: changeSummary || '',
        change_type: changeType,
        is_current: true,
        tags: interfaceData.tag || [],
        status: interfaceData.status || 'developing',
      });

      await interfaceVersion.save();

      logger.info({ userId: user._id, interfaceId, version: versionString }, 'Interface version created');

      ctx.body = APIDesignController.success(interfaceVersion, '版本创建成功');
    } catch (error) {
      logger.error({ error }, 'Create version error');
      ctx.status = 500;
      ctx.body = APIDesignController.error(
        process.env.NODE_ENV === 'production'
          ? '创建版本失败'
          : error.message || '创建版本失败'
      );
    }
  }

  /**
   * 获取接口版本列表
   */
  static async listVersions(ctx) {
    try {
      const { interfaceId } = ctx.query;

      if (!validateObjectId(interfaceId)) {
        ctx.status = 400;
        ctx.body = APIDesignController.error('无效的接口 ID');
        return;
      }

      const versions = await InterfaceVersion.find({ interface_id: interfaceId })
        .populate('created_by', 'username')
        .sort({ version_number: -1 });

      ctx.body = APIDesignController.success(versions);
    } catch (error) {
      logger.error({ error }, 'List versions error');
      ctx.status = 500;
      ctx.body = APIDesignController.error(
        process.env.NODE_ENV === 'production'
          ? '获取版本列表失败'
          : error.message || '获取版本列表失败'
      );
    }
  }

  /**
   * 版本对比
   */
  static async compareVersions(ctx) {
    try {
      const { interfaceId, version1, version2 } = ctx.query;

      if (!validateObjectId(interfaceId)) {
        ctx.status = 400;
        ctx.body = APIDesignController.error('无效的接口 ID');
        return;
      }

      const v1 = await InterfaceVersion.findOne({
        interface_id: interfaceId,
        $or: [
          { version: version1 },
          { version_number: parseInt(version1) || 0 },
        ],
      });

      const v2 = await InterfaceVersion.findOne({
        interface_id: interfaceId,
        $or: [
          { version: version2 },
          { version_number: parseInt(version2) || 0 },
        ],
      });

      if (!v1 || !v2) {
        ctx.status = 404;
        ctx.body = APIDesignController.error('版本不存在');
        return;
      }

      const diff = this.compareInterfaceVersions(v1, v2);

      ctx.body = APIDesignController.success({
        version1: v1,
        version2: v2,
        diff,
      });
    } catch (error) {
      logger.error({ error }, 'Compare versions error');
      ctx.status = 500;
      ctx.body = APIDesignController.error(
        process.env.NODE_ENV === 'production'
          ? '版本对比失败'
          : error.message || '版本对比失败'
      );
    }
  }

  /**
   * 回滚到指定版本
   */
  static async rollbackVersion(ctx) {
    try {
      const user = ctx.state.user;
      const { interfaceId, version } = ctx.request.body;

      if (!validateObjectId(interfaceId)) {
        ctx.status = 400;
        ctx.body = APIDesignController.error('无效的接口 ID');
        return;
      }

      const interfaceData = await Interface.findById(interfaceId);
      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = APIDesignController.error('接口不存在');
        return;
      }

      const targetVersion = await InterfaceVersion.findOne({
        interface_id: interfaceId,
        $or: [
          { version },
          { version_number: parseInt(version) || 0 },
        ],
      });

      if (!targetVersion) {
        ctx.status = 404;
        ctx.body = APIDesignController.error('版本不存在');
        return;
      }

      Object.assign(interfaceData, {
        title: targetVersion.title,
        path: targetVersion.path,
        method: targetVersion.method,
        desc: targetVersion.description,
        req_query: targetVersion.req_query,
        req_headers: targetVersion.req_headers,
        req_body_type: targetVersion.req_body_type,
        req_body: targetVersion.req_body,
        req_body_form: targetVersion.req_body_form,
        res_body_type: targetVersion.res_body_type,
        res_body: targetVersion.res_body,
        tag: targetVersion.tags,
        status: targetVersion.status,
      });

      await interfaceData.save();

      await this.createVersion(ctx, {
        state: { user },
        request: {
          body: {
            interfaceId,
            changeSummary: `回滚到版本 ${targetVersion.version}`,
            changeType: 'update',
          },
        },
      });

      await logOperation({
        type: 'interface',
        action: 'rollback',
        targetId: interfaceId,
        targetName: interfaceData.title,
        userId: user._id,
        username: user.username,
        projectId: interfaceData.project_id,
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      logger.info({ userId: user._id, interfaceId, version: targetVersion.version }, 'Interface rolled back');

      ctx.body = APIDesignController.success(null, '回滚成功');
    } catch (error) {
      logger.error({ error }, 'Rollback version error');
      ctx.status = 500;
      ctx.body = APIDesignController.error(
        process.env.NODE_ENV === 'production'
          ? '回滚失败'
          : error.message || '回滚失败'
      );
    }
  }

  /**
   * 生成 OpenAPI 3.0+ 规范
   */
  static generateOpenAPISpec(interfaceData, version = '3.0.0') {
    const project = interfaceData.project_id;
    const baseUrl = project?.basepath || '';

    const spec = {
      openapi: version,
      info: {
        title: project?.name || 'API',
        version: '1.0.0',
        description: project?.desc || '',
      },
      servers: [
        {
          url: baseUrl,
          description: 'API Server',
        },
      ],
      paths: {
        [interfaceData.path]: {
          [interfaceData.method.toLowerCase()]: {
            summary: interfaceData.title,
            description: interfaceData.desc || '',
            tags: interfaceData.tag || [],
            parameters: [],
            requestBody: null,
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: this.parseResponseBody(interfaceData.res_body, interfaceData.res_body_type),
                  },
                },
              },
            },
          },
        },
      },
    };

    if (interfaceData.req_query && interfaceData.req_query.length > 0) {
      spec.paths[interfaceData.path][interfaceData.method.toLowerCase()].parameters = 
        interfaceData.req_query.map(param => ({
          name: param.name,
          in: 'query',
          required: param.required || false,
          schema: {
            type: this.mapTypeToOpenAPI(param.type || 'string'),
          },
          description: param.desc || '',
        }));
    }

    if (['POST', 'PUT', 'PATCH'].includes(interfaceData.method)) {
      spec.paths[interfaceData.path][interfaceData.method.toLowerCase()].requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: this.parseRequestBody(interfaceData.req_body, interfaceData.req_body_type),
          },
        },
      };
    }

    return spec;
  }

  /**
   * 生成 GraphQL Schema
   */
  static generateGraphQLSchema(interfaceData) {
    const method = interfaceData.method.toUpperCase();
    const typeName = this.toPascalCase(interfaceData.title || interfaceData.path);

    if (method === 'GET') {
      return `type Query {
  ${this.toCamelCase(interfaceData.path)}: ${typeName}
}

type ${typeName} {
  ${this.generateGraphQLFields(interfaceData.res_body, interfaceData.res_body_type)}
}`;
    } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
      return `type Mutation {
  ${this.toCamelCase(interfaceData.path)}(${this.generateGraphQLArgs(interfaceData.req_body, interfaceData.req_body_type)}): ${typeName}
}

type ${typeName} {
  ${this.generateGraphQLFields(interfaceData.res_body, interfaceData.res_body_type)}
}`;
    }

    return '';
  }

  /**
   * 对比两个接口版本
   */
  static compareInterfaceVersions(v1, v2) {
    const diff = {
      title: v1.title !== v2.title,
      path: v1.path !== v2.path,
      method: v1.method !== v2.method,
      description: v1.description !== v2.description,
      req_query: this.compareArrays(v1.req_query, v2.req_query),
      req_headers: this.compareArrays(v1.req_headers, v2.req_headers),
      req_body: v1.req_body !== v2.req_body,
      res_body: v1.res_body !== v2.res_body,
      tags: this.compareArrays(v1.tags, v2.tags),
      status: v1.status !== v2.status,
    };

    return diff;
  }

  static compareArrays(arr1, arr2) {
    if (arr1.length !== arr2.length) return true;
    return JSON.stringify(arr1) !== JSON.stringify(arr2);
  }

  static parseResponseBody(body, type) {
    if (type === 'json' && body) {
      try {
        const parsed = JSON.parse(body);
        return this.jsonToSchema(parsed);
      } catch {
        return { type: 'object' };
      }
    }
    return { type: 'string' };
  }

  static parseRequestBody(body, type) {
    return this.parseResponseBody(body, type);
  }

  static jsonToSchema(json) {
    if (Array.isArray(json)) {
      return {
        type: 'array',
        items: json.length > 0 ? this.jsonToSchema(json[0]) : { type: 'object' },
      };
    } else if (typeof json === 'object' && json !== null) {
      const properties = {};
      const required = [];
      for (const [key, value] of Object.entries(json)) {
        properties[key] = this.jsonToSchema(value);
      }
      return {
        type: 'object',
        properties,
        required,
      };
    } else {
      return {
        type: typeof json,
      };
    }
  }

  static mapTypeToOpenAPI(type) {
    const typeMap = {
      string: 'string',
      number: 'number',
      integer: 'integer',
      boolean: 'boolean',
      array: 'array',
      object: 'object',
    };
    return typeMap[type] || 'string';
  }

  static toPascalCase(str) {
    return str.replace(/(?:^|[-_])(\w)/g, (_, c) => c ? c.toUpperCase() : '');
  }

  static toCamelCase(str) {
    return str.replace(/[-_](.)/g, (_, c) => c.toUpperCase());
  }

  static generateGraphQLFields(body, type) {
    if (type === 'json' && body) {
      try {
        const parsed = JSON.parse(body);
        return Object.keys(parsed).map(key => {
          const value = parsed[key];
          const graphqlType = this.mapToGraphQLType(value);
          return `  ${key}: ${graphqlType}`;
        }).join('\n');
      } catch {
        return '  id: ID';
      }
    }
    return '  id: ID';
  }

  static generateGraphQLArgs(body, type) {
    if (type === 'json' && body) {
      try {
        const parsed = JSON.parse(body);
        return Object.keys(parsed).map(key => {
          const value = parsed[key];
          const graphqlType = this.mapToGraphQLType(value);
          return `${key}: ${graphqlType}`;
        }).join(', ');
      } catch {
        return 'input: String';
      }
    }
    return 'input: String';
  }

  static mapToGraphQLType(value) {
    if (typeof value === 'string') return 'String';
    if (typeof value === 'number') return value % 1 === 0 ? 'Int' : 'Float';
    if (typeof value === 'boolean') return 'Boolean';
    if (Array.isArray(value)) return '[String]';
    if (typeof value === 'object') return 'JSON';
    return 'String';
  }
}

export default APIDesignController;

