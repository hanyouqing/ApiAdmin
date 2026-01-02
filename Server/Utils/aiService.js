import axios from 'axios';
import { logger } from './logger.js';
import AIConfig from '../Models/AIConfig.js';

/**
 * AI 服务
 * 统一接口，支持多个 AI 提供商
 */
class AIService {
  /**
   * 调用 AI 服务
   */
  async callAI(prompt, options = {}) {
    try {
      // 获取启用的 AI 配置
      const aiConfig = await this.getActiveAIConfig(options.provider);
      
      if (!aiConfig) {
        throw new Error('没有可用的 AI 配置，请在系统设置中配置 AI 服务');
      }

      // 更新使用统计
      await AIConfig.findByIdAndUpdate(aiConfig._id, {
        $inc: { usage_count: 1 },
        last_used_at: new Date(),
      });

      switch (aiConfig.provider) {
        case 'openai':
          return await this.callOpenAI(aiConfig, prompt, options);
        case 'deepseek':
          return await this.callDeepSeek(aiConfig, prompt, options);
        case 'doubao':
          return await this.callDoubao(aiConfig, prompt, options);
        case 'gemini':
          return await this.callGemini(aiConfig, prompt, options);
        case 'kimi':
          return await this.callKimi(aiConfig, prompt, options);
        case 'aliyun':
          return await this.callAliyun(aiConfig, prompt, options);
        default:
          throw new Error(`不支持的 AI 提供商: ${aiConfig.provider}`);
      }
    } catch (error) {
      logger.error({ error, provider: options.provider }, 'AI service call failed');
      throw error;
    }
  }

  /**
   * 获取启用的 AI 配置
   */
  async getActiveAIConfig(preferredProvider = null) {
    if (preferredProvider) {
      const config = await AIConfig.findOne({ provider: preferredProvider, enabled: true });
      if (config) return config;
    }
    
    // 返回第一个启用的配置
    return await AIConfig.findOne({ enabled: true }).sort({ usage_count: 1 });
  }

  /**
   * 调用 OpenAI (ChatGPT)
   */
  async callOpenAI(config, prompt, options) {
    const endpoint = config.api_endpoint || 'https://api.openai.com/v1/chat/completions';
    const model = config.model || 'gpt-3.5-turbo';
    
    const response = await axios.post(
      endpoint,
      {
        model,
        messages: [
          { role: 'system', content: options.systemPrompt || '你是一个专业的软件工程师，擅长分析和修复代码问题。' },
          { role: 'user', content: prompt },
        ],
        max_tokens: config.max_tokens || 2000,
        temperature: config.temperature || 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        timeout: config.timeout || 30000,
      }
    );

    return response.data.choices[0]?.message?.content || '';
  }

  /**
   * 调用 DeepSeek
   */
  async callDeepSeek(config, prompt, options) {
    const endpoint = config.api_endpoint || 'https://api.deepseek.com/v1/chat/completions';
    const model = config.model || 'deepseek-chat';
    
    const response = await axios.post(
      endpoint,
      {
        model,
        messages: [
          { role: 'system', content: options.systemPrompt || '你是一个专业的软件工程师，擅长分析和修复代码问题。' },
          { role: 'user', content: prompt },
        ],
        max_tokens: config.max_tokens || 2000,
        temperature: config.temperature || 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        timeout: config.timeout || 30000,
      }
    );

    return response.data.choices[0]?.message?.content || '';
  }

  /**
   * 调用豆包 (字节跳动)
   */
  async callDoubao(config, prompt, options) {
    const endpoint = config.api_endpoint || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    const model = config.model || 'ep-20241208101230-xxxxx'; // 需要替换为实际的模型ID
    
    const response = await axios.post(
      endpoint,
      {
        model,
        messages: [
          { role: 'system', content: options.systemPrompt || '你是一个专业的软件工程师，擅长分析和修复代码问题。' },
          { role: 'user', content: prompt },
        ],
        max_tokens: config.max_tokens || 2000,
        temperature: config.temperature || 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        timeout: config.timeout || 30000,
      }
    );

    return response.data.choices[0]?.message?.content || '';
  }

  /**
   * 调用 Gemini (Google)
   */
  async callGemini(config, prompt, options) {
    const endpoint = config.api_endpoint || `https://generativelanguage.googleapis.com/v1beta/models/${config.model || 'gemini-pro'}:generateContent`;
    
    const response = await axios.post(
      `${endpoint}?key=${config.api_key}`,
      {
        contents: [{
          parts: [{
            text: `${options.systemPrompt || '你是一个专业的软件工程师，擅长分析和修复代码问题。'}\n\n${prompt}`,
          }],
        }],
        generationConfig: {
          maxOutputTokens: config.max_tokens || 2000,
          temperature: config.temperature || 0.7,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: config.timeout || 30000,
      }
    );

    return response.data.candidates[0]?.content?.parts[0]?.text || '';
  }

  /**
   * 调用 Kimi (Moonshot AI)
   */
  async callKimi(config, prompt, options) {
    const endpoint = config.api_endpoint || 'https://api.moonshot.cn/v1/chat/completions';
    const model = config.model || 'moonshot-v1-8k';
    
    const response = await axios.post(
      endpoint,
      {
        model,
        messages: [
          { role: 'system', content: options.systemPrompt || '你是一个专业的软件工程师，擅长分析和修复代码问题。' },
          { role: 'user', content: prompt },
        ],
        max_tokens: config.max_tokens || 2000,
        temperature: config.temperature || 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        timeout: config.timeout || 30000,
      }
    );

    return response.data.choices[0]?.message?.content || '';
  }

  /**
   * 调用阿里大模型 (通义千问)
   */
  async callAliyun(config, prompt, options) {
    const endpoint = config.api_endpoint || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
    const model = config.model || 'qwen-turbo';
    
    const response = await axios.post(
      endpoint,
      {
        model,
        input: {
          messages: [
            { role: 'system', content: options.systemPrompt || '你是一个专业的软件工程师，擅长分析和修复代码问题。' },
            { role: 'user', content: prompt },
          ],
        },
        parameters: {
          max_tokens: config.max_tokens || 2000,
          temperature: config.temperature || 0.7,
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
        timeout: config.timeout || 30000,
      }
    );

    return response.data.output?.choices[0]?.message?.content || '';
  }

  /**
   * 分析测试失败并生成修复建议
   */
  async analyzeTestFailure(testResult, codeContext = null) {
    try {
      const prompt = this.buildAnalysisPrompt(testResult, codeContext);
      const systemPrompt = '你是一个专业的软件测试工程师和代码审查专家。请仔细分析测试失败的原因，并提供详细的修复建议。';
      
      const analysis = await this.callAI(prompt, {
        systemPrompt,
        provider: null, // 使用默认启用的AI
      });

      return {
        analysis,
        suggestions: this.extractSuggestions(analysis),
        confidence: this.calculateConfidence(analysis),
      };
    } catch (error) {
      logger.error({ error, testResultId: testResult._id }, 'Failed to analyze test failure');
      throw error;
    }
  }

  /**
   * 构建分析提示词
   */
  buildAnalysisPrompt(testResult, codeContext) {
    let prompt = `请分析以下测试失败的原因，并提供修复建议：\n\n`;
    
    prompt += `## 测试结果概览\n`;
    prompt += `- 测试任务: ${testResult.task_id?.name || 'N/A'}\n`;
    prompt += `- 状态: ${testResult.status}\n`;
    prompt += `- 总计: ${testResult.summary?.total || 0}\n`;
    prompt += `- 通过: ${testResult.summary?.passed || 0}\n`;
    prompt += `- 失败: ${testResult.summary?.failed || 0}\n`;
    prompt += `- 错误: ${testResult.summary?.error || 0}\n\n`;

    if (testResult.results && testResult.results.length > 0) {
      prompt += `## 失败的测试用例详情\n\n`;
      testResult.results.forEach((result, index) => {
        if (result.status === 'failed' || result.status === 'error') {
          prompt += `### 测试用例 ${index + 1}\n`;
          prompt += `- 接口: ${result.interface_id?.method || 'N/A'} ${result.interface_id?.path || 'N/A'}\n`;
          prompt += `- 状态: ${result.status}\n`;
          if (result.error) {
            prompt += `- 错误信息: ${JSON.stringify(result.error, null, 2)}\n`;
          }
          if (result.request) {
            prompt += `- 请求: ${JSON.stringify(result.request, null, 2)}\n`;
          }
          if (result.response) {
            prompt += `- 响应: ${JSON.stringify(result.response, null, 2)}\n`;
          }
          prompt += `\n`;
        }
      });
    }

    if (codeContext && codeContext.length > 0) {
      prompt += `## 相关代码\n\n`;
      codeContext.forEach((file, index) => {
        prompt += `### 文件 ${index + 1}: ${file.path}\n`;
        prompt += `\`\`\`${file.language || 'javascript'}\n${file.content}\n\`\`\`\n\n`;
      });
    }

    prompt += `\n请提供：\n`;
    prompt += `1. 失败原因分析\n`;
    prompt += `2. 具体的修复建议（包括代码修改）\n`;
    prompt += `3. 预防措施建议\n`;

    return prompt;
  }

  /**
   * 从分析结果中提取建议
   */
  extractSuggestions(analysis) {
    // 简单的正则提取，实际可以更复杂
    const suggestions = [];
    const lines = analysis.split('\n');
    
    let currentSuggestion = null;
    for (const line of lines) {
      if (line.match(/^\d+\.|^[-*]/)) {
        if (currentSuggestion) {
          suggestions.push(currentSuggestion);
        }
        currentSuggestion = line.trim();
      } else if (currentSuggestion && line.trim()) {
        currentSuggestion += '\n' + line.trim();
      }
    }
    if (currentSuggestion) {
      suggestions.push(currentSuggestion);
    }

    return suggestions.length > 0 ? suggestions : [analysis];
  }

  /**
   * 计算分析结果的置信度
   */
  calculateConfidence(analysis) {
    // 简单的启发式方法
    let confidence = 0.5;
    
    if (analysis.includes('修复') || analysis.includes('建议')) {
      confidence += 0.2;
    }
    if (analysis.includes('代码') || analysis.includes('修改')) {
      confidence += 0.2;
    }
    if (analysis.length > 500) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * 补全单元测试
   */
  async generateUnitTests(sourceCode, functionName, testFramework = 'jest') {
    try {
      const prompt = `请为以下代码生成完整的单元测试。使用${testFramework}测试框架。

源代码：
\`\`\`javascript
${sourceCode}
\`\`\`

要求：
1. 覆盖所有函数和边界情况
2. 包含正常情况和异常情况
3. 使用适当的断言
4. 包含测试描述和注释
5. 确保测试代码质量高、可维护

请直接返回测试代码，不需要额外的说明。`;

      const systemPrompt = '你是一个专业的测试工程师，擅长编写高质量的单元测试。';

      const testCode = await this.callAI(prompt, {
        systemPrompt,
        provider: null,
      });

      return {
        testCode,
        framework: testFramework,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error({ error, functionName }, 'Failed to generate unit tests');
      throw error;
    }
  }

  /**
   * 修复测试问题
   */
  async fixTestIssues(testResult, sourceCode, errorDetails) {
    try {
      const prompt = `请分析以下测试失败的原因，并提供修复后的代码。

测试结果：
${JSON.stringify(testResult, null, 2)}

错误详情：
${JSON.stringify(errorDetails, null, 2)}

源代码：
\`\`\`javascript
${sourceCode}
\`\`\`

要求：
1. 分析失败的根本原因
2. 提供修复后的完整代码
3. 确保修复后的代码能够通过测试
4. 保持代码风格和结构一致
5. 添加必要的注释说明修复内容

请直接返回修复后的代码，并在代码前添加简要的修复说明。`;

      const systemPrompt = '你是一个专业的软件工程师，擅长调试和修复代码问题。';

      const fixedCode = await this.callAI(prompt, {
        systemPrompt,
        provider: null,
      });

      // 提取修复说明和代码
      const parts = fixedCode.split(/```(?:javascript|js)?/);
      let explanation = '';
      let code = fixedCode;

      if (parts.length >= 3) {
        explanation = parts[0].trim();
        code = parts[1].trim();
      }

      return {
        fixedCode: code,
        explanation,
        originalCode: sourceCode,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error({ error, testResultId: testResult._id }, 'Failed to fix test issues');
      throw error;
    }
  }
}

export const aiService = new AIService();
export default aiService;

