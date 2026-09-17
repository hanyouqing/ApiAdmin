import Koa from 'koa';
import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import SSOProvider from '../Models/SSOProvider.js';
import { logLogin } from '../Utils/loginLogger.js';
import { encryptSsoConfig, decryptSsoConfig, maskSecret, isEncryptedSecret } from '../Utils/secretCrypto.js';

function sanitizeProviderForClient(provider, { maskSecrets = true } = {}) {
  const obj = provider.toObject ? provider.toObject() : { ...provider };
  if (obj.config && typeof obj.config === 'object') {
    const config = { ...obj.config };
    if (maskSecrets) {
      for (const key of Object.keys(config)) {
        if (/secret|password|private|cert/i.test(key) && config[key]) {
          config[key] = isEncryptedSecret(String(config[key]))
            ? '********'
            : maskSecret(String(config[key]), 4);
        }
      }
    }
    obj.config = config;
  }
  return obj;
}

class SSOController extends BaseController {
  static get ControllerName() { return 'SSOController'; }

  static async listProviders(ctx: Koa.Context) {
    try {
      const { enabled } = ctx.query;
      const query: any = {};
      if (enabled !== undefined) {
        query.enabled = (enabled === 'true' || (enabled as any) === true);
      }

      const providers = await SSOProvider.find(query)
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 });

      ctx.body = SSOController.success(providers.map((p) => sanitizeProviderForClient(p)));
    } catch (error: any) {
      logger.error({ error }, 'List SSO providers error');
      ctx.status = 500;
      ctx.body = SSOController.error(error.message || '获取 SSO 提供者列表失败');
    }
  }

  /** Public list of enabled SSO providers for Login page (no secrets). */
  static async listPublicProviders(ctx: Koa.Context) {
    try {
      const providers = await SSOProvider.find({ enabled: true })
        .select('name type description')
        .sort({ name: 1 })
        .lean();

      ctx.body = SSOController.success(
        providers.map((p: any) => ({
          id: p._id.toString(),
          name: p.name,
          type: p.type,
          description: p.description || '',
        }))
      );
    } catch (error: any) {
      logger.error({ error }, 'List public SSO providers error');
      ctx.status = 500;
      ctx.body = SSOController.error(error.message || '获取 SSO 提供者失败');
    }
  }

  static async getProvider(ctx: Koa.Context) {
    try {
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = SSOController.error('无效的 SSO 提供者 ID');
        return;
      }

      const provider = await SSOProvider.findById(id).populate('createdBy', 'username');
      if (!provider) {
        ctx.status = 404;
        ctx.body = SSOController.error('SSO 提供者不存在');
        return;
      }

      ctx.body = SSOController.success(sanitizeProviderForClient(provider));
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = SSOController.error(error.message || '获取 SSO 提供者失败');
    }
  }

  static async createProvider(ctx: Koa.Context) {
    try {
      const user = ctx.state.user;
      let { name, type, enabled, description, config, roleMapping, autoCreateUser } = ctx.request.body as any;

      if (!name || !type || !config) {
        ctx.status = 400;
        ctx.body = SSOController.error('名称、类型和配置不能为空');
        return;
      }

      const provider = new SSOProvider({
        name: sanitizeInput(name),
        type,
        enabled: enabled !== undefined ? enabled : true,
        description: description ? sanitizeInput(description) : '',
        config: encryptSsoConfig(config),
        roleMapping: roleMapping || {},
        autoCreateUser: autoCreateUser !== undefined ? autoCreateUser : true,
        createdBy: user._id,
      });

      await provider.save();
      ctx.body = SSOController.success(sanitizeProviderForClient(provider), 'SSO 提供者创建成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = SSOController.error(error.message || '创建 SSO 提供者失败');
    }
  }

  static async updateProvider(ctx: Koa.Context) {
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

      const { name, type, enabled, description, config, roleMapping, autoCreateUser } = ctx.request.body as any;

      if (name !== undefined) provider.name = sanitizeInput(name);
      if (type !== undefined) provider.type = type;
      if (enabled !== undefined) provider.enabled = enabled;
      if (description !== undefined) provider.description = sanitizeInput(description);
      if (roleMapping !== undefined) provider.roleMapping = roleMapping;
      if (autoCreateUser !== undefined) provider.autoCreateUser = autoCreateUser;
      if (config !== undefined) {
        const merged = { ...(provider.config || {}), ...config };
        // Skip masked placeholders
        for (const key of Object.keys(merged)) {
          if (typeof merged[key] === 'string' && (merged[key] === '********' || merged[key].endsWith('...'))) {
            merged[key] = provider.config?.[key];
          }
        }
        provider.config = encryptSsoConfig(merged);
        provider.markModified('config');
      }

      await provider.save();
      ctx.body = SSOController.success(sanitizeProviderForClient(provider), 'SSO 提供者更新成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = SSOController.error(error.message || '更新 SSO 提供者失败');
    }
  }

  static async deleteProvider(ctx: Koa.Context) {
    try {
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = SSOController.error('无效的 SSO 提供者 ID');
        return;
      }

      const provider = await SSOProvider.findByIdAndDelete(id);
      if (!provider) {
        ctx.status = 404;
        ctx.body = SSOController.error('SSO 提供者不存在');
        return;
      }

      ctx.body = SSOController.success(null, 'SSO 提供者删除成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = SSOController.error(error.message || '删除 SSO 提供者失败');
    }
  }

  static async initiateAuth(ctx: Koa.Context) {
    try {
      const { providerId } = ctx.params;
      const { redirectUrl } = ctx.query as any;

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

      const decrypted = {
        ...provider.toObject(),
        config: decryptSsoConfig(provider.config),
      };

      const { initiateSAMLAuth, initiateOAuth2Auth, initiateCASAuth } = await import('../Utils/ssoService.js');

      const postLoginRedirect =
        (typeof redirectUrl === 'string' && redirectUrl.trim()) || '/login';
      ctx.cookies.set('sso_redirect', postLoginRedirect, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 60 * 1000,
        sameSite: 'lax',
      });

      let result: any;
      switch (provider.type) {
        case 'saml': result = await initiateSAMLAuth(decrypted, redirectUrl); break;
        case 'oauth2':
        case 'oidc': result = await initiateOAuth2Auth(decrypted, redirectUrl); break;
        case 'cas': result = await initiateCASAuth(decrypted, redirectUrl); break;
        case 'ldap':
          ctx.body = SSOController.success({ type: 'ldap', requiresForm: true, providerId: provider._id.toString() });
          return;
        default:
          ctx.status = 400;
          ctx.body = SSOController.error('不支持的 SSO 类型');
          return;
      }

      ctx.redirect(result.redirectUrl);
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = SSOController.error(error.message || '发起 SSO 认证失败');
    }
  }

  static async handleCallback(ctx: Koa.Context) {
    try {
      const { providerId } = ctx.params;
      const query = { ...(ctx.query as any), ...((ctx.request.body as any) || {}) };
      const { code, state, SAMLResponse, ticket, RelayState } = query;
      const redirect =
        query.redirect ||
        ctx.cookies.get('sso_redirect') ||
        '/login';
      const { username, password } = (ctx.request.body as any) || {};

      const provider = await SSOProvider.findById(providerId);
      if (!provider || !provider.enabled) {
        ctx.redirect(`${redirect}?error=${encodeURIComponent('SSO 提供者不存在或已禁用')}`);
        return;
      }

      const decrypted = {
        ...provider.toObject(),
        config: decryptSsoConfig(provider.config),
      };

      const { handleSAMLCallback, handleOAuth2Callback, handleCASCallback, handleLDAPAuth, processSSOAuthResult } = await import('../Utils/ssoService.js');
      const ip = ctx.ip || '';
      const userAgent = ctx.headers['user-agent'] || '';

      let userInfo: any;
      try {
        switch (provider.type) {
          case 'saml': userInfo = await handleSAMLCallback(decrypted, SAMLResponse, RelayState); break;
          case 'oauth2':
          case 'oidc': userInfo = await handleOAuth2Callback(decrypted, code, state); break;
          case 'cas': userInfo = await handleCASCallback(decrypted, ticket); break;
          case 'ldap': userInfo = await handleLDAPAuth(decrypted, username, password); break;
          default: throw new Error('Unsupported SSO type');
        }

        const { token } = await processSSOAuthResult(provider, userInfo, ip, userAgent);
        ctx.cookies.set('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          sameSite: 'lax',
        });
        // Also expose token for SPA localStorage via hash fragment (same-origin redirect)
        const sep = redirect.includes('?') ? '&' : '?';
        ctx.redirect(`${redirect}${sep}sso_token=${encodeURIComponent(token)}`);
      } catch (error: any) {
        logger.error({ error, providerId }, 'SSO callback failed');
        // @ts-ignore
        await logLogin({
          username: username || 'sso_user',
          email: '',
          loginType: 'sso',
          provider: provider.type,
          status: 'failed',
          failureReason: error.message,
          ip,
          userAgent,
        });
        ctx.redirect(`${redirect}?error=${encodeURIComponent(error.message || '认证失败')}`);
      }
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = SSOController.error(error.message || '处理回调失败');
    }
  }
}

export default SSOController;
