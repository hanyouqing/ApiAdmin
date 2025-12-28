import jwt from 'jsonwebtoken';
import { BaseController } from './Base.js';
import { validateEmail, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import User from '../Models/User.js';
import WhitelistConfig from '../Models/WhitelistConfig.js';
import Whitelist from '../Models/Whitelist.js';
import ThirdPartyAuthConfig from '../Models/ThirdPartyAuthConfig.js';
import config from '../Utils/config.js';
import { sendEmail } from '../Utils/emailService.js';
import { logLogin } from '../Utils/loginLogger.js';
import crypto from 'crypto';
// import Redis from 'ioredis'; // 如果安装了 ioredis，取消注释

// Redis 客户端（如果配置了）
let redis = null;
let RedisClass = null;

// 尝试加载 Redis（如果可用）
(async () => {
  if (config.REDIS_URL) {
    try {
      const RedisModule = await import('ioredis').catch(() => null);
      if (RedisModule) {
        RedisClass = RedisModule.default;
        redis = new RedisClass(config.REDIS_URL);
        redis.on('error', (error) => {
          logger.warn({ error }, 'Redis connection error');
        });
        logger.info('Redis connected');
      }
    } catch (error) {
      logger.warn({ error }, 'Redis not available, using in-memory storage');
    }
  }
})();

// 内存存储（Redis 不可用时的降级方案）
const memoryStore = new Map();

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

async function storeCode(key, code, ttl = 300) {
  if (redis) {
    await redis.setex(key, ttl, code);
  } else {
    memoryStore.set(key, code);
    setTimeout(() => memoryStore.delete(key), ttl * 1000);
  }
}

async function getCode(key) {
  if (redis) {
    return await redis.get(key);
  } else {
    return memoryStore.get(key) || null;
  }
}

async function deleteCode(key) {
  if (redis) {
    await redis.del(key);
  } else {
    memoryStore.delete(key);
  }
}

async function checkWhitelist(platform, value) {
  const whitelistConfig = await WhitelistConfig.getConfig();
  if (!whitelistConfig.enabled) {
    return true;
  }

  const entry = await Whitelist.findOne({
    platform,
    value,
    enabled: true,
  });

  return !!entry;
}

function generateToken() {
  return jwt.sign({}, getJWTSecret(), {
    expiresIn: getJWTExpiresIn(),
  });
}

class ThirdPartyAuthController extends BaseController {
  static get ControllerName() { return 'ThirdPartyAuthController'; }

  // 获取所有第三方登录配置
  static async getConfig(ctx) {
    try {
      const configs = await ThirdPartyAuthConfig.find({}).sort({ provider: 1 });

      // 转换为前端需要的格式
      const result = {
        github: { enabled: false },
        gitlab: { enabled: false },
        google: { enabled: false },
        wechat: { enabled: false },
        phone: { enabled: false },
        email: { enabled: false },
      };

      for (const cfg of configs) {
        result[cfg.provider] = {
          enabled: cfg.enabled,
          ...cfg.config,
        };
      }

      ctx.body = ThirdPartyAuthController.success(result);
    } catch (error) {
      logger.error({ error }, 'Get third party auth config error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error(
        process.env.NODE_ENV === 'production'
          ? '获取第三方登录配置失败'
          : error.message || '获取第三方登录配置失败'
      );
    }
  }

  // 更新特定提供者的配置
  static async updateProviderConfig(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = ThirdPartyAuthController.error('无权限修改第三方登录配置');
        return;
      }

      const { provider } = ctx.params;
      const { enabled, ...configData } = ctx.request.body;

      if (!['github', 'gitlab', 'google', 'wechat', 'phone', 'email'].includes(provider)) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('无效的提供者类型');
        return;
      }

      // 根据提供者类型验证必需字段
      if (provider === 'github' || provider === 'gitlab' || provider === 'google') {
        if (configData.clientId && !configData.clientSecret) {
          ctx.status = 400;
          ctx.body = ThirdPartyAuthController.error('Client Secret 不能为空');
          return;
        }
      } else if (provider === 'wechat') {
        if (configData.appId && !configData.appSecret) {
          ctx.status = 400;
          ctx.body = ThirdPartyAuthController.error('App Secret 不能为空');
          return;
        }
      } else if (provider === 'phone') {
        if (configData.provider && !configData.accessKeyId) {
          ctx.status = 400;
          ctx.body = ThirdPartyAuthController.error('Access Key ID 不能为空');
          return;
        }
      }

      // 更新或创建配置
      const config = await ThirdPartyAuthConfig.findOneAndUpdate(
        { provider },
        {
          $set: {
            enabled: enabled !== undefined ? enabled : false,
            config: configData,
            updatedBy: user._id,
          },
        },
        { upsert: true, new: true }
      );

      logger.info({ userId: user._id, provider }, 'Third party auth config updated');

      ctx.body = ThirdPartyAuthController.success(config, '配置更新成功');
    } catch (error) {
      logger.error({ error }, 'Update third party auth config error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error(
        process.env.NODE_ENV === 'production'
          ? '配置更新失败'
          : error.message || '配置更新失败'
      );
    }
  }

  // GitHub 登录
  static async githubAuth(ctx) {
    try {
      const { redirectUrl } = ctx.query;
      const clientId = config.GITHUB_CLIENT_ID;
      const redirectUri = `${config.BASE_URL || 'http://localhost:3000'}/api/auth/github/callback`;

      if (!clientId) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('GitHub OAuth 未配置');
        return;
      }

      const state = crypto.randomBytes(16).toString('hex');
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email&state=${state}`;

      // 存储 state 和 redirectUrl
      await storeCode(`github:state:${state}`, redirectUrl || '/', 600);

      ctx.redirect(authUrl);
    } catch (error) {
      logger.error({ error }, 'GitHub auth error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error('GitHub 登录失败');
    }
  }

  static async githubCallback(ctx) {
    try {
      const { code, state } = ctx.query;

      if (!code) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('授权码缺失');
        return;
      }

      // 获取存储的 redirectUrl
      const redirectUrl = await getCode(`github:state:${state}`);
      await deleteCode(`github:state:${state}`);

      // TODO: 使用 code 换取 access_token
      // TODO: 使用 access_token 获取用户信息
      // TODO: 检查白名单
      // TODO: 创建或查找用户
      // TODO: 生成 JWT token

      // 临时实现
      ctx.body = ThirdPartyAuthController.success({
        code,
        state,
        redirectUrl,
      }, '请实现完整的 GitHub OAuth 流程');
    } catch (error) {
      logger.error({ error }, 'GitHub callback error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error('GitHub 回调处理失败');
    }
  }

  // 手机号登录
  static async sendPhoneCode(ctx) {
    try {
      const { phone } = ctx.request.body;

      if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('手机号格式不正确');
        return;
      }

      // 检查白名单
      const inWhitelist = await checkWhitelist('phone', phone);
      if (!inWhitelist) {
        ctx.status = 403;
        ctx.body = ThirdPartyAuthController.error('手机号不在白名单中');
        return;
      }

      // 检查发送频率（防止滥用）
      const rateLimitKey = `phone:rate:${phone}`;
      const lastSent = await getCode(rateLimitKey);
      if (lastSent) {
        ctx.status = 429;
        ctx.body = ThirdPartyAuthController.error('发送过于频繁，请稍后再试');
        return;
      }

      // 生成验证码
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // 存储验证码（5分钟过期）
      await storeCode(`phone:code:${phone}`, code, 300);
      await storeCode(rateLimitKey, '1', 60); // 1分钟内不能重复发送

      // TODO: 发送短信（集成短信服务）
      logger.info({ phone }, `Phone verification code: ${code}`);

      ctx.body = ThirdPartyAuthController.success(null, '验证码已发送');
    } catch (error) {
      logger.error({ error }, 'Send phone code error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error('发送验证码失败');
    }
  }

  static async phoneLogin(ctx) {
    try {
      const { phone, code } = ctx.request.body;
      const userAgent = ctx.headers['user-agent'] || '';
      const ip = ctx.ip || ctx.request.ip || '';

      if (!phone || !code) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('手机号和验证码不能为空');
        return;
      }

      // 验证验证码
      const storedCode = await getCode(`phone:code:${phone}`);
      if (!storedCode || storedCode !== code) {
        // 记录失败的登录日志
        await logLogin({
          username: `user_${phone.slice(-4)}`,
          email: `${phone}@phone.local`,
          loginType: 'phone',
          status: 'failed',
          failureReason: '验证码错误或已过期',
          ip,
          userAgent,
        });
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('验证码错误或已过期');
        return;
      }

      // 删除验证码
      await deleteCode(`phone:code:${phone}`);

      // 查找或创建用户
      let user = await User.findOne({
        phone,
        ssoProvider: 'phone',
      });

      if (!user) {
        user = new User({
          username: `user_${phone.slice(-4)}`,
          email: `${phone}@phone.local`,
          password: crypto.randomBytes(16).toString('hex'), // 随机密码，手机号登录不需要密码
          phone,
          ssoProvider: 'phone',
          role: 'guest',
        });
        await user.save();
        logger.info({ userId: user._id, phone }, 'User created via phone login');
      }

      // 生成 JWT token
      const token = jwt.sign({ userId: user._id }, getJWTSecret(), {
        expiresIn: getJWTExpiresIn(),
      });

      logger.info({ userId: user._id, phone }, 'User logged in via phone');

      // 记录成功的登录日志
      await logLogin({
        userId: user._id,
        username: user.username,
        email: user.email,
        loginType: 'phone',
        status: 'success',
        ip,
        userAgent,
      });

      ctx.body = ThirdPartyAuthController.success({
        token,
        user: user.toJSON(),
      }, '登录成功');
    } catch (error) {
      logger.error({ error }, 'Phone login error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error('手机号登录失败');
    }
  }

  // 邮箱验证码登录
  static async sendEmailCode(ctx) {
    try {
      const { email } = ctx.request.body;

      if (!email || !validateEmail(email)) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('邮箱格式不正确');
        return;
      }

      // 检查白名单
      const inWhitelist = await checkWhitelist('email', email);
      if (!inWhitelist) {
        ctx.status = 403;
        ctx.body = ThirdPartyAuthController.error('邮箱不在白名单中');
        return;
      }

      // 检查发送频率
      const rateLimitKey = `email:rate:${email}`;
      const lastSent = await getCode(rateLimitKey);
      if (lastSent) {
        ctx.status = 429;
        ctx.body = ThirdPartyAuthController.error('发送过于频繁，请稍后再试');
        return;
      }

      // 生成验证码
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // 存储验证码（5分钟过期）
      await storeCode(`email:code:${email}`, code, 300);
      await storeCode(rateLimitKey, '1', 60);

      // 发送邮件
      try {
        await sendEmail(
          email,
          'ApiAdmin 登录验证码',
          `<p>您的登录验证码是：<strong>${code}</strong></p><p>验证码5分钟内有效。</p>`
        );
      } catch (error) {
        logger.error({ error, email }, 'Failed to send email code');
        ctx.status = 500;
        ctx.body = ThirdPartyAuthController.error('发送邮件失败');
        return;
      }

      ctx.body = ThirdPartyAuthController.success(null, '验证码已发送到邮箱');
    } catch (error) {
      logger.error({ error }, 'Send email code error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error('发送验证码失败');
    }
  }

  static async emailLogin(ctx) {
    try {
      const { email, code } = ctx.request.body;
      const userAgent = ctx.headers['user-agent'] || '';
      const ip = ctx.ip || ctx.request.ip || '';

      if (!email || !code) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('邮箱和验证码不能为空');
        return;
      }

      // 验证验证码
      const storedCode = await getCode(`email:code:${email}`);
      if (!storedCode || storedCode !== code) {
        // 记录失败的登录日志
        await logLogin({
          username: email.split('@')[0] || email,
          email: email.toLowerCase(),
          loginType: 'email',
          status: 'failed',
          failureReason: '验证码错误或已过期',
          ip,
          userAgent,
        });
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('验证码错误或已过期');
        return;
      }

      // 删除验证码
      await deleteCode(`email:code:${email}`);

      // 查找或创建用户
      let user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        user = new User({
          username: email.split('@')[0],
          email: email.toLowerCase(),
          password: crypto.randomBytes(16).toString('hex'),
          ssoProvider: 'email',
          role: 'guest',
        });
        await user.save();
        logger.info({ userId: user._id, email }, 'User created via email login');
      }

      // 生成 JWT token
      const token = jwt.sign({ userId: user._id }, getJWTSecret(), {
        expiresIn: getJWTExpiresIn(),
      });

      logger.info({ userId: user._id, email }, 'User logged in via email');

      // 记录成功的登录日志
      await logLogin({
        userId: user._id,
        username: user.username,
        email: user.email,
        loginType: 'email',
        status: 'success',
        ip,
        userAgent,
      });

      ctx.body = ThirdPartyAuthController.success({
        token,
        user: user.toJSON(),
      }, '登录成功');
    } catch (error) {
      logger.error({ error }, 'Email login error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error('邮箱登录失败');
    }
  }
}

export default ThirdPartyAuthController;

