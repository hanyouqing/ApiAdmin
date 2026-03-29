# ApiAdmin - 集成方案指南

**文档版本**: 1.0  
**创建日期**: 2025-01-27  
**目标**: 提供邮件服务、监控系统、第三方登录的完整集成方案

---

## 1. 邮件服务集成

### 1.1 支持的邮件服务商

| 服务商 | 类型 | 适用场景 | 优先级 |
|:---|:---|:---|:---:|
| **SMTP** | 通用协议 | 自建邮件服务器、Gmail、Outlook | 🔴 高 |
| **SendGrid** | 第三方服务 | 高可用、批量发送 | 🟡 中 |
| **AWS SES** | 云服务 | AWS 生态、低成本 | 🟡 中 |
| **阿里云邮件推送** | 国内服务 | 国内用户、合规要求 | 🟡 中 |

### 1.2 技术实现

#### 1.2.1 Nodemailer (SMTP)

```typescript
// Server/Services/EmailService.ts
import nodemailer from 'nodemailer';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(options: {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    from?: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: options.from || process.env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>ApiAdmin 验证码</h2>
        <p>您的验证码是：</p>
        <div style="font-size: 32px; font-weight: bold; color: #1890ff; text-align: center; padding: 20px;">
          ${code}
        </div>
        <p>验证码有效期为 5 分钟，请勿泄露给他人。</p>
        <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
      </div>
    `;

    await this.sendEmail({
      to: email,
      subject: 'ApiAdmin 验证码',
      html,
    });
  }
}
```

#### 1.2.2 SendGrid 集成

```typescript
// Server/Services/EmailService/SendGridService.ts
import sgMail from '@sendgrid/mail';

export class SendGridEmailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
  }): Promise<void> {
    const msg = {
      to: Array.isArray(options.to) ? options.to : [options.to],
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: options.subject,
      html: options.html,
    };

    await sgMail.send(msg);
  }
}
```

#### 1.2.3 AWS SES 集成

```typescript
// Server/Services/EmailService/AWSSESService.ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export class AWSSESEmailService {
  private client: SESClient;

  constructor() {
    this.client = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  async sendEmail(options: {
    to: string | string[];
    subject: string;
    html: string;
  }): Promise<void> {
    const command = new SendEmailCommand({
      Source: process.env.AWS_SES_FROM_EMAIL!,
      Destination: {
        ToAddresses: Array.isArray(options.to) ? options.to : [options.to],
      },
      Message: {
        Subject: { Data: options.subject },
        Body: { Html: { Data: options.html } },
      },
    });

    await this.client.send(command);
  }
}
```

### 1.3 邮件模板管理

```typescript
// Server/Templates/EmailTemplates.ts
export const EmailTemplates = {
  verificationCode: (code: string) => ({
    subject: 'ApiAdmin 验证码',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>ApiAdmin 验证码</h2>
        <p>您的验证码是：<strong style="font-size: 24px; color: #1890ff;">${code}</strong></p>
        <p>验证码有效期为 5 分钟，请勿泄露给他人。</p>
      </div>
    `,
  }),

  welcome: (username: string) => ({
    subject: '欢迎加入 ApiAdmin',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>欢迎加入 ApiAdmin！</h2>
        <p>亲爱的 ${username}，</p>
        <p>感谢您注册 ApiAdmin，开始您的 API 管理之旅吧！</p>
      </div>
    `,
  }),

  passwordReset: (token: string) => ({
    subject: 'ApiAdmin 密码重置',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>密码重置</h2>
        <p>请点击以下链接重置您的密码：</p>
        <a href="${process.env.APP_URL}/reset-password?token=${token}">重置密码</a>
        <p>链接有效期为 1 小时。</p>
      </div>
    `,
  }),
};
```

---

## 2. Prometheus 监控集成

### 2.1 安装依赖

```bash
npm install prom-client
```

### 2.2 指标收集配置

```typescript
// Server/Middleware/Metrics.ts
import client from 'prom-client';
import { Request, Response } from 'koa';

// 注册默认指标（CPU、内存、事件循环等）
client.collectDefaultMetrics({
  prefix: 'apiadmin_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// HTTP 请求持续时间（直方图）
const httpRequestDuration = new client.Histogram({
  name: 'apiadmin_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

// HTTP 请求总数（计数器）
const httpRequestTotal = new client.Counter({
  name: 'apiadmin_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// HTTP 请求大小（直方图）
const httpRequestSize = new client.Histogram({
  name: 'apiadmin_http_request_size_bytes',
  help: 'HTTP request size in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 500, 1000, 5000, 10000, 50000],
});

// HTTP 响应大小（直方图）
const httpResponseSize = new client.Histogram({
  name: 'apiadmin_http_response_size_bytes',
  help: 'HTTP response size in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
});

// 业务指标：用户数
const userCount = new client.Gauge({
  name: 'apiadmin_users_total',
  help: 'Total number of users',
});

// 业务指标：项目数
const projectCount = new client.Gauge({
  name: 'apiadmin_projects_total',
  help: 'Total number of projects',
});

// 业务指标：接口数
const interfaceCount = new client.Gauge({
  name: 'apiadmin_interfaces_total',
  help: 'Total number of interfaces',
});

// 业务指标：Mock 请求数
const mockRequestTotal = new client.Counter({
  name: 'apiadmin_mock_requests_total',
  help: 'Total number of mock requests',
  labelNames: ['project_id', 'interface_id'],
});

// 数据库查询时间
const dbQueryDuration = new client.Histogram({
  name: 'apiadmin_db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// 指标收集中间件
export async function metricsMiddleware(ctx: Context, next: Next) {
  const start = Date.now();
  const route = ctx.route?.path || ctx.path;

  try {
    await next();

    const duration = (Date.now() - start) / 1000;
    const status = ctx.status.toString();

    // 记录指标
    httpRequestDuration.observe(
      { method: ctx.method, route, status },
      duration
    );
    httpRequestTotal.inc({ method: ctx.method, route, status });

    if (ctx.request.length) {
      httpRequestSize.observe(
        { method: ctx.method, route },
        ctx.request.length
      );
    }

    if (ctx.response.length) {
      httpResponseSize.observe(
        { method: ctx.method, route },
        ctx.response.length
      );
    }
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe(
      { method: ctx.method, route, status: '500' },
      duration
    );
    httpRequestTotal.inc({ method: ctx.method, route, status: '500' });
    throw error;
  }
}

// 暴露指标端点
export async function metricsEndpoint(ctx: Context) {
  ctx.set('Content-Type', client.register.contentType);
  ctx.body = await client.register.metrics();
}

// 更新业务指标
export async function updateBusinessMetrics() {
  const userCountValue = await User.countDocuments();
  const projectCountValue = await Project.countDocuments();
  const interfaceCountValue = await Interface.countDocuments();

  userCount.set(userCountValue);
  projectCount.set(projectCountValue);
  interfaceCount.set(interfaceCountValue);
}

// 定时更新业务指标（每 5 分钟）
setInterval(updateBusinessMetrics, 5 * 60 * 1000);
```

### 2.3 路由配置

```typescript
// Server/Router/MetricsRouter.ts
import Router from 'koa-router';
import { metricsEndpoint } from '../Middleware/Metrics';

const router = new Router();

// Prometheus 指标端点
router.get('/metrics', metricsEndpoint);
router.get('/prometheus', metricsEndpoint); // 别名

// 健康检查端点
router.get('/health', async (ctx) => {
  ctx.body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
});

// 系统统计信息
router.get('/stats', async (ctx) => {
  const stats = await getSystemStats();
  ctx.body = stats;
});

export default router;
```

### 2.4 Prometheus 配置

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'apiadmin'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

### 2.5 Grafana 仪表盘示例

```json
{
  "dashboard": {
    "title": "ApiAdmin Metrics",
    "panels": [
      {
        "title": "HTTP Request Rate",
        "targets": [
          {
            "expr": "rate(apiadmin_http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "HTTP Request Duration",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, apiadmin_http_request_duration_seconds_bucket)",
            "legendFormat": "p95"
          }
        ]
      },
      {
        "title": "User Count",
        "targets": [
          {
            "expr": "apiadmin_users_total"
          }
        ]
      }
    ]
  }
}
```

---

## 3. 第三方登录集成

### 3.1 微信登录

#### 3.1.1 微信开放平台配置

1. 注册微信开放平台账号
2. 创建网站应用
3. 获取 AppID 和 AppSecret
4. 配置授权回调域名

#### 3.1.2 实现代码

```typescript
// Server/Middleware/Auth/WeChatStrategy.ts
import passport from 'passport';
import { Strategy as WeChatStrategy } from 'passport-wechat';

export function configureWeChatStrategy(config: {
  appID: string;
  appSecret: string;
  callbackURL: string;
}) {
  passport.use('wechat', new WeChatStrategy(
    {
      appID: config.appID,
      appSecret: config.appSecret,
      callbackURL: config.callbackURL,
      scope: 'snsapi_login',
      state: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const openid = profile.openid;

        // 检查白名单
        const whitelistEnabled = await getConfig('whitelist.enabled');
        if (whitelistEnabled) {
          const inWhitelist = await isInWhitelist('wechat', openid);
          if (!inWhitelist) {
            return done(new Error('WeChat ID not in whitelist'), null);
          }
        }

        // 查找或创建用户
        let user = await User.findOne({
          ssoProvider: 'wechat',
          ssoId: openid,
        });

        if (!user) {
          user = await User.create({
            username: profile.nickname || `wechat_${openid.slice(-6)}`,
            email: `${openid}@wechat.local`,
            avatar: profile.headimgurl,
            ssoProvider: 'wechat',
            ssoId: openid,
            ssoAttributes: {
              nickname: profile.nickname,
              sex: profile.sex,
              province: profile.province,
              city: profile.city,
              country: profile.country,
              headimgurl: profile.headimgurl,
            },
            role: UserRole.GUEST,
          });
        } else {
          // 更新用户信息
          user.ssoAttributes = {
            nickname: profile.nickname,
            sex: profile.sex,
            province: profile.province,
            city: profile.city,
            country: profile.country,
            headimgurl: profile.headimgurl,
          };
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  ));
}

// 路由处理
// Server/Controllers/AuthController.ts
export class AuthController {
  // 发起微信登录
  async initiateWeChat(ctx: Context) {
    return passport.authenticate('wechat', {
      session: false,
    })(ctx, () => {});
  }

  // 微信登录回调
  async handleWeChatCallback(ctx: Context) {
    return passport.authenticate(
      'wechat',
      { session: false },
      async (err, user) => {
        if (err || !user) {
          return ctx.redirect('/login?error=wechat_failed');
        }

        const token = generateJWT(user);
        ctx.cookies.set('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        ctx.redirect('/');
      }
    )(ctx, () => {});
  }
}
```

### 3.2 手机号登录

#### 3.2.1 短信服务配置

支持的服务商：
- **Twilio**: 国际短信服务
- **阿里云短信服务**: 国内短信服务
- **腾讯云短信**: 国内短信服务

#### 3.2.2 实现代码

```typescript
// Server/Services/SMSService.ts
export class SMSService {
  async sendVerificationCode(phone: string, code: string): Promise<void> {
    // 根据配置选择服务商
    const provider = process.env.SMS_PROVIDER || 'aliyun';

    switch (provider) {
      case 'aliyun':
        await this.sendViaAliyun(phone, code);
        break;
      case 'tencent':
        await this.sendViaTencent(phone, code);
        break;
      case 'twilio':
        await this.sendViaTwilio(phone, code);
        break;
      default:
        throw new Error(`Unsupported SMS provider: ${provider}`);
    }
  }

  private async sendViaAliyun(phone: string, code: string): Promise<void> {
    const Core = require('@alicloud/pop-core');

    const client = new Core({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
      endpoint: 'https://dysmsapi.aliyuncs.com',
      apiVersion: '2017-05-25',
    });

    const params = {
      PhoneNumbers: phone,
      SignName: process.env.ALIYUN_SMS_SIGN_NAME!,
      TemplateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE!,
      TemplateParam: JSON.stringify({ code }),
    };

    await client.request('SendSms', params, { method: 'POST' });
  }

  private async sendViaTwilio(phone: string, code: string): Promise<void> {
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    await client.messages.create({
      body: `Your ApiAdmin verification code is: ${code}`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phone,
    });
  }
}

// 控制器
// Server/Controllers/AuthController.ts
export class AuthController {
  private smsService = new SMSService();

  // 发送手机验证码
  async sendPhoneCode(ctx: Context) {
    const { phone } = ctx.request.body;

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return ctx.throw(400, 'Invalid phone number format');
    }

    // 检查白名单
    const whitelistEnabled = await getConfig('whitelist.enabled');
    if (whitelistEnabled) {
      const inWhitelist = await isInWhitelist('phone', phone);
      if (!inWhitelist) {
        return ctx.throw(403, 'Phone number not in whitelist');
      }
    }

    // 生成验证码
    const code = generateOTP(6);

    // 存储验证码（Redis，5分钟过期）
    const key = `phone:code:${phone}`;
    await redis.setex(key, 300, code);

    // 发送短信
    try {
      await this.smsService.sendVerificationCode(phone, code);
      ctx.body = { success: true, message: '验证码已发送' };
    } catch (error) {
      ctx.throw(500, 'Failed to send SMS');
    }
  }

  // 手机号登录
  async loginWithPhone(ctx: Context) {
    const { phone, code } = ctx.request.body;

    // 验证验证码
    const key = `phone:code:${phone}`;
    const storedCode = await redis.get(key);

    if (!storedCode || storedCode !== code) {
      return ctx.throw(400, 'Invalid or expired verification code');
    }

    // 删除验证码
    await redis.del(key);

    // 查找或创建用户
    let user = await User.findOne({
      phone,
      ssoProvider: 'phone',
    });

    if (!user) {
      user = await User.create({
        phone,
        username: `user_${phone.slice(-4)}`,
        ssoProvider: 'phone',
        role: UserRole.GUEST,
      });
    }

    // 生成 JWT
    const token = generateJWT(user);
    ctx.body = { token, user };
  }
}
```

### 3.3 GitHub.com 登录

#### 3.3.1 创建 GitHub OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App"
3. 填写应用信息：
   - Application name: ApiAdmin
   - Homepage URL: https://apiadmin.example.com
   - Authorization callback URL: https://apiadmin.example.com/api/auth/sso/oauth2/github/callback
4. 获取 Client ID 和 Client Secret

#### 3.3.2 实现代码

```typescript
// Server/Middleware/Auth/GitHubStrategy.ts
import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import axios from 'axios';

export function configureGitHubStrategy(config: {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}) {
  passport.use('oauth2-github', new OAuth2Strategy(
    {
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackURL,
      scope: ['user:email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 获取用户信息
        const userInfo = await axios.get('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        // 获取用户邮箱（可能需要额外请求）
        let email = userInfo.data.email;
        if (!email) {
          const emails = await axios.get('https://api.github.com/user/emails', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          email = emails.data.find((e: any) => e.primary)?.email || 
                  emails.data[0]?.email || 
                  `${userInfo.data.login}@github.local`;
        }

        // 检查白名单
        const whitelistEnabled = await getConfig('whitelist.enabled');
        if (whitelistEnabled) {
          const inWhitelist = await isInWhitelist('github', userInfo.data.login) || 
                             await isInWhitelist('email', email);
          if (!inWhitelist) {
            return done(new Error('GitHub user not in whitelist'), null);
          }
        }

        // 查找或创建用户
        let user = await User.findOne({
          email,
          ssoProvider: 'oauth2-github',
          ssoId: userInfo.data.id.toString(),
        });

        if (!user) {
          user = await User.create({
            email,
            username: userInfo.data.login,
            avatar: userInfo.data.avatar_url,
            ssoProvider: 'oauth2-github',
            ssoId: userInfo.data.id.toString(),
            ssoAttributes: userInfo.data,
            role: UserRole.GUEST,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  ));
}
```

### 3.4 GitLab.com 登录

#### 3.4.1 创建 GitLab OAuth App

1. 访问 https://gitlab.com/-/profile/applications
2. 点击 "Add new application"
3. 填写应用信息：
   - Name: ApiAdmin
   - Redirect URI: https://apiadmin.example.com/api/auth/sso/oauth2/gitlab/callback
   - Scopes: 选择 `read_user` 和 `api`
4. 获取 Application ID 和 Secret

#### 3.4.2 实现代码

```typescript
// Server/Middleware/Auth/GitLabStrategy.ts
import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import axios from 'axios';

export function configureGitLabStrategy(config: {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}) {
  passport.use('oauth2-gitlab', new OAuth2Strategy(
    {
      authorizationURL: 'https://gitlab.com/oauth/authorize',
      tokenURL: 'https://gitlab.com/oauth/token',
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackURL,
      scope: ['read_user', 'api'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 获取用户信息
        const userInfo = await axios.get('https://gitlab.com/api/v4/user', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const email = userInfo.data.email;
        const username = userInfo.data.username;

        // 检查白名单
        const whitelistEnabled = await getConfig('whitelist.enabled');
        if (whitelistEnabled) {
          const inWhitelist = await isInWhitelist('gitlab', username) || 
                             await isInWhitelist('email', email);
          if (!inWhitelist) {
            return done(new Error('GitLab user not in whitelist'), null);
          }
        }

        // 查找或创建用户
        let user = await User.findOne({
          email,
          ssoProvider: 'oauth2-gitlab',
          ssoId: userInfo.data.id.toString(),
        });

        if (!user) {
          user = await User.create({
            email,
            username,
            avatar: userInfo.data.avatar_url,
            ssoProvider: 'oauth2-gitlab',
            ssoId: userInfo.data.id.toString(),
            ssoAttributes: userInfo.data,
            role: UserRole.GUEST,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  ));
}
```

### 3.5 Gmail 登录

```typescript
// Server/Middleware/Auth/GoogleStrategy.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

export function configureGoogleStrategy(config: {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}) {
  passport.use('google', new GoogleStrategy(
    {
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackURL,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // 仅允许 Gmail 邮箱
        if (!email.endsWith('@gmail.com')) {
          return done(new Error('Only Gmail accounts are allowed'), null);
        }

        // 检查白名单
        const whitelistEnabled = await getConfig('whitelist.enabled');
        if (whitelistEnabled) {
          const inWhitelist = await isInWhitelist('email', email);
          if (!inWhitelist) {
            return done(new Error('Email not in whitelist'), null);
          }
        }

        // 查找或创建用户
        let user = await User.findOne({
          email,
          ssoProvider: 'google',
        });

        if (!user) {
          user = await User.create({
            email,
            username: profile.displayName || email.split('@')[0],
            avatar: profile.photos[0]?.value,
            ssoProvider: 'google',
            ssoId: profile.id,
            ssoAttributes: profile._json,
            role: UserRole.GUEST,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  ));
}
```

### 3.4 邮箱验证码登录

```typescript
// Server/Controllers/AuthController.ts
export class AuthController {
  private emailService = new EmailService();

  // 发送邮箱验证码
  async sendEmailCode(ctx: Context) {
    const { email } = ctx.request.body;

    // 验证邮箱格式
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return ctx.throw(400, 'Invalid email format');
    }

    // 检查白名单
    const whitelistEnabled = await getConfig('whitelist.enabled');
    if (whitelistEnabled) {
      const inWhitelist = await isInWhitelist('email', email);
      if (!inWhitelist) {
        return ctx.throw(403, 'Email not in whitelist');
      }
    }

    // 生成验证码
    const code = generateOTP(6);

    // 存储验证码（Redis，5分钟过期）
    const key = `email:code:${email}`;
    await redis.setex(key, 300, code);

    // 发送邮件
    try {
      await this.emailService.sendVerificationCode(email, code);
      ctx.body = { success: true, message: '验证码已发送到邮箱' };
    } catch (error) {
      ctx.throw(500, 'Failed to send email');
    }
  }

  // 邮箱验证码登录
  async loginWithEmailCode(ctx: Context) {
    const { email, code } = ctx.request.body;

    // 验证验证码
    const key = `email:code:${email}`;
    const storedCode = await redis.get(key);

    if (!storedCode || storedCode !== code) {
      return ctx.throw(400, 'Invalid or expired verification code');
    }

    // 删除验证码
    await redis.del(key);

    // 查找或创建用户
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        username: email.split('@')[0],
        role: UserRole.GUEST,
      });
    }

    // 生成 JWT
    const token = generateJWT(user);
    ctx.body = { token, user };
  }
}
```

---

## 4. 白名单管理

### 4.1 数据模型

```typescript
// Server/Models/Whitelist.ts
import mongoose from 'mongoose';

const WhitelistSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['wechat', 'phone', 'email'],
    required: true,
    index: true,
  },
  value: {
    type: String,
    required: true,
    index: true,
  },
  description: String,
  enabled: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// 复合索引
WhitelistSchema.index({ type: 1, value: 1 }, { unique: true });

export const Whitelist = mongoose.model('Whitelist', WhitelistSchema);
```

### 4.2 白名单检查工具

```typescript
// Server/Utils/Whitelist.ts
import { Whitelist } from '../Models/Whitelist';
import { getConfig } from './Config';

export async function isInWhitelist(
  type: 'wechat' | 'phone' | 'email' | 'github' | 'gitlab',
  value: string
): Promise<boolean> {
  // 检查是否启用白名单功能
  const whitelistEnabled = await getConfig('whitelist.enabled');
  if (!whitelistEnabled) {
    return true; // 未启用白名单，允许所有用户
  }

  // 检查白名单
  const whitelist = await Whitelist.findOne({
    type,
    value,
    enabled: true,
  });

  return !!whitelist;
}

export async function addToWhitelist(
  type: 'wechat' | 'phone' | 'email' | 'github' | 'gitlab',
  value: string,
  description?: string
): Promise<void> {
  await Whitelist.findOneAndUpdate(
    { type, value },
    {
      type,
      value,
      description,
      enabled: true,
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  );
}

export async function removeFromWhitelist(
  type: 'wechat' | 'phone' | 'email' | 'github' | 'gitlab',
  value: string
): Promise<void> {
  await Whitelist.findOneAndUpdate(
    { type, value },
    { enabled: false, updatedAt: new Date() }
  );
}
```

### 4.3 白名单管理 API

```typescript
// Server/Controllers/WhitelistController.ts
export class WhitelistController {
  // 获取白名单列表
  async list(ctx: Context) {
    const { type, page = 1, pageSize = 20 } = ctx.query;

    const query: any = { enabled: true };
    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const whitelist = await Whitelist.find(query)
      .skip(skip)
      .limit(parseInt(pageSize as string))
      .sort({ createdAt: -1 });

    const total = await Whitelist.countDocuments(query);

    ctx.body = {
      list: whitelist,
      total,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
    };
  }

  // 添加白名单
  async add(ctx: Context) {
    const { type, value, description } = ctx.request.body;

    if (!['wechat', 'phone', 'email', 'github', 'gitlab'].includes(type)) {
      return ctx.throw(400, 'Invalid whitelist type');
    }

    await addToWhitelist(type, value, description);
    ctx.body = { success: true, message: 'Added to whitelist' };
  }

  // 删除白名单
  async remove(ctx: Context) {
    const { id } = ctx.params;
    await Whitelist.findByIdAndUpdate(id, { enabled: false });
    ctx.body = { success: true, message: 'Removed from whitelist' };
  }

  // 检查是否在白名单中
  async check(ctx: Context) {
    const { type, value } = ctx.query;
    const inWhitelist = await isInWhitelist(type as any, value as string);
    ctx.body = { inWhitelist };
  }
}
```

### 4.4 系统配置

```typescript
// Server/Models/Config.ts
const ConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  value: mongoose.Schema.Types.Mixed,
  description: String,
});

// 默认配置
await Config.findOneAndUpdate(
  { key: 'whitelist.enabled' },
  { key: 'whitelist.enabled', value: false, description: '是否启用白名单功能' },
  { upsert: true }
);
```

---

## 5. 环境变量配置

```bash
# .env.example

# 邮件服务
EMAIL_PROVIDER=smtp  # smtp, sendgrid, aws-ses, aliyun
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
SMTP_FROM=ApiAdmin <noreply@apiadmin.com>

# SendGrid
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@apiadmin.com

# AWS SES
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_SES_FROM_EMAIL=noreply@apiadmin.com

# 短信服务
SMS_PROVIDER=aliyun  # aliyun, tencent, twilio
ALIYUN_ACCESS_KEY_ID=your-key
ALIYUN_ACCESS_KEY_SECRET=your-secret
ALIYUN_SMS_SIGN_NAME=ApiAdmin
ALIYUN_SMS_TEMPLATE_CODE=SMS_123456789

# 微信登录
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
WECHAT_CALLBACK_URL=https://apiadmin.com/api/auth/wechat/callback

# Google 登录
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://apiadmin.com/api/auth/google/callback

# 白名单
WHITELIST_ENABLED=false
```

---

## 6. 总结

### 6.1 已集成的功能

✅ **邮件服务**: SMTP、SendGrid、AWS SES、阿里云邮件推送  
✅ **监控系统**: Prometheus 指标收集、/metrics 端点  
✅ **第三方登录**: 微信、Gmail、手机号、邮箱验证码  
✅ **白名单管理**: 支持微信ID、手机号、邮箱白名单  

### 6.2 实施建议

1. **Phase 1**: 实现基础邮件服务（SMTP）和 Prometheus 监控
2. **Phase 2**: 实现手机号和邮箱验证码登录
3. **Phase 3**: 实现微信和 Gmail 登录
4. **Phase 4**: 实现白名单管理功能

---

**文档版本**：v0.0.1
**创建日期**：2025-01-27  
**最后更新**：2025-01-27

