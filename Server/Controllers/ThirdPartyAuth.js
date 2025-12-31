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
  try {
    const whitelistConfig = await WhitelistConfig.getConfig();
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
    // 如果检查白名单时出错，默认允许（避免因为白名单检查失败而阻止登录）
    return true;
  }
}

function generateToken() {
  return jwt.sign({}, getJWTSecret(), {
    expiresIn: getJWTExpiresIn(),
  });
}

class ThirdPartyAuthController extends BaseController {
  static get ControllerName() { return 'ThirdPartyAuthController'; }

  // 获取所有第三方登录配置（需要认证，用于管理页面）
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

  // 获取已启用的第三方登录提供者（公开接口，用于登录页面）
  static async getEnabledProviders(ctx) {
    try {
      const configs = await ThirdPartyAuthConfig.find({ enabled: true }).sort({ provider: 1 });

      // 只返回已启用的提供者列表，不包含敏感信息
      const providers = configs.map(cfg => ({
        provider: cfg.provider,
        name: cfg.provider === 'github' ? 'GitHub' :
              cfg.provider === 'gitlab' ? 'GitLab' :
              cfg.provider === 'google' ? 'Google' :
              cfg.provider === 'wechat' ? '微信' :
              cfg.provider === 'phone' ? '手机号' :
              cfg.provider === 'email' ? '邮箱' : cfg.provider,
      }));

      ctx.body = ThirdPartyAuthController.success(providers);
    } catch (error) {
      logger.error({ error }, 'Get enabled third party auth providers error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error(
        process.env.NODE_ENV === 'production'
          ? '获取第三方登录提供者失败'
          : error.message || '获取第三方登录提供者失败'
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
      
      // 从数据库获取 GitHub 配置
      const githubConfig = await ThirdPartyAuthConfig.findOne({ provider: 'github' });
      
      if (!githubConfig || !githubConfig.enabled) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('GitHub OAuth 未配置或未启用');
        return;
      }

      const clientId = githubConfig.config?.clientId;
      const redirectUri = githubConfig.config?.redirectUri || `${config.APP_URL || 'http://localhost:3000'}/api/auth/github/callback`;

      if (!clientId) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('GitHub OAuth Client ID 未配置');
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
      const userAgent = ctx.headers['user-agent'] || '';
      const ip = ctx.ip || ctx.request.ip || '';

      if (!code) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('授权码缺失');
        return;
      }

      // 获取存储的 redirectUrl
      const redirectUrl = await getCode(`github:state:${state}`);
      await deleteCode(`github:state:${state}`);

      // 从数据库获取 GitHub 配置
      const githubConfig = await ThirdPartyAuthConfig.findOne({ provider: 'github' });
      
      if (!githubConfig || !githubConfig.enabled) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('GitHub OAuth 未配置或未启用');
        return;
      }

      const clientId = githubConfig.config?.clientId;
      const clientSecret = githubConfig.config?.clientSecret;
      const redirectUri = githubConfig.config?.redirectUri || `${config.APP_URL || 'http://localhost:3000'}/api/auth/github/callback`;

      if (!clientId || !clientSecret) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('GitHub OAuth 配置不完整');
        return;
      }

      // 使用 code 换取 access_token
      const axios = (await import('axios')).default;
      let tokenResponse;
      try {
        tokenResponse = await axios.post(
          'https://github.com/login/oauth/access_token',
          {
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
          },
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );
      } catch (tokenError) {
        logger.error({ error: tokenError }, 'Failed to exchange code for token');
        ctx.status = 500;
        ctx.body = ThirdPartyAuthController.error('获取访问令牌失败');
        return;
      }

      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken) {
        logger.error({ response: tokenResponse.data }, 'No access token in response');
        ctx.status = 500;
        ctx.body = ThirdPartyAuthController.error('获取访问令牌失败');
        return;
      }

      // 使用 access_token 获取用户信息
      let userInfo;
      try {
        const userInfoResponse = await axios.get('https://api.github.com/user', {
          headers: {
            'Authorization': `token ${accessToken}`,
            'Accept': 'application/json',
            'User-Agent': 'ApiAdmin',
          },
        });
        userInfo = userInfoResponse.data;
      } catch (userInfoError) {
        logger.error({ error: userInfoError }, 'Failed to get GitHub user info');
        ctx.status = 500;
        ctx.body = ThirdPartyAuthController.error('获取用户信息失败');
        return;
      }

      const githubUsername = userInfo.login;
      const githubEmail = userInfo.email;

      // 如果用户信息中没有邮箱，尝试获取邮箱列表
      let email = githubEmail;
      if (!email) {
        try {
          const emailsResponse = await axios.get('https://api.github.com/user/emails', {
            headers: {
              'Authorization': `token ${accessToken}`,
              'Accept': 'application/json',
              'User-Agent': 'ApiAdmin',
            },
          });
          const primaryEmail = emailsResponse.data.find((e) => e.primary);
          email = primaryEmail ? primaryEmail.email : emailsResponse.data[0]?.email;
        } catch (emailError) {
          logger.warn({ error: emailError }, 'Failed to get GitHub user emails');
        }
      }

      if (!email) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('无法获取 GitHub 邮箱信息，请确保 GitHub 账号已设置公开邮箱');
        return;
      }

      // 检查白名单
      const inWhitelist = await checkWhitelist('github', githubUsername);
      if (!inWhitelist) {
        await logLogin({
          username: githubUsername,
          email: email,
          loginType: 'github',
          status: 'failed',
          failureReason: 'GitHub 用户名不在白名单中',
          ip,
          userAgent,
        });
        ctx.status = 403;
        ctx.body = ThirdPartyAuthController.error('GitHub 用户名不在白名单中');
        return;
      }

      // 创建或查找用户
      let user = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { ssoProvider: 'github', 'ssoId': userInfo.id.toString() },
        ],
      });

      if (!user) {
        // 检查用户名是否已存在
        let username = githubUsername;
        let usernameExists = await User.findOne({ username });
        let counter = 1;
        while (usernameExists) {
          username = `${githubUsername}_${counter}`;
          usernameExists = await User.findOne({ username });
          counter++;
        }

        user = new User({
          username,
          email: email.toLowerCase(),
          password: crypto.randomBytes(16).toString('hex'), // 随机密码，GitHub 登录不需要密码
          ssoProvider: 'github',
          ssoId: userInfo.id.toString(),
          avatar: userInfo.avatar_url || '',
          role: 'guest',
        });
        await user.save();
        logger.info({ userId: user._id, githubUsername, email }, 'User created via GitHub login');
      } else {
        // 更新用户的 GitHub 信息
        if (!user.ssoProvider || user.ssoProvider !== 'github') {
          user.ssoProvider = 'github';
        }
        if (!user.ssoId) {
          user.ssoId = userInfo.id.toString();
        }
        if (userInfo.avatar_url && !user.avatar) {
          user.avatar = userInfo.avatar_url;
        }
        await user.save();
      }

      // 生成 JWT token
      const token = jwt.sign({ userId: user._id }, getJWTSecret(), {
        expiresIn: getJWTExpiresIn(),
      });

      logger.info({ userId: user._id, githubUsername, email }, 'User logged in via GitHub');

      // 记录成功的登录日志
      await logLogin({
        userId: user._id,
        username: user.username,
        email: user.email,
        loginType: 'github',
        status: 'success',
        ip,
        userAgent,
      });

      // 如果有 redirectUrl，重定向；否则返回 JSON
      if (redirectUrl) {
        ctx.redirect(`${redirectUrl}?token=${token}`);
      } else {
        ctx.body = ThirdPartyAuthController.success({
          token,
          user: user.toJSON(),
        }, '登录成功');
      }
    } catch (error) {
      logger.error({ error }, 'GitHub callback error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error(
        process.env.NODE_ENV === 'production'
          ? 'GitHub 回调处理失败'
          : error.message || 'GitHub 回调处理失败'
      );
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

  // GitLab 登录
  static async gitlabAuth(ctx) {
    try {
      const { redirectUrl } = ctx.query;
      
      // 从数据库获取 GitLab 配置
      const gitlabConfig = await ThirdPartyAuthConfig.findOne({ provider: 'gitlab' });
      
      if (!gitlabConfig || !gitlabConfig.enabled) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('GitLab OAuth 未配置或未启用');
        return;
      }

      const clientId = gitlabConfig.config?.clientId;
      const redirectUri = gitlabConfig.config?.redirectUri || `${config.APP_URL || 'http://localhost:3000'}/api/auth/gitlab/callback`;
      const gitlabUrl = gitlabConfig.config?.gitlabUrl || 'https://gitlab.com';

      if (!clientId) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('GitLab OAuth Client ID 未配置');
        return;
      }

      const state = crypto.randomBytes(16).toString('hex');
      const authUrl = `${gitlabUrl}/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=read_user&state=${state}`;

      // 存储 state 和 redirectUrl
      await storeCode(`gitlab:state:${state}`, redirectUrl || '/', 600);

      ctx.redirect(authUrl);
    } catch (error) {
      logger.error({ error }, 'GitLab auth error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error('GitLab 登录失败');
    }
  }

  static async gitlabCallback(ctx) {
    try {
      const { code, state } = ctx.query;
      const userAgent = ctx.headers['user-agent'] || '';
      const ip = ctx.ip || ctx.request.ip || '';

      if (!code) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('授权码缺失');
        return;
      }

      // 获取存储的 redirectUrl
      const redirectUrl = await getCode(`gitlab:state:${state}`);
      await deleteCode(`gitlab:state:${state}`);

      // 从数据库获取 GitLab 配置
      const gitlabConfig = await ThirdPartyAuthConfig.findOne({ provider: 'gitlab' });
      
      if (!gitlabConfig || !gitlabConfig.enabled) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('GitLab OAuth 未配置或未启用');
        return;
      }

      const clientId = gitlabConfig.config?.clientId;
      const clientSecret = gitlabConfig.config?.clientSecret;
      const redirectUri = gitlabConfig.config?.redirectUri || `${config.APP_URL || 'http://localhost:3000'}/api/auth/gitlab/callback`;
      const gitlabUrl = gitlabConfig.config?.gitlabUrl || 'https://gitlab.com';

      if (!clientId || !clientSecret) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('GitLab OAuth 配置不完整');
        return;
      }

      // 使用 code 换取 access_token
      const axios = (await import('axios')).default;
      let tokenResponse;
      try {
        tokenResponse = await axios.post(
          `${gitlabUrl}/oauth/token`,
          {
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          },
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );
      } catch (tokenError) {
        logger.error({ error: tokenError }, 'Failed to exchange code for token');
        ctx.status = 500;
        ctx.body = ThirdPartyAuthController.error('获取访问令牌失败');
        return;
      }

      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken) {
        logger.error({ response: tokenResponse.data }, 'No access token in response');
        ctx.status = 500;
        ctx.body = ThirdPartyAuthController.error('获取访问令牌失败');
        return;
      }

      // 使用 access_token 获取用户信息
      let userInfo;
      try {
        const userInfoResponse = await axios.get(`${gitlabUrl}/api/v4/user`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });
        userInfo = userInfoResponse.data;
      } catch (userInfoError) {
        logger.error({ error: userInfoError }, 'Failed to get GitLab user info');
        ctx.status = 500;
        ctx.body = ThirdPartyAuthController.error('获取用户信息失败');
        return;
      }

      const gitlabUsername = userInfo.username;
      const gitlabEmail = userInfo.email;

      if (!gitlabEmail) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('无法获取 GitLab 邮箱信息');
        return;
      }

      // 检查白名单
      const inWhitelist = await checkWhitelist('gitlab', gitlabUsername);
      if (!inWhitelist) {
        await logLogin({
          username: gitlabUsername,
          email: gitlabEmail,
          loginType: 'gitlab',
          status: 'failed',
          failureReason: 'GitLab 用户名不在白名单中',
          ip,
          userAgent,
        });
        ctx.status = 403;
        ctx.body = ThirdPartyAuthController.error('GitLab 用户名不在白名单中');
        return;
      }

      // 创建或查找用户
      let user = await User.findOne({
        $or: [
          { email: gitlabEmail.toLowerCase() },
          { ssoProvider: 'gitlab', ssoId: userInfo.id.toString() },
        ],
      });

      if (!user) {
        // 检查用户名是否已存在
        let username = gitlabUsername;
        let usernameExists = await User.findOne({ username });
        let counter = 1;
        while (usernameExists) {
          username = `${gitlabUsername}_${counter}`;
          usernameExists = await User.findOne({ username });
          counter++;
        }

        user = new User({
          username,
          email: gitlabEmail.toLowerCase(),
          password: crypto.randomBytes(16).toString('hex'),
          ssoProvider: 'gitlab',
          ssoId: userInfo.id.toString(),
          avatar: userInfo.avatar_url || '',
          role: 'guest',
        });
        await user.save();
        logger.info({ userId: user._id, gitlabUsername, email: gitlabEmail }, 'User created via GitLab login');
      } else {
        // 更新用户的 GitLab 信息
        if (!user.ssoProvider || user.ssoProvider !== 'gitlab') {
          user.ssoProvider = 'gitlab';
        }
        if (!user.ssoId) {
          user.ssoId = userInfo.id.toString();
        }
        if (userInfo.avatar_url && !user.avatar) {
          user.avatar = userInfo.avatar_url;
        }
        await user.save();
      }

      // 生成 JWT token
      const token = jwt.sign({ userId: user._id }, getJWTSecret(), {
        expiresIn: getJWTExpiresIn(),
      });

      logger.info({ userId: user._id, gitlabUsername, email: gitlabEmail }, 'User logged in via GitLab');

      // 记录成功的登录日志
      await logLogin({
        userId: user._id,
        username: user.username,
        email: user.email,
        loginType: 'gitlab',
        status: 'success',
        ip,
        userAgent,
      });

      // 如果有 redirectUrl，重定向；否则返回 JSON
      if (redirectUrl) {
        ctx.redirect(`${redirectUrl}?token=${token}`);
      } else {
        ctx.body = ThirdPartyAuthController.success({
          token,
          user: user.toJSON(),
        }, '登录成功');
      }
    } catch (error) {
      logger.error({ error }, 'GitLab callback error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error(
        process.env.NODE_ENV === 'production'
          ? 'GitLab 回调处理失败'
          : error.message || 'GitLab 回调处理失败'
      );
    }
  }

  // Gmail (Google) 登录
  static async gmailAuth(ctx) {
    try {
      const { redirectUrl } = ctx.query;
      
      // 从数据库获取 Google 配置
      const googleConfig = await ThirdPartyAuthConfig.findOne({ provider: 'google' });
      
      if (!googleConfig || !googleConfig.enabled) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('Google OAuth 未配置或未启用');
        return;
      }

      const clientId = googleConfig.config?.clientId;
      const redirectUri = googleConfig.config?.redirectUri || `${config.APP_URL || 'http://localhost:3000'}/api/auth/gmail/callback`;

      if (!clientId) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('Google OAuth Client ID 未配置');
        return;
      }

      const state = crypto.randomBytes(16).toString('hex');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&state=${state}`;

      // 存储 state 和 redirectUrl
      await storeCode(`gmail:state:${state}`, redirectUrl || '/', 600);

      ctx.redirect(authUrl);
    } catch (error) {
      logger.error({ error }, 'Gmail auth error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error('Gmail 登录失败');
    }
  }

  static async gmailCallback(ctx) {
    try {
      const { code, state } = ctx.query;
      const userAgent = ctx.headers['user-agent'] || '';
      const ip = ctx.ip || ctx.request.ip || '';

      if (!code) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('授权码缺失');
        return;
      }

      // 获取存储的 redirectUrl
      const redirectUrl = await getCode(`gmail:state:${state}`);
      await deleteCode(`gmail:state:${state}`);

      // 从数据库获取 Google 配置
      const googleConfig = await ThirdPartyAuthConfig.findOne({ provider: 'google' });
      
      if (!googleConfig || !googleConfig.enabled) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('Google OAuth 未配置或未启用');
        return;
      }

      const clientId = googleConfig.config?.clientId;
      const clientSecret = googleConfig.config?.clientSecret;
      const redirectUri = googleConfig.config?.redirectUri || `${config.APP_URL || 'http://localhost:3000'}/api/auth/gmail/callback`;

      if (!clientId || !clientSecret) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('Google OAuth 配置不完整');
        return;
      }

      // 使用 code 换取 access_token
      const axios = (await import('axios')).default;
      let tokenResponse;
      try {
        tokenResponse = await axios.post(
          'https://oauth2.googleapis.com/token',
          {
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          },
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
      } catch (tokenError) {
        logger.error({ error: tokenError }, 'Failed to exchange code for token');
        ctx.status = 500;
        ctx.body = ThirdPartyAuthController.error('获取访问令牌失败');
        return;
      }

      const accessToken = tokenResponse.data?.access_token;
      if (!accessToken) {
        logger.error({ response: tokenResponse.data }, 'No access token in response');
        ctx.status = 500;
        ctx.body = ThirdPartyAuthController.error('获取访问令牌失败');
        return;
      }

      // 使用 access_token 获取用户信息
      let userInfo;
      try {
        const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });
        userInfo = userInfoResponse.data;
      } catch (userInfoError) {
        logger.error({ error: userInfoError }, 'Failed to get Google user info');
        ctx.status = 500;
        ctx.body = ThirdPartyAuthController.error('获取用户信息失败');
        return;
      }

      const googleEmail = userInfo.email;
      const googleName = userInfo.name || userInfo.email.split('@')[0];

      if (!googleEmail) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('无法获取 Google 邮箱信息');
        return;
      }

      // 检查白名单
      const inWhitelist = await checkWhitelist('gmail', googleEmail);
      if (!inWhitelist) {
        await logLogin({
          username: googleName,
          email: googleEmail,
          loginType: 'gmail',
          status: 'failed',
          failureReason: 'Gmail 邮箱不在白名单中',
          ip,
          userAgent,
        });
        ctx.status = 403;
        ctx.body = ThirdPartyAuthController.error('Gmail 邮箱不在白名单中');
        return;
      }

      // 创建或查找用户
      let user = await User.findOne({
        $or: [
          { email: googleEmail.toLowerCase() },
          { ssoProvider: 'google', ssoId: userInfo.id },
        ],
      });

      if (!user) {
        // 检查用户名是否已存在
        let username = googleName;
        let usernameExists = await User.findOne({ username });
        let counter = 1;
        while (usernameExists) {
          username = `${googleName}_${counter}`;
          usernameExists = await User.findOne({ username });
          counter++;
        }

        user = new User({
          username,
          email: googleEmail.toLowerCase(),
          password: crypto.randomBytes(16).toString('hex'),
          ssoProvider: 'google',
          ssoId: userInfo.id,
          avatar: userInfo.picture || '',
          role: 'guest',
        });
        await user.save();
        logger.info({ userId: user._id, googleEmail }, 'User created via Gmail login');
      } else {
        // 更新用户的 Google 信息
        if (!user.ssoProvider || user.ssoProvider !== 'google') {
          user.ssoProvider = 'google';
        }
        if (!user.ssoId) {
          user.ssoId = userInfo.id;
        }
        if (userInfo.picture && !user.avatar) {
          user.avatar = userInfo.picture;
        }
        await user.save();
      }

      // 生成 JWT token
      const token = jwt.sign({ userId: user._id }, getJWTSecret(), {
        expiresIn: getJWTExpiresIn(),
      });

      logger.info({ userId: user._id, googleEmail }, 'User logged in via Gmail');

      // 记录成功的登录日志
      await logLogin({
        userId: user._id,
        username: user.username,
        email: user.email,
        loginType: 'gmail',
        status: 'success',
        ip,
        userAgent,
      });

      // 如果有 redirectUrl，重定向；否则返回 JSON
      if (redirectUrl) {
        ctx.redirect(`${redirectUrl}?token=${token}`);
      } else {
        ctx.body = ThirdPartyAuthController.success({
          token,
          user: user.toJSON(),
        }, '登录成功');
      }
    } catch (error) {
      logger.error({ error }, 'Gmail callback error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error(
        process.env.NODE_ENV === 'production'
          ? 'Gmail 回调处理失败'
          : error.message || 'Gmail 回调处理失败'
      );
    }
  }

  // 微信登录
  static async wechatAuth(ctx) {
    try {
      const { redirectUrl } = ctx.query;
      
      // 从数据库获取微信配置
      const wechatConfig = await ThirdPartyAuthConfig.findOne({ provider: 'wechat' });
      
      if (!wechatConfig || !wechatConfig.enabled) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('微信 OAuth 未配置或未启用');
        return;
      }

      const appId = wechatConfig.config?.appId;
      const redirectUri = wechatConfig.config?.redirectUri || `${config.APP_URL || 'http://localhost:3000'}/api/auth/wechat/callback`;

      if (!appId) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('微信 App ID 未配置');
        return;
      }

      const state = crypto.randomBytes(16).toString('hex');
      const authUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;

      // 存储 state 和 redirectUrl
      await storeCode(`wechat:state:${state}`, redirectUrl || '/', 600);

      ctx.redirect(authUrl);
    } catch (error) {
      logger.error({ error }, 'WeChat auth error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error('微信登录失败');
    }
  }

  static async wechatCallback(ctx) {
    try {
      const { code, state } = ctx.query;
      const userAgent = ctx.headers['user-agent'] || '';
      const ip = ctx.ip || ctx.request.ip || '';

      if (!code) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('授权码缺失');
        return;
      }

      // 获取存储的 redirectUrl
      const redirectUrl = await getCode(`wechat:state:${state}`);
      await deleteCode(`wechat:state:${state}`);

      // 从数据库获取微信配置
      const wechatConfig = await ThirdPartyAuthConfig.findOne({ provider: 'wechat' });
      
      if (!wechatConfig || !wechatConfig.enabled) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('微信 OAuth 未配置或未启用');
        return;
      }

      const appId = wechatConfig.config?.appId;
      const appSecret = wechatConfig.config?.appSecret;
      const redirectUri = wechatConfig.config?.redirectUri || `${config.APP_URL || 'http://localhost:3000'}/api/auth/wechat/callback`;

      if (!appId || !appSecret) {
        ctx.status = 400;
        ctx.body = ThirdPartyAuthController.error('微信 OAuth 配置不完整');
        return;
      }

      // 使用 code 换取 access_token
      const axios = (await import('axios')).default;
      let tokenResponse;
      try {
        tokenResponse = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
          params: {
            appid: appId,
            secret: appSecret,
            code,
            grant_type: 'authorization_code',
          },
        });
      } catch (tokenError) {
        logger.error({ error: tokenError }, 'Failed to exchange code for token');
        ctx.status = 500;
        ctx.body = ThirdPartyAuthController.error('获取访问令牌失败');
        return;
      }

      if (tokenResponse.data.errcode) {
        logger.error({ response: tokenResponse.data }, 'WeChat API error');
        ctx.status = 500;
        ctx.body = ThirdPartyAuthController.error(`微信 API 错误: ${tokenResponse.data.errmsg || '未知错误'}`);
        return;
      }

      const accessToken = tokenResponse.data?.access_token;
      const openid = tokenResponse.data?.openid;
      if (!accessToken || !openid) {
        logger.error({ response: tokenResponse.data }, 'No access token or openid in response');
        ctx.status = 500;
        ctx.body = ThirdPartyAuthController.error('获取访问令牌失败');
        return;
      }

      // 使用 access_token 获取用户信息
      let userInfo;
      try {
        const userInfoResponse = await axios.get('https://api.weixin.qq.com/sns/userinfo', {
          params: {
            access_token: accessToken,
            openid: openid,
          },
        });
        userInfo = userInfoResponse.data;
      } catch (userInfoError) {
        logger.error({ error: userInfoError }, 'Failed to get WeChat user info');
        ctx.status = 500;
        ctx.body = ThirdPartyAuthController.error('获取用户信息失败');
        return;
      }

      if (userInfo.errcode) {
        logger.error({ response: userInfo }, 'WeChat API error');
        ctx.status = 500;
        ctx.body = ThirdPartyAuthController.error(`微信 API 错误: ${userInfo.errmsg || '未知错误'}`);
        return;
      }

      const wechatNickname = userInfo.nickname || `wechat_${openid.slice(-8)}`;
      const wechatOpenId = openid;

      // 检查白名单
      const inWhitelist = await checkWhitelist('wechat', wechatOpenId);
      if (!inWhitelist) {
        await logLogin({
          username: wechatNickname,
          email: `${wechatOpenId}@wechat.local`,
          loginType: 'wechat',
          status: 'failed',
          failureReason: '微信 OpenID 不在白名单中',
          ip,
          userAgent,
        });
        ctx.status = 403;
        ctx.body = ThirdPartyAuthController.error('微信 OpenID 不在白名单中');
        return;
      }

      // 创建或查找用户
      let user = await User.findOne({
        $or: [
          { ssoProvider: 'wechat', ssoId: wechatOpenId },
        ],
      });

      if (!user) {
        // 检查用户名是否已存在
        let username = wechatNickname;
        let usernameExists = await User.findOne({ username });
        let counter = 1;
        while (usernameExists) {
          username = `${wechatNickname}_${counter}`;
          usernameExists = await User.findOne({ username });
          counter++;
        }

        // 生成一个唯一的邮箱
        let email = `${wechatOpenId}@wechat.local`;
        let emailExists = await User.findOne({ email });
        counter = 1;
        while (emailExists) {
          email = `${wechatOpenId}_${counter}@wechat.local`;
          emailExists = await User.findOne({ email });
          counter++;
        }

        user = new User({
          username,
          email: email.toLowerCase(),
          password: crypto.randomBytes(16).toString('hex'),
          ssoProvider: 'wechat',
          ssoId: wechatOpenId,
          avatar: userInfo.headimgurl || '',
          role: 'guest',
        });
        await user.save();
        logger.info({ userId: user._id, wechatOpenId }, 'User created via WeChat login');
      } else {
        // 更新用户的微信信息
        if (userInfo.headimgurl && !user.avatar) {
          user.avatar = userInfo.headimgurl;
        }
        await user.save();
      }

      // 生成 JWT token
      const token = jwt.sign({ userId: user._id }, getJWTSecret(), {
        expiresIn: getJWTExpiresIn(),
      });

      logger.info({ userId: user._id, wechatOpenId }, 'User logged in via WeChat');

      // 记录成功的登录日志
      await logLogin({
        userId: user._id,
        username: user.username,
        email: user.email,
        loginType: 'wechat',
        status: 'success',
        ip,
        userAgent,
      });

      // 如果有 redirectUrl，重定向；否则返回 JSON
      if (redirectUrl) {
        ctx.redirect(`${redirectUrl}?token=${token}`);
      } else {
        ctx.body = ThirdPartyAuthController.success({
          token,
          user: user.toJSON(),
        }, '登录成功');
      }
    } catch (error) {
      logger.error({ error }, 'WeChat callback error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error(
        process.env.NODE_ENV === 'production'
          ? '微信回调处理失败'
          : error.message || '微信回调处理失败'
      );
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

      // 统一使用小写邮箱
      const normalizedEmail = email.toLowerCase();

      // 检查白名单
      try {
        const inWhitelist = await checkWhitelist('email', normalizedEmail);
        if (!inWhitelist) {
          ctx.status = 403;
          ctx.body = ThirdPartyAuthController.error('邮箱不在白名单中');
          return;
        }
      } catch (whitelistError) {
        logger.error({ error: whitelistError, email: normalizedEmail }, 'Whitelist check failed, allowing request');
        // 如果白名单检查失败，记录错误但继续处理（避免因为白名单系统问题而阻止所有请求）
      }

      // 检查发送频率（基于邮箱地址，60秒内不能重复发送）
      const rateLimitKey = `email:rate:${normalizedEmail}`;
      const lastSent = await getCode(rateLimitKey);
      if (lastSent) {
        ctx.status = 429;
        ctx.body = ThirdPartyAuthController.error('发送过于频繁，请60秒后再试');
        return;
      }

      // 生成验证码
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // 存储验证码（5分钟过期），使用标准化的邮箱地址
      await storeCode(`email:code:${normalizedEmail}`, code, 300);
      await storeCode(rateLimitKey, '1', 60);

      // 从数据库加载邮件配置
      let emailConfig = null;
      try {
        const dbConfig = await EmailConfigModel.getConfig();
        if (dbConfig) {
          emailConfig = {
            provider: dbConfig.provider || config.EMAIL_PROVIDER || 'smtp',
            smtp: dbConfig.smtp || {
              host: config.SMTP_HOST || '',
              port: parseInt(config.SMTP_PORT) || 587,
              secure: config.SMTP_SECURE === 'true' || config.SMTP_PORT === '465',
              auth: {
                user: config.SMTP_USER || '',
                pass: config.SMTP_PASS || '',
              },
            },
            sendgrid: dbConfig.sendgrid || {
              apiKey: config.SENDGRID_API_KEY || '',
            },
            resend: dbConfig.resend || {
              apiKey: '',
            },
            oci: dbConfig.oci || {
              region: config.OCI_EMAIL_REGION || '',
              user: config.OCI_EMAIL_USER || '',
              pass: config.OCI_EMAIL_PASS || '',
            },
            from: dbConfig.from || {
              name: config.SMTP_FROM_NAME || 'ApiAdmin',
              email: dbConfig.provider === 'oci'
                ? (config.OCI_EMAIL_FROM || config.OCI_EMAIL_USER || '')
                : (config.SMTP_FROM || config.SMTP_USER || ''),
            },
          };
        }
      } catch (dbError) {
        logger.warn({ error: dbError }, 'Failed to get email config from database, will use environment variables');
      }

      // 发送邮件
      try {
        await sendEmail(
          normalizedEmail,
          'ApiAdmin 登录验证码',
          `<p>您的登录验证码是：<strong>${code}</strong></p><p>验证码5分钟内有效。</p>`,
          null,
          emailConfig
        );
        logger.info({ email: normalizedEmail }, 'Email verification code sent successfully');
      } catch (error) {
        logger.error({ error, email: normalizedEmail, errorMessage: error.message, errorStack: error.stack }, 'Failed to send email code');
        ctx.status = 500;
        ctx.body = ThirdPartyAuthController.error(
          process.env.NODE_ENV === 'production' 
            ? '发送邮件失败，请检查邮件服务配置' 
            : `发送邮件失败: ${error.message || '未知错误'}`
        );
        return;
      }

      ctx.body = ThirdPartyAuthController.success(null, '验证码已发送到邮箱');
    } catch (error) {
      logger.error({ error, errorMessage: error.message, errorStack: error.stack }, 'Send email code error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error(
        process.env.NODE_ENV === 'production' 
          ? '发送验证码失败' 
          : `发送验证码失败: ${error.message || '未知错误'}`
      );
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

      // 统一使用小写邮箱
      const normalizedEmail = email.toLowerCase();

      // 验证验证码
      const storedCode = await getCode(`email:code:${normalizedEmail}`);
      if (!storedCode || storedCode !== code) {
        // 记录失败的登录日志
        await logLogin({
          username: normalizedEmail.split('@')[0] || normalizedEmail,
          email: normalizedEmail,
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
      await deleteCode(`email:code:${normalizedEmail}`);

      // 查找或创建用户
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
        logger.info({ userId: user._id, email: normalizedEmail }, 'User created via email login');
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
      logger.error({ 
        error, 
        errorMessage: error.message, 
        errorStack: error.stack,
        email: email?.toLowerCase() || email 
      }, 'Email login error');
      ctx.status = 500;
      ctx.body = ThirdPartyAuthController.error(
        process.env.NODE_ENV === 'production' 
          ? '邮箱登录失败' 
          : `邮箱登录失败: ${error.message || '未知错误'}`
      );
    }
  }
}

export default ThirdPartyAuthController;

