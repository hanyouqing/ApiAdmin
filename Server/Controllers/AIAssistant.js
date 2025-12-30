import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import Interface from '../Models/Interface.js';
import Project from '../Models/Project.js';

/**
 * AI 辅助控制器
 * 处理 AI 辅助接口生成、设计建议等功能
 */
class AIAssistantController extends BaseController {
  static get ControllerName() { return 'AIAssistantController'; }

  /**
   * 根据自然语言描述生成接口雏形
   */
  static async generateInterface(ctx) {
    try {
      const user = ctx.state.user;
      const { description, projectId, language = 'zh' } = ctx.request.body;

      if (!description || !description.trim()) {
        ctx.status = 400;
        ctx.body = AIAssistantController.error('描述不能为空');
        return;
      }

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = AIAssistantController.error('无效的项目 ID');
        return;
      }

      const project = await Project.findById(projectId);
      if (!project) {
        ctx.status = 404;
        ctx.body = AIAssistantController.error('项目不存在');
        return;
      }

      const interfaceData = await this.parseDescriptionToInterface(description, project, language);

      logger.info({ userId: user._id, projectId, description }, 'AI generated interface');

      ctx.body = AIAssistantController.success({
        interface: interfaceData,
      }, '接口生成成功');
    } catch (error) {
      logger.error({ error }, 'Generate interface error');
      ctx.status = 500;
      ctx.body = AIAssistantController.error(
        process.env.NODE_ENV === 'production'
          ? '生成接口失败'
          : error.message || '生成接口失败'
      );
    }
  }

  /**
   * 获取接口设计建议
   */
  static async getDesignSuggestions(ctx) {
    try {
      const { interfaceId } = ctx.query;

      if (!validateObjectId(interfaceId)) {
        ctx.status = 400;
        ctx.body = AIAssistantController.error('无效的接口 ID');
        return;
      }

      const interfaceData = await Interface.findById(interfaceId);
      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = AIAssistantController.error('接口不存在');
        return;
      }

      const suggestions = await this.analyzeInterface(interfaceData);

      ctx.body = AIAssistantController.success({
        suggestions,
      });
    } catch (error) {
      logger.error({ error }, 'Get design suggestions error');
      ctx.status = 500;
      ctx.body = AIAssistantController.error(
        process.env.NODE_ENV === 'production'
          ? '获取设计建议失败'
          : error.message || '获取设计建议失败'
      );
    }
  }

  /**
   * 智能参数推荐
   */
  static async suggestParameters(ctx) {
    try {
      const { interfaceId, parameterType } = ctx.request.body;

      if (!validateObjectId(interfaceId)) {
        ctx.status = 400;
        ctx.body = AIAssistantController.error('无效的接口 ID');
        return;
      }

      const interfaceData = await Interface.findById(interfaceId);
      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = AIAssistantController.error('接口不存在');
        return;
      }

      const suggestions = await this.generateParameterSuggestions(interfaceData, parameterType);

      ctx.body = AIAssistantController.success({
        suggestions,
      });
    } catch (error) {
      logger.error({ error }, 'Suggest parameters error');
      ctx.status = 500;
      ctx.body = AIAssistantController.error(
        process.env.NODE_ENV === 'production'
          ? '参数推荐失败'
          : error.message || '参数推荐失败'
      );
    }
  }

  /**
   * 解析自然语言描述为接口定义
   */
  static async parseDescriptionToInterface(description, project, language) {
    const method = this.extractMethod(description);
    const path = this.extractPath(description, project);
    const title = this.extractTitle(description);
    const reqParams = this.extractRequestParams(description);
    const resBody = this.extractResponseBody(description);

    return {
      title,
      path,
      method,
      req_query: reqParams.query || [],
      req_body: resBody ? JSON.stringify(resBody, null, 2) : '',
      res_body: resBody ? JSON.stringify(resBody, null, 2) : '',
      req_body_type: 'json',
      res_body_type: 'json',
      desc: description,
      status: 'developing',
    };
  }

  /**
   * 提取 HTTP 方法
   */
  static extractMethod(description) {
    const lowerDesc = description.toLowerCase();
    if (lowerDesc.includes('获取') || lowerDesc.includes('查询') || lowerDesc.includes('get') || lowerDesc.includes('list')) {
      return 'GET';
    } else if (lowerDesc.includes('创建') || lowerDesc.includes('添加') || lowerDesc.includes('create') || lowerDesc.includes('add')) {
      return 'POST';
    } else if (lowerDesc.includes('更新') || lowerDesc.includes('修改') || lowerDesc.includes('update') || lowerDesc.includes('edit')) {
      return 'PUT';
    } else if (lowerDesc.includes('删除') || lowerDesc.includes('remove') || lowerDesc.includes('delete')) {
      return 'DELETE';
    }
    return 'GET';
  }

  /**
   * 提取接口路径
   */
  static extractPath(description, project) {
    const lowerDesc = description.toLowerCase();
    const basePath = project.basepath || '';

    if (lowerDesc.includes('用户') || lowerDesc.includes('user')) {
      return `${basePath}/users`;
    } else if (lowerDesc.includes('订单') || lowerDesc.includes('order')) {
      return `${basePath}/orders`;
    } else if (lowerDesc.includes('产品') || lowerDesc.includes('product')) {
      return `${basePath}/products`;
    }
    return `${basePath}/api/resource`;
  }

  /**
   * 提取接口标题
   */
  static extractTitle(description) {
    return description.length > 50 ? description.substring(0, 50) : description;
  }

  /**
   * 提取请求参数
   */
  static extractRequestParams(description) {
    return {
      query: [],
    };
  }

  /**
   * 提取响应体
   */
  static extractResponseBody(description) {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('列表') || lowerDesc.includes('list')) {
      return {
        code: 200,
        message: 'success',
        data: [],
        total: 0,
      };
    } else if (lowerDesc.includes('详情') || lowerDesc.includes('detail')) {
      return {
        code: 200,
        message: 'success',
        data: {},
      };
    }
    
    return {
      code: 200,
      message: 'success',
      data: null,
    };
  }

  /**
   * 分析接口并生成建议
   */
  static async analyzeInterface(interfaceData) {
    const suggestions = [];

    if (!interfaceData.desc || interfaceData.desc.trim() === '') {
      suggestions.push({
        type: 'warning',
        field: 'description',
        message: '建议添加接口描述，便于团队成员理解接口用途',
      });
    }

    if (interfaceData.method === 'GET' && (!interfaceData.req_query || interfaceData.req_query.length === 0)) {
      suggestions.push({
        type: 'info',
        field: 'query',
        message: 'GET 接口通常需要查询参数，建议添加分页参数（page, pageSize）',
      });
    }

    if (['POST', 'PUT'].includes(interfaceData.method) && !interfaceData.req_body) {
      suggestions.push({
        type: 'warning',
        field: 'body',
        message: 'POST/PUT 接口通常需要请求体，建议定义请求数据结构',
      });
    }

    if (!interfaceData.res_body || interfaceData.res_body.trim() === '') {
      suggestions.push({
        type: 'warning',
        field: 'response',
        message: '建议定义响应数据结构，便于前端开发和 Mock 数据生成',
      });
    }

    return suggestions;
  }

  /**
   * 生成参数建议
   */
  static async generateParameterSuggestions(interfaceData, parameterType) {
    const suggestions = [];

    if (parameterType === 'query') {
      suggestions.push(
        { name: 'page', type: 'integer', required: false, desc: '页码', default: '1' },
        { name: 'pageSize', type: 'integer', required: false, desc: '每页数量', default: '10' },
        { name: 'sort', type: 'string', required: false, desc: '排序字段', default: 'created_at' },
        { name: 'order', type: 'string', required: false, desc: '排序方向', default: 'desc' }
      );
    } else if (parameterType === 'body') {
      if (interfaceData.method === 'POST') {
        suggestions.push(
          { name: 'name', type: 'string', required: true, desc: '名称' },
          { name: 'description', type: 'string', required: false, desc: '描述' }
        );
      } else if (interfaceData.method === 'PUT') {
        suggestions.push(
          { name: 'id', type: 'string', required: true, desc: 'ID' },
          { name: 'name', type: 'string', required: false, desc: '名称' }
        );
      }
    }

    return suggestions;
  }
}

export default AIAssistantController;

