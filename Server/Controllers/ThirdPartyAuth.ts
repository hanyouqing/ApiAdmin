import Koa from 'koa';
import jwt from 'jsonwebtoken';
import { BaseController } from './Base.js';
import { validateEmail, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import User from '../Models/User.js';
import WhitelistConfig from '../Models/WhitelistConfig.js';
import Whitelist from '../Models/Whitelist.js';
import ThirdPartyAuthConfig from '../Models/ThirdPartyAuthConfig.js';
import EmailConfigModel from '../Models/EmailConfig.js';
import config from '../Utils/config.js';
import { sendEmail } from '../Utils/emailService.js';
import { logLogin } from '../Utils/loginLogger.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

// 内存存储（Redis 不可用时的降级方案）
const memoryStore = new Map<string, any>();

function getJWTSecret() {
  const secret = config.JWT_SECRET;
  if (!secret || secret === 'your-secret-key') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
  }
  return secret;
}

function getJWTExpiresIn() {
  return config.JWT_EXPIRES_IN || '7d';
}

async function storeCode(key: string, code: string, ttl: number = 300) {
  memoryStore.set(key, code);
  setTimeout(() => memoryStore.delete(key), ttl * 1000);
}

async function getCode(key: string) {
  return memoryStore.get(key) || null;
}

async function deleteCode(key: string) {
  memoryStore.delete(key);
}

async function checkWhitelist(platform: string, value: string) {
  try {
    const whitelistConfig = await (WhitelistConfig as any).getConfig();
    if (!whitelistConfig || !whitelistConfig.enabled) {
      return true;
    }

    const entry = await Whitelist.findOne({
      platform,
      value: value.toLowerCase(),
      enabled: true,
    });

    return !!entry;
  } catch (error) {
    logger.error({ error, platform, value }, 'Check whitelist error');
    return true;
  }
}

class ThirdPartyAuthController extends BaseController {
  static get ControllerName() { return 'ThirdPartyAuthController'; }

  static async getEnabledProviders(ctx: Koa.Context) {
    try {
      const configs = await ThirdPartyAuthConfig.find({ enabled: true }).sort({ provider: 1 });
      const providers = configs.map(cfg => ({
        provider: cfg.provider,
        name: cfg.provider.charAt(0).toUpperCase() + cfg.provider.slice(1),
      }));
      ctx.body = ThirdPartyAuthController.success(providers);
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error(error.message || '获取提供者失败');
    }
  }

  static async githubAuth(ctx: Koa.Context) {
    try {
      const { redirectUrl } = ctx.query as any;
      const githubConfig = await ThirdPartyAuthConfig.findOne({ provider: 'github', enabled: true });
      
      if (!githubConfig) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('GitHub OAuth 未启用');
        return;
      }

      const clientId = githubConfig.config?.clientId;
      const redirectUri = githubConfig.config?.redirectUri || `${config.APP_URL}/api/auth/github/callback`;
      const state = crypto.randomBytes(16).toString('hex');
      
      await storeCode(`github:state:${state}`, redirectUrl || '/', 600);
      ctx.redirect(`https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${state}`);
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error('GitHub 登录跳转失败');
    }
  }

  static async emailLogin(ctx: Koa.Context) {
    try {
      const { email, code } = ctx.request.body as any;
      if (!email || !code) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('邮箱和验证码不能为空');
        return;
      }

      const normalizedEmail = email.toLowerCase();
      const storedCode = await getCode(`email:code:${normalizedEmail}`);
      
      if (!storedCode || storedCode !== code) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('验证码错误或已过期');
        return;
      }

      await deleteCode(`email:code:${normalizedEmail}`);

      let user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        user = new User({
          username: normalizedEmail.split('@')[0],
          email: normalizedEmail,
          password: crypto.randomBytes(16).toString('hex'),
          ssoProvider: 'email',
          role: 'guest',
        });
        await user.save();
      }

      const token = jwt.sign({ userId: user._id }, getJWTSecret(), {
        expiresIn: getJWTExpiresIn() as any,
      });

      ctx.body = ThirdPartyAuthController.success({
        token,
        user: (user as any).toJSON(),
      }, '登录成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error(error.message || '邮箱登录失败');
    }
  }
}

export default ThirdPartyAuthController;
