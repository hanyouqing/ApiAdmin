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

      const {
        initiateSAMLAuth,
        initiateOAuth2Auth,
        initiateCASAuth,
      } = await import('../Utils/ssoService.js');

      let authResult;

      switch (provider.type) {
        case 'saml':
          authResult = await initiateSAMLAuth(provider, redirectUrl);
          break;
        case 'oauth2':
        case 'oidc':
          authResult = await initiateOAuth2Auth(provider, redirectUrl);
          break;
        case 'cas':
          authResult = await initiateCASAuth(provider, redirectUrl);
          break;
        case 'ldap':
          ctx.status = 200;
          ctx.body = SSOController.success({
            type: 'ldap',
            requiresForm: true,
            providerId: provider._id.toString(),
          }, 'LDAP 需要表单登录');
          return;
        default:
          ctx.status = 400;
          ctx.body = SSOController.error('不支持的 SSO 类型');
          return;
      }

      ctx.redirect(authResult.redirectUrl);
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
      const { code, state, SAMLResponse, ticket, RelayState } = ctx.query;
      const { username, password } = ctx.request.body || {};

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

      const {
        handleSAMLCallback,
        handleOAuth2Callback,
        handleCASCallback,
        handleLDAPAuth,
        processSSOAuthResult,
      } = await import('../Utils/ssoService.js');

      const userAgent = ctx.headers['user-agent'] || '';
      const ip = ctx.ip || ctx.request.ip || '';
      const redirectUrl = ctx.query.redirect || '/';

      let userInfo;

      try {
        switch (provider.type) {
          case 'saml':
            if (!SAMLResponse) {
              throw new Error('SAML response is required');
            }
            userInfo = await handleSAMLCallback(provider, SAMLResponse, RelayState);
            break;
          case 'oauth2':
          case 'oidc':
            if (!code) {
              throw new Error('OAuth2 authorization code is required');
            }
            userInfo = await handleOAuth2Callback(provider, code, state);
            break;
          case 'cas':
            if (!ticket) {
              throw new Error('CAS ticket is required');
            }
            userInfo = await handleCASCallback(provider, ticket);
            break;
          case 'ldap':
            if (!username || !password) {
              ctx.status = 400;
              ctx.body = SSOController.error('LDAP 需要用户名和密码');
              return;
            }
            userInfo = await handleLDAPAuth(provider, username, password);
            break;
          default:
            ctx.status = 400;
            ctx.body = SSOController.error('不支持的 SSO 类型');
            return;
        }

        const { user, token } = await processSSOAuthResult(provider, userInfo, ip, userAgent);

        ctx.cookies.set('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          sameSite: 'lax',
        });

        ctx.redirect(redirectUrl);
      } catch (error) {
        logger.error({ error, providerId, type: provider.type }, 'SSO callback processing failed');

        await logLogin({
          username: username || '',
          email: '',
          loginType: 'sso',
          provider: provider.type,
          status: 'failed',
          failureReason: error.message || 'SSO 认证失败',
          ip,
          userAgent,
        });

        const errorMessage = process.env.NODE_ENV === 'production'
          ? 'SSO 认证失败'
          : error.message || 'SSO 认证失败';

        ctx.redirect(`${redirectUrl}?error=${encodeURIComponent(errorMessage)}`);
      }
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

  static async handleLDAPLogin(ctx) {
    try {
      const { providerId } = ctx.params;
      const { username, password } = ctx.request.body;

      if (!validateObjectId(providerId)) {
        ctx.status = 400;
        ctx.body = SSOController.error('无效的 SSO 提供者 ID');
        return;
      }

      if (!username || !password) {
        ctx.status = 400;
        ctx.body = SSOController.error('用户名和密码不能为空');
        return;
      }

      const provider = await SSOProvider.findById(providerId);
      if (!provider || !provider.enabled || provider.type !== 'ldap') {
        ctx.status = 404;
        ctx.body = SSOController.error('LDAP 提供者不存在或已禁用');
        return;
      }

      const {
        handleLDAPAuth,
        processSSOAuthResult,
      } = await import('../Utils/ssoService.js');

      const userAgent = ctx.headers['user-agent'] || '';
      const ip = ctx.ip || ctx.request.ip || '';

      const userInfo = await handleLDAPAuth(provider, username, password);
      const { user, token } = await processSSOAuthResult(provider, userInfo, ip, userAgent);

      ctx.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });

      ctx.body = SSOController.success({
        user,
        token,
      }, 'LDAP 登录成功');
    } catch (error) {
      logger.error({ error }, 'LDAP login error');

      const userAgent = ctx.headers['user-agent'] || '';
      const ip = ctx.ip || ctx.request.ip || '';

      await logLogin({
        username: ctx.request.body?.username || '',
        email: '',
        loginType: 'sso',
        provider: 'ldap',
        status: 'failed',
        failureReason: error.message || 'LDAP 认证失败',
        ip,
        userAgent,
      });

      ctx.status = 401;
      ctx.body = SSOController.error(
        process.env.NODE_ENV === 'production'
          ? 'LDAP 认证失败'
          : error.message || 'LDAP 认证失败'
      );
    }
  }
}

export default SSOController;

