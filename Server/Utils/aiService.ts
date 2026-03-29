import axios from 'axios';
import config from './config.js';
import { logger } from './logger.js';
import AIConfig from '../Models/AIConfig.js';

export interface AIProviderConfig {
  provider: 'openai' | 'gemini' | 'anthropic' | 'deepseek' | 'local';
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export class AIService {
  private static instance: AIService;
  private configs: Map<string, AIProviderConfig> = new Map();

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * 从数据库加载配置
   */
  async loadConfig(projectId?: string): Promise<AIProviderConfig | null> {
    try {
      // 优先从数据库获取项目特定的 AI 配置
      if (projectId) {
        const dbConfig = await AIConfig.findOne({ project_id: projectId, enabled: true });
        if (dbConfig) {
          return {
            provider: dbConfig.provider as any,
            apiKey: dbConfig.api_key,
            // @ts-ignore
            baseUrl: dbConfig.api_endpoint,
            model: dbConfig.model,
            temperature: dbConfig.temperature || 0.7,
            maxTokens: dbConfig.max_tokens || 2000,
          };
        }
      }

      // 备选：从全局配置获取（如果有）
      // @ts-ignore
      const globalConfig = await AIConfig.findOne({ is_global: true, enabled: true });
      if (globalConfig) {
        return {
          provider: globalConfig.provider as any,
          apiKey: globalConfig.api_key,
          // @ts-ignore
          baseUrl: globalConfig.api_endpoint,
          model: globalConfig.model,
          temperature: globalConfig.temperature || 0.7,
          maxTokens: globalConfig.max_tokens || 2000,
        };
      }

      return null;
    } catch (error) {
      logger.error({ error }, 'Failed to load AI config');
      return null;
    }
  }

  /**
   * 调用 AI 生成内容
   */
  async generateContent(prompt: string, projectId?: string): Promise<string> {
    const aiConfig = await this.loadConfig(projectId);
    
    if (!aiConfig) {
      throw new Error('AI service not configured. Please configure AI settings in Admin or Project settings.');
    }

    try {
      switch (aiConfig.provider) {
        case 'openai':
        case 'deepseek':
          return await this.callOpenAICompatible(prompt, aiConfig);
        case 'gemini':
          return await this.callGemini(prompt, aiConfig);
        default:
          throw new Error(`Unsupported AI provider: ${aiConfig.provider}`);
      }
    } catch (error: any) {
      logger.error({ error: error.message, provider: aiConfig.provider }, 'AI generation failed');
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  private async callOpenAICompatible(prompt: string, aiConfig: AIProviderConfig): Promise<string> {
    const baseUrl = aiConfig.baseUrl || (aiConfig.provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.deepseek.com');
    
    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: aiConfig.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
      },
      {
        headers: {
          'Authorization': `Bearer ${aiConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content;
  }

  private async callGemini(prompt: string, aiConfig: AIProviderConfig): Promise<string> {
    const baseUrl = aiConfig.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models';
    const url = `${baseUrl}/${aiConfig.model}:generateContent?key=${aiConfig.apiKey}`;

    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: aiConfig.temperature,
          maxOutputTokens: aiConfig.maxTokens,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.candidates[0].content.parts[0].text;
  }

  /**
   * 解析自然语言描述为接口定义
   */
  async parseInterfaceDescription(description: string, projectId?: string): Promise<any> {
    const prompt = `
      Act as an expert API Designer. Convert the following natural language description into a standard API definition in JSON format.
      
      Description: "${description}"
      
      Return ONLY a JSON object with this structure:
      {
        "title": "Clear interface title",
        "path": "/api/resource/path",
        "method": "GET|POST|PUT|DELETE|PATCH",
        "req_query": [{"name": "paramName", "type": "string|number|boolean|integer", "required": true|false, "desc": "description"}],
        "req_headers": [{"name": "Header-Name", "value": "defaultValue", "required": true|false, "desc": "description"}],
        "req_body_type": "json|form",
        "req_body": "JSON string template or example",
        "res_body": "JSON string response template or example",
        "desc": "Detailed description of the API"
      }
      
      Ensure the path is RESTful. Use common naming conventions.
    `;

    const content = await this.generateContent(prompt, projectId);
    try {
      // 清理内容（有些 AI 会返回 markdown 代码块）
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      logger.error({ error, content }, 'Failed to parse AI response as JSON');
      throw new Error('AI returned an invalid JSON structure. Please try rephrasing your description.');
    }
  }

  /**
   * 获取接口设计建议
   */
  async getDesignReview(interfaceData: any, projectId?: string): Promise<any> {
    const prompt = `
      Act as an expert API Reviewer. Review the following API definition and provide suggestions for improvement.
      Focus on RESTful best practices, naming conventions, security, and completeness.
      
      API Definition:
      ${JSON.stringify(interfaceData, null, 2)}
      
      Return ONLY a JSON array of suggestions:
      [
        {"type": "warning|info|error", "field": "fieldName", "message": "Clear actionable suggestion"}
      ]
    `;

    const content = await this.generateContent(prompt, projectId);
    try {
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      return [{ type: 'info', field: 'general', message: 'AI Review completed but failed to parse detailed suggestions.' }];
    }
  }
}

export const aiService = AIService.getInstance();
