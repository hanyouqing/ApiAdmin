import { BaseController } from './Base.js';
import { logger } from '../Utils/logger.js';
import AIConfig from '../Models/AIConfig.js';

class AIConfigController extends BaseController {
  static get ControllerName() { return 'AIConfigController'; }

  /**
   * 获取所有AI配置
   */
  static async listConfigs(ctx) {
    try {
      const configs = await AIConfig.find().sort({ provider: 1 });

      // 隐藏敏感信息
      const safeConfigs = configs.map(config => ({
        ...config.toObject(),
        api_key: config.api_key ? `${config.api_key.substring(0, 8)}...` : '',
      }));

      ctx.body = AIConfigController.success(safeConfigs);
    } catch (error) {
      logger.error({ error }, 'List AI configs error');
      ctx.status = 500;
      ctx.body = AIConfigController.error(
        process.env.NODE_ENV === 'production'
          ? '获取AI配置失败'
          : error.message || '获取AI配置失败'
      );
    }
  }

  /**
   * 获取单个AI配置
   */
  static async getConfig(ctx) {
    try {
      const { provider } = ctx.params;

      const config = await AIConfig.findOne({ provider });

      if (!config) {
        ctx.status = 404;
        ctx.body = AIConfigController.error('AI配置不存在');
        return;
      }

      ctx.body = AIConfigController.success(config);
    } catch (error) {
      logger.error({ error }, 'Get AI config error');
      ctx.status = 500;
      ctx.body = AIConfigController.error(
        process.env.NODE_ENV === 'production'
          ? '获取AI配置失败'
          : error.message || '获取AI配置失败'
      );
    }
  }

  /**
   * 创建或更新AI配置
   */
  static async saveConfig(ctx) {
    try {
      const user = ctx.state.user;
      const { provider, name, enabled, api_key, api_endpoint, model, max_tokens, temperature, timeout, config } = ctx.request.body;

      if (!provider) {
        ctx.status = 400;
        ctx.body = AIConfigController.error('提供商不能为空');
        return;
      }

      // 验证提供商
      const validProviders = ['openai', 'deepseek', 'doubao', 'gemini', 'custom'];
      if (!validProviders.includes(provider)) {
        ctx.status = 400;
        ctx.body = AIConfigController.error(`不支持的提供商: ${provider}`);
        return;
      }

      // 查找或创建配置
      let aiConfig = await AIConfig.findOne({ provider });

      if (aiConfig) {
        if (name !== undefined) aiConfig.name = name;
        if (enabled !== undefined) aiConfig.enabled = enabled;
        if (api_key !== undefined) aiConfig.api_key = api_key;
        if (api_endpoint !== undefined) aiConfig.api_endpoint = api_endpoint;
        if (model !== undefined) aiConfig.model = model;
        if (max_tokens !== undefined) aiConfig.max_tokens = max_tokens;
        if (temperature !== undefined) aiConfig.temperature = temperature;
        if (timeout !== undefined) aiConfig.timeout = timeout;
        if (config !== undefined) aiConfig.config = config;
        await aiConfig.save();
      } else {
        aiConfig = await AIConfig.create({
          provider,
          name: name || provider,
          enabled: enabled || false,
          api_key: api_key || '',
          api_endpoint: api_endpoint || '',
          model: model || '',
          max_tokens: max_tokens || 2000,
          temperature: temperature || 0.7,
          timeout: timeout || 30000,
          config: config || {},
        });
      }

      logger.info({ userId: user._id, provider }, 'AI config saved');

      ctx.body = AIConfigController.success(aiConfig, 'AI配置保存成功');
    } catch (error) {
      logger.error({ error }, 'Save AI config error');
      ctx.status = 500;
      ctx.body = AIConfigController.error(
        process.env.NODE_ENV === 'production'
          ? '保存AI配置失败'
          : error.message || '保存AI配置失败'
      );
    }
  }

  /**
   * 删除AI配置
   */
  static async deleteConfig(ctx) {
    try {
      const { provider } = ctx.params;

      await AIConfig.findOneAndDelete({ provider });

      ctx.body = AIConfigController.success(null, 'AI配置已删除');
    } catch (error) {
      logger.error({ error }, 'Delete AI config error');
      ctx.status = 500;
      ctx.body = AIConfigController.error(
        process.env.NODE_ENV === 'production'
          ? '删除AI配置失败'
          : error.message || '删除AI配置失败'
      );
    }
  }

  /**
   * 测试AI配置
   */
  static async testConfig(ctx) {
    try {
      const { provider } = ctx.params;

      const config = await AIConfig.findOne({ provider, enabled: true });

      if (!config) {
        ctx.status = 404;
        ctx.body = AIConfigController.error('AI配置不存在或未启用');
        return;
      }

      // 测试AI服务
      const { aiService } = await import('../Utils/aiService.js');
      
      try {
        const response = await aiService.callAI('你好，请回复"测试成功"', {
          provider: config.provider,
        });

        if (response && response.includes('测试成功')) {
          ctx.body = AIConfigController.success(null, 'AI配置测试成功');
        } else {
          ctx.status = 400;
          ctx.body = AIConfigController.error('AI响应异常');
        }
      } catch (error) {
        ctx.status = 400;
        ctx.body = AIConfigController.error(`AI服务调用失败: ${error.message}`);
      }
    } catch (error) {
      logger.error({ error }, 'Test AI config error');
      ctx.status = 500;
      ctx.body = AIConfigController.error(
        process.env.NODE_ENV === 'production'
          ? '测试AI配置失败'
          : error.message || '测试AI配置失败'
      );
    }
  }
}

export default AIConfigController;

