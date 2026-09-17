import { BaseController } from './Base.js';
import { logger } from '../Utils/logger.js';
import AIConfig from '../Models/AIConfig.js';
import { encryptSecret, maskSecret, isEncryptedSecret, isCloudAiAllowed, CLOUD_AI_PROVIDERS } from '../Utils/secretCrypto.js';

const VALID_PROVIDERS = ['openai', 'deepseek', 'doubao', 'gemini', 'kimi', 'aliyun', 'custom'];

const OLLAMA_DEFAULTS = {
  name: 'Ollama (local)',
  api_endpoint: 'http://127.0.0.1:11434/v1/chat/completions',
  model: 'llama3',
  api_key: '',
};

class AIConfigController extends BaseController {
  static get ControllerName() { return 'AIConfigController'; }

  static async listConfigs(ctx) {
    try {
      const configs = await AIConfig.find().sort({ provider: 1 });

      const safeConfigs = configs.map(config => {
        const obj = config.toObject();
        const plainHint = isEncryptedSecret(obj.api_key) ? '********' : (obj.api_key || '');
        return {
          ...obj,
          api_key: plainHint ? maskSecret(plainHint, 4) : '',
          is_local: obj.provider === 'custom',
        };
      });

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

  static async getConfig(ctx) {
    try {
      const { provider } = ctx.params;

      const config = await AIConfig.findOne({ provider });

      if (!config) {
        ctx.status = 404;
        ctx.body = AIConfigController.error('AI配置不存在');
        return;
      }

      const obj = config.toObject();
      obj.api_key = obj.api_key ? maskSecret(isEncryptedSecret(obj.api_key) ? '********' : obj.api_key, 4) : '';
      ctx.body = AIConfigController.success(obj);
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

  static async saveConfig(ctx) {
    try {
      const user = ctx.state.user;
      const { provider, name, enabled, api_key, api_endpoint, model, max_tokens, temperature, timeout, config } = ctx.request.body;

      if (!provider) {
        ctx.status = 400;
        ctx.body = AIConfigController.error('提供商不能为空');
        return;
      }

      if (!VALID_PROVIDERS.includes(provider)) {
        ctx.status = 400;
        ctx.body = AIConfigController.error(`不支持的提供商: ${provider}`);
        return;
      }

      if (CLOUD_AI_PROVIDERS.has(provider) && enabled && !isCloudAiAllowed()) {
        ctx.status = 403;
        ctx.body = AIConfigController.error('受监管模式禁止启用云端 AI，请使用 custom（Ollama）');
        return;
      }

      let aiConfig = await AIConfig.findOne({ provider });

      const applyDefaults = provider === 'custom';
      const resolvedEndpoint = api_endpoint !== undefined
        ? api_endpoint
        : (applyDefaults ? OLLAMA_DEFAULTS.api_endpoint : '');
      const resolvedModel = model !== undefined
        ? model
        : (applyDefaults ? OLLAMA_DEFAULTS.model : '');
      const resolvedName = name !== undefined
        ? name
        : (applyDefaults ? OLLAMA_DEFAULTS.name : provider);

      let encryptedKey;
      if (api_key !== undefined && api_key !== '' && !String(api_key).includes('...')) {
        encryptedKey = encryptSecret(api_key);
      }

      if (aiConfig) {
        if (name !== undefined) aiConfig.name = name;
        if (enabled !== undefined) aiConfig.enabled = enabled;
        if (encryptedKey !== undefined) aiConfig.api_key = encryptedKey;
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
          name: resolvedName,
          enabled: enabled || false,
          api_key: encryptedKey || '',
          api_endpoint: resolvedEndpoint || '',
          model: resolvedModel || '',
          max_tokens: max_tokens || 2000,
          temperature: temperature || 0.7,
          timeout: timeout || 30000,
          config: config || {},
        });
      }

      logger.info({ userId: user._id, provider }, 'AI config saved');

      const safe = aiConfig.toObject();
      safe.api_key = safe.api_key ? maskSecret('********', 4) : '';
      ctx.body = AIConfigController.success(safe, 'AI配置保存成功');
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

  static async testConfig(ctx) {
    try {
      const { provider } = ctx.params;
      const aiConfig = await AIConfig.findOne({ provider });

      if (!aiConfig) {
        ctx.status = 404;
        ctx.body = AIConfigController.error('AI配置不存在');
        return;
      }

      if (CLOUD_AI_PROVIDERS.has(provider) && !isCloudAiAllowed()) {
        ctx.status = 403;
        ctx.body = AIConfigController.error('受监管模式禁止使用云端 AI');
        return;
      }

      const { aiService } = await import('../Utils/aiService.js');
      const reply = await aiService.callAI('Reply with OK', {
        provider,
        systemPrompt: 'You are a connectivity test. Reply with exactly: OK',
      });

      ctx.body = AIConfigController.success({ reply }, 'AI配置测试成功');
    } catch (error) {
      logger.error({ error }, 'Test AI config error');
      ctx.status = 500;
      ctx.body = AIConfigController.error(
        process.env.NODE_ENV === 'production'
          ? 'AI配置测试失败'
          : error.message || 'AI配置测试失败'
      );
    }
  }
}

export default AIConfigController;
