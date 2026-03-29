import Koa from 'koa';
import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import SSOProvider from '../Models/SSOProvider.js';
import { logLogin } from '../Utils/loginLogger.js';
import mongoose from 'mongoose';

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

      ctx.body = SSOController.success(providers);
    } catch (error: any) {
      logger.error({ error }, 'List SSO providers error');
      ctx.status = 500;
      ctx.body = SSOController.error(error.message || '获取 SSO 提供者列表失败');
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

      ctx.body = SSOController.success(provider);
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
        config,
        roleMapping: roleMapping || {},
        autoCreateUser: autoCreateUser !== undefined ? autoCreateUser : true,
        createdBy: user._id,
      });

      await provider.save();
      ctx.body = SSOController.success(provider, 'SSO 提供者创建成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = SSOController.error(error.message || '创建 SSO 提供者失败');
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

      const { initiateSAMLAuth, initiateOAuth2Auth, initiateCASAuth } = await import('../Utils/ssoService.js');

      let result: any;
      switch (provider.type) {
        case 'saml': result = await initiateSAMLAuth(provider, redirectUrl); break;
        case 'oauth2':
        case 'oidc': result = await initiateOAuth2Auth(provider, redirectUrl); break;
        case 'cas': result = await initiateCASAuth(provider, redirectUrl); break;
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
      const { code, state, SAMLResponse, ticket, RelayState, redirect = '/' } = ctx.query as any;
      const { username, password } = (ctx.request.body as any) || {};

      const provider = await SSOProvider.findById(providerId);
      if (!provider || !provider.enabled) {
        ctx.redirect(`${redirect}?error=${encodeURIComponent('SSO 提供者不存在或已禁用')}`);
        return;
      }

      const { handleSAMLCallback, handleOAuth2Callback, handleCASCallback, handleLDAPAuth, processSSOAuthResult } = await import('../Utils/ssoService.js');
      const ip = ctx.ip || '';
      const userAgent = ctx.headers['user-agent'] || '';

      let userInfo: any;
      try {
        switch (provider.type) {
          case 'saml': userInfo = await handleSAMLCallback(provider, SAMLResponse, RelayState); break;
          case 'oauth2':
          case 'oidc': userInfo = await handleOAuth2Callback(provider, code, state); break;
          case 'cas': userInfo = await handleCASCallback(provider, ticket); break;
          case 'ldap': userInfo = await handleLDAPAuth(provider, username, password); break;
          default: throw new Error('Unsupported SSO type');
        }

        const { token } = await processSSOAuthResult(provider, userInfo, ip, userAgent);
        ctx.cookies.set('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          sameSite: 'lax',
        });
        ctx.redirect(redirect);
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
