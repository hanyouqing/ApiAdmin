import Koa from 'koa';
import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import Interface from '../Models/Interface.js';
import Project from '../Models/Project.js';
import { aiService } from '../Utils/aiService.js';
import mongoose from 'mongoose';

// 定义经过认证的 Context 扩展
interface AuthenticatedContext extends Koa.Context {
  state: {
    user: {
      _id: mongoose.Types.ObjectId | string;
      role: string;
      username: string;
      email: string;
    };
  };
}

/**
 * AI 辅助控制器
 * 处理 AI 辅助接口生成、设计建议等功能
 */
class AIAssistantController extends BaseController {
  static get ControllerName() { return 'AIAssistantController'; }

  /**
   * 根据自然语言描述生成接口雏形
   */
  static async generateInterface(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { description, projectId } = ctx.request.body as any;

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

      let interfaceData;
      try {
        // 尝试使用 AI 服务生成
        interfaceData = await aiService.parseInterfaceDescription(description, projectId);
      } catch (aiError: any) {
        logger.warn({ aiError: aiError.message }, 'AI Service failed, falling back to rule-based extraction');
        // 降级到基础规则提取
        interfaceData = await this.fallbackParseDescription(description, project);
      }

      logger.info({ userId: user._id, projectId, description }, 'AI generated interface');

      ctx.body = AIAssistantController.success({
        interface: interfaceData,
      }, '接口生成成功');
    } catch (error: any) {
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
  static async getDesignSuggestions(ctx: Koa.Context) {
    try {
      const { interfaceId } = ctx.query;

      if (!interfaceId || typeof interfaceId !== 'string' || !validateObjectId(interfaceId)) {
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

      let suggestions;
      try {
        suggestions = await aiService.getDesignReview(interfaceData, interfaceData.project_id.toString());
      } catch (aiError) {
        // 降级到基础静态分析
        suggestions = await this.staticAnalyzeInterface(interfaceData);
      }

      ctx.body = AIAssistantController.success({
        suggestions,
      });
    } catch (error: any) {
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
  static async suggestParameters(ctx: Koa.Context) {
    try {
      const { interfaceId, parameterType } = ctx.request.body as any;

      if (!interfaceId || !validateObjectId(interfaceId)) {
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

      const prompt = `
        Based on the following API definition, suggest relevant ${parameterType} parameters.
        API: ${interfaceData.method} ${interfaceData.path} (${interfaceData.title})
        
        Return ONLY a JSON array of parameter objects:
        [{"name": "paramName", "type": "string|number|boolean", "required": true|false, "desc": "description", "example": "value"}]
      `;

      let suggestions;
      try {
        const content = await aiService.generateContent(prompt, interfaceData.project_id.toString());
        const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
        suggestions = JSON.parse(jsonStr);
      } catch (error) {
        // 降级到预定义常用参数
        suggestions = this.getCommonParameters(parameterType, interfaceData.method);
      }

      ctx.body = AIAssistantController.success({
        suggestions,
      });
    } catch (error) {
      logger.error({ error }, 'Suggest parameters error');
      ctx.status = 500;
      ctx.body = AIAssistantController.error('参数推荐失败');
    }
  }

  /**
   * Generate Mock expectation from interface (AI + rule fallback).
   * Body: { interface_id, save?: boolean }
   */
  static async generateMock(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { interface_id, save = false } = ctx.request.body as any;

      if (!interface_id || !validateObjectId(interface_id)) {
        ctx.status = 400;
        ctx.body = AIAssistantController.error('无效的接口 ID');
        return;
      }

      const interfaceData = await Interface.findById(interface_id);
      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = AIAssistantController.error('接口不存在');
        return;
      }

      const { generateMockExpectation } = await import('../Utils/mockGenerator.js');
      const aiMod = await import('../Utils/aiService.js');
      const runtimeAi = (aiMod as any).aiService || (aiMod as any).default;

      const mock = await generateMockExpectation(interfaceData.toObject(), {
        projectId: interfaceData.project_id?.toString?.() || String(interfaceData.project_id),
        callAI: async (prompt: string, opts: any = {}) => {
          if (!runtimeAi?.callAI) {
            throw new Error('AI runtime unavailable');
          }
          const result = await runtimeAi.callAI(prompt, opts);
          if (typeof result === 'string') return result;
          return result?.content || result?.text || JSON.stringify(result);
        },
      });

      let saved = null;
      if (save) {
        const MockExpectation = (await import('../Models/MockExpectation.js')).default;
        const expectation = new MockExpectation({
          interface_id,
          project_id: interfaceData.project_id,
          name: mock.name,
          ip_filter: mock.ip_filter || '',
          query_filter: mock.query_filter || {},
          body_filter: mock.body_filter || {},
          response: mock.response,
          enabled: mock.enabled !== false,
          priority: mock.priority || 10,
          uid: user._id,
        });
        await expectation.save();
        saved = expectation;
        logger.info(
          { userId: user._id, interfaceId: interface_id, expectationId: expectation._id, source: mock.source },
          'AI mock expectation saved'
        );
      }

      ctx.body = AIAssistantController.success(
        { mock, saved, source: mock.source },
        saved ? 'Mock 已生成并保存' : 'Mock 已生成'
      );
    } catch (error: any) {
      logger.error({ error }, 'Generate mock error');
      ctx.status = 500;
      ctx.body = AIAssistantController.error(
        process.env.NODE_ENV === 'production' ? '生成 Mock 失败' : error.message || '生成 Mock 失败'
      );
    }
  }

  /**
   * Suggest code fix from failed pipeline / monitor run.
   * Body: { run_type: 'pipeline'|'monitor', run_id, project_id?, create_draft_pr?, file_path? }
   */
  static async suggestCodeFix(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const body = ctx.request.body as any;
      const { run_type, run_id, project_id, create_draft_pr, file_path } = body || {};

      if (!run_id || !validateObjectId(run_id)) {
        ctx.status = 400;
        ctx.body = AIAssistantController.error('无效的 run_id');
        return;
      }
      if (run_type && !['pipeline', 'monitor'].includes(run_type)) {
        ctx.status = 400;
        ctx.body = AIAssistantController.error('run_type 必须是 pipeline 或 monitor');
        return;
      }

      const { suggestCodeFix } = await import('../Utils/codeFixSuggester.js');
      const aiMod = await import('../Utils/aiService.js');
      const runtimeAi = (aiMod as any).aiService || (aiMod as any).default;

      const result = await suggestCodeFix(
        {
          run_type: run_type || 'pipeline',
          run_id,
          project_id,
          create_draft_pr: !!create_draft_pr,
          file_path,
        },
        {
          user,
          callAI: async (prompt: string, opts: any = {}) => {
            if (!runtimeAi?.callAI) throw new Error('AI runtime unavailable');
            const out = await runtimeAi.callAI(prompt, opts);
            return typeof out === 'string' ? out : out?.content || out?.text || '';
          },
        }
      );

      try {
        const { logOperation } = await import('../Utils/operationLogger.js');
        await logOperation({
          type: 'test',
          action: 'ai_code_fix',
          targetId: run_id,
          targetName: result.target_name || 'code-fix',
          userId: user._id,
          username: user.username,
          projectId: result.project_id || null,
          details: {
            run_type: result.run_type,
            source: result.source,
            file_count: result.files?.length || 0,
            draft_pr: !!result.pull_request?.url,
          },
          ip: ctx.ip || '',
          userAgent: ctx.headers['user-agent'] || '',
          uri: ctx.request.url || '',
        });
      } catch {
        /* ignore audit failures */
      }

      ctx.body = AIAssistantController.success(result, '代码修复建议已生成（请人工审核）');
    } catch (error: any) {
      logger.error({ error }, 'Suggest code fix error');
      const status = error.status || 500;
      ctx.status = status;
      ctx.body = AIAssistantController.error(
        process.env.NODE_ENV === 'production' && status === 500
          ? '生成代码修复建议失败'
          : error.message || '生成代码修复建议失败'
      );
    }
  }

  /**
   * 基础规则提取（作为 AI 失败时的备选方案）
   */
  static async fallbackParseDescription(description: string, project: any) {
    const lowerDesc = description.toLowerCase();
    const method = lowerDesc.includes('post') || lowerDesc.includes('创建') ? 'POST' :
                   lowerDesc.includes('put') || lowerDesc.includes('更新') ? 'PUT' :
                   lowerDesc.includes('delete') || lowerDesc.includes('删除') ? 'DELETE' : 'GET';
    
    return {
      title: description.substring(0, 50),
      path: project.basepath + '/api/new-interface',
      method,
      req_query: [],
      req_body: '',
      res_body: '{}',
      req_body_type: 'json',
      res_body_type: 'json',
      desc: description,
      status: 'developing',
    };
  }

  /**
   * 基础静态分析
   */
  static async staticAnalyzeInterface(interfaceData: any) {
    const suggestions = [];
    if (!interfaceData.desc) {
      suggestions.push({ type: 'info', field: 'desc', message: '建议添加接口描述' });
    }
    if (interfaceData.method === 'GET' && (!interfaceData.req_query || interfaceData.req_query.length === 0)) {
      suggestions.push({ type: 'info', field: 'query', message: 'GET 接口通常需要查询参数' });
    }
    return suggestions;
  }

  /**
   * 获取常用参数
   */
  static getCommonParameters(type: string, method: string) {
    if (type === 'query') {
      return [
        { name: 'page', type: 'number', required: false, desc: '页码' },
        { name: 'pageSize', type: 'number', required: false, desc: '每页数量' }
      ];
    }
    return [];
  }
}

export default AIAssistantController;
