import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import SSOProvider from '../Models/SSOProvider.js';

class SSOController extends BaseController {
  static get ControllerName() { return 'SSOController'; }

  static async listProviders(ctx) {
    try {
      const { enabled } = ctx.query;
      const query = {};
      if (enabled !== undefined) {
        query.enabled = enabled === 'true' || enabled === true;
      }

      const providers = await SSOProvider.find(query)
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 });

      ctx.body = SSOController.success(providers);
    } catch (error) {
      logger.error({ error }, 'List SSO providers error');
      ctx.status = 500;
      ctx.body = SSOController.error(
        process.env.NODE_ENV === 'production'
          ? '获取 SSO 提供者列表失败'
          : error.message || '获取 SSO 提供者列表失败'
      );
    }
  }

  static async getProvider(ctx) {
    try {
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = SSOController.error('无效的 SSO 提供者 ID');
        return;
      }

      const provider = await SSOProvider.findById(id)
        .populate('createdBy', 'username');

      if (!provider) {
        ctx.status = 404;
        ctx.body = SSOController.error('SSO 提供者不存在');
        return;
      }

      ctx.body = SSOController.success(provider);
    } catch (error) {
      logger.error({ error }, 'Get SSO provider error');
      ctx.status = 500;
      ctx.body = SSOController.error(
        process.env.NODE_ENV === 'production'
          ? '获取 SSO 提供者失败'
          : error.message || '获取 SSO 提供者失败'
      );
    }
  }

  static async createProvider(ctx) {
    try {
      const user = ctx.state.user;
      let { name, type, enabled, description, config, roleMapping, autoCreateUser } = ctx.request.body;

      if (!name || !type || !config) {
        ctx.status = 400;
        ctx.body = SSOController.error('名称、类型和配置不能为空');
        return;
      }

      if (!['saml', 'oauth2', 'oidc', 'ldap', 'cas'].includes(type)) {
        ctx.status = 400;
        ctx.body = SSOController.error('无效的 SSO 类型');
        return;
      }

      name = sanitizeInput(name);
      if (description) {
        description = sanitizeInput(description);
      }

      const provider = new SSOProvider({
        name,
        type,
        enabled: enabled !== undefined ? enabled : true,
        description: description || '',
        config,
        roleMapping: roleMapping || {},
        autoCreateUser: autoCreateUser !== undefined ? autoCreateUser : true,
        createdBy: user._id,
      });

      await provider.save();

      logger.info({ userId: user._id, providerId: provider._id }, 'SSO provider created');

      ctx.body = SSOController.success(provider, 'SSO 提供者创建成功');
    } catch (error) {
      logger.error({ error }, 'Create SSO provider error');
      ctx.status = 500;
      ctx.body = SSOController.error(
        process.env.NODE_ENV === 'production'
          ? '创建 SSO 提供者失败'
          : error.message || '创建 SSO 提供者失败'
      );
    }
  }

  static async updateProvider(ctx) {
    try {
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = SSOController.error('无效的 SSO 提供者 ID');
        return;
      }

      const provider = await SSOProvider.findById(id);
      if (!provider) {
        ctx.status = 404;
        ctx.body = SSOController.error('SSO 提供者不存在');
        return;
      }

      const { name, enabled, description, config, roleMapping, autoCreateUser } = ctx.request.body;

      if (name !== undefined) {
        provider.name = sanitizeInput(name);
      }
      if (enabled !== undefined) {
        provider.enabled = enabled;
      }
      if (description !== undefined) {
        provider.description = sanitizeInput(description);
      }
      if (config !== undefined) {
        provider.config = config;
      }
      if (roleMapping !== undefined) {
        provider.roleMapping = roleMapping;
      }
      if (autoCreateUser !== undefined) {
        provider.autoCreateUser = autoCreateUser;
      }

      await provider.save();

      logger.info({ providerId: provider._id }, 'SSO provider updated');

      ctx.body = SSOController.success(provider, 'SSO 提供者更新成功');
    } catch (error) {
      logger.error({ error }, 'Update SSO provider error');
      ctx.status = 500;
      ctx.body = SSOController.error(
        process.env.NODE_ENV === 'production'
          ? '更新 SSO 提供者失败'
          : error.message || '更新 SSO 提供者失败'
      );
    }
  }

  static async deleteProvider(ctx) {
    try {
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = SSOController.error('无效的 SSO 提供者 ID');
        return;
      }

      const provider = await SSOProvider.findById(id);
      if (!provider) {
        ctx.status = 404;
        ctx.body = SSOController.error('SSO 提供者不存在');
        return;
      }

      await provider.deleteOne();

      logger.info({ providerId: id }, 'SSO provider deleted');

      ctx.body = SSOController.success(null, 'SSO 提供者删除成功');
    } catch (error) {
      logger.error({ error }, 'Delete SSO provider error');
      ctx.status = 500;
      ctx.body = SSOController.error(
        process.env.NODE_ENV === 'production'
          ? '删除 SSO 提供者失败'
          : error.message || '删除 SSO 提供者失败'
      );
    }
  }

  static async enableProvider(ctx) {
    try {
      const { id } = ctx.params;
      const { enabled } = ctx.request.body;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = SSOController.error('无效的 SSO 提供者 ID');
        return;
      }

      if (typeof enabled !== 'boolean') {
        ctx.status = 400;
        ctx.body = SSOController.error('enabled 必须是布尔值');
        return;
      }

      const provider = await SSOProvider.findById(id);
      if (!provider) {
        ctx.status = 404;
        ctx.body = SSOController.error('SSO 提供者不存在');
        return;
      }

      provider.enabled = enabled;
      await provider.save();

      logger.info({ providerId: id, enabled }, 'SSO provider status updated');

      ctx.body = SSOController.success(provider, 'SSO 提供者状态更新成功');
    } catch (error) {
      logger.error({ error }, 'Enable/disable SSO provider error');
      ctx.status = 500;
      ctx.body = SSOController.error(
        process.env.NODE_ENV === 'production'
          ? '更新 SSO 提供者状态失败'
          : error.message || '更新 SSO 提供者状态失败'
      );
    }
  }

  static async initiateAuth(ctx) {
    try {
      const { providerId } = ctx.params;
      const { redirectUrl } = ctx.query;

      if (!validateObjectId(providerId)) {
        ctx.status = 400;
        ctx.body = SSOController.error('无效的 SSO 提供者 ID');
        return;
      }

      const provider = await SSOProvider.findById(providerId);
      if (!provider || !provider.enabled) {
        ctx.status = 404;
        ctx.body = SSOController.error('SSO 提供者不存在或已禁用');
        return;
      }

      // TODO: 根据 provider.type 实现不同的认证流程
      // SAML: 重定向到 entryPoint
      // OAuth2/OIDC: 重定向到 authorizationURL
      // LDAP: 返回登录表单
      // CAS: 重定向到 CAS URL

      // 临时实现：返回配置信息（实际应该重定向）
      ctx.body = SSOController.success({
        providerId,
        type: provider.type,
        config: provider.config,
        redirectUrl: redirectUrl || '/',
      }, '请实现具体的 SSO 认证流程');
    } catch (error) {
      logger.error({ error }, 'Initiate SSO auth error');
      ctx.status = 500;
      ctx.body = SSOController.error(
        process.env.NODE_ENV === 'production'
          ? '发起 SSO 认证失败'
          : error.message || '发起 SSO 认证失败'
      );
    }
  }

  static async handleCallback(ctx) {
    try {
      const { providerId } = ctx.params;
      const { code, state, SAMLResponse, ticket } = ctx.query;

      if (!validateObjectId(providerId)) {
        ctx.status = 400;
        ctx.body = SSOController.error('无效的 SSO 提供者 ID');
        return;
      }

      const provider = await SSOProvider.findById(providerId);
      if (!provider || !provider.enabled) {
        ctx.status = 404;
        ctx.body = SSOController.error('SSO 提供者不存在或已禁用');
        return;
      }

      // TODO: 根据 provider.type 处理不同的回调
      // OAuth2/OIDC: 使用 code 换取 token，获取用户信息
      // SAML: 解析 SAMLResponse
      // CAS: 使用 ticket 验证

      // 临时实现：返回回调信息（实际应该处理认证并生成 JWT）
      ctx.body = SSOController.success({
        providerId,
        type: provider.type,
        callbackData: { code, state, SAMLResponse, ticket },
      }, '请实现具体的 SSO 回调处理');
    } catch (error) {
      logger.error({ error }, 'Handle SSO callback error');
      ctx.status = 500;
      ctx.body = SSOController.error(
        process.env.NODE_ENV === 'production'
          ? '处理 SSO 回调失败'
          : error.message || '处理 SSO 回调失败'
      );
    }
  }
}

export default SSOController;

