# ApiAdmin - SSO 单点登录集成方案

**文档版本**: 1.0  
**创建日期**: 2025-01-27  
**目标**: 提供完整的企业级 SSO 单点登录集成方案

---

## 1. 概述

### 1.1 支持的 SSO 协议

ApiAdmin 支持以下主流的 SSO 认证协议：

| 协议 | 适用场景 | 企业采用率 | 优先级 |
|:---|:---|:---:|:---:|
| **SAML 2.0** | 企业级 B2B SSO | ⭐⭐⭐⭐⭐ | 🔴 高 |
| **OAuth 2.0** | 第三方应用授权 | ⭐⭐⭐⭐⭐ | 🔴 高 |
| **OpenID Connect (OIDC)** | 现代 Web 应用 | ⭐⭐⭐⭐⭐ | 🔴 高 |
| **LDAP/Active Directory** | 企业内部目录 | ⭐⭐⭐⭐ | 🟡 中 |
| **CAS** | 学术机构、中小型组织 | ⭐⭐⭐ | 🟢 低 |

### 1.2 技术栈

**后端认证库**:
- **Passport.js**: Node.js 认证中间件框架
- **passport-saml**: SAML 2.0 策略
- **passport-oauth2**: OAuth 2.0 策略
- **passport-openidconnect**: OpenID Connect 策略
- **ldapjs**: LDAP 客户端库
- **passport-ldapauth**: LDAP 认证策略
- **passport-cas**: CAS 认证策略

**可选 IAM 解决方案**:
- **Keycloak**: 统一身份提供者（IdP），支持所有协议
- **Auth0**: 云托管身份管理（商业方案）

---

## 2. SAML 2.0 集成

### 2.1 协议概述

SAML 2.0 (Security Assertion Markup Language) 是企业级 SSO 的标准协议，广泛用于 B2B 场景。

**特点**:
- 基于 XML 的断言
- 支持 SP（Service Provider）和 IdP（Identity Provider）模式
- 支持加密和签名
- 适用于企业级安全要求

### 2.2 配置示例

```typescript
// Server/Config/SAMLConfig.ts
import { Strategy as SamlStrategy } from 'passport-saml';

export interface SAMLConfig {
  entryPoint: string;           // IdP SSO URL
  issuer: string;              // SP Entity ID (应用标识)
  callbackUrl: string;         // Assertion Consumer Service (ACS) URL
  cert: string;                // IdP 公钥证书
  privateKey?: string;         // SP 私钥（用于签名请求）
  signatureAlgorithm?: string; // 签名算法 (默认: 'sha256')
  digestAlgorithm?: string;    // 摘要算法 (默认: 'sha256')
  wantAssertionsSigned?: boolean; // 要求断言签名
  wantMessageSigned?: boolean;   // 要求消息签名
  disableRequestedAuthnContext?: boolean;
  identifierFormat?: string;    // NameID 格式
  acceptedClockSkewMs?: number; // 时钟偏差容忍度（毫秒）
}

// 示例配置
const samlConfig: SAMLConfig = {
  entryPoint: 'https://idp.example.com/sso',
  issuer: 'https://apiadmin.example.com',
  callbackUrl: 'https://apiadmin.example.com/api/auth/sso/saml/callback',
  cert: `-----BEGIN CERTIFICATE-----
MIIF...（IdP 证书）
-----END CERTIFICATE-----`,
  signatureAlgorithm: 'sha256',
  digestAlgorithm: 'sha256',
  wantAssertionsSigned: true,
  identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  acceptedClockSkewMs: 5000,
};
```

### 2.3 实现代码

```typescript
// Server/Middleware/Auth/SAMLStrategy.ts
import passport from 'passport';
import { Strategy as SamlStrategy } from 'passport-saml';
import { User } from '../../Models/User';

export function configureSAMLStrategy(config: SAMLConfig) {
  passport.use('saml', new SamlStrategy(
    {
      entryPoint: config.entryPoint,
      issuer: config.issuer,
      callbackUrl: config.callbackUrl,
      cert: config.cert,
      privateKey: config.privateKey,
      signatureAlgorithm: config.signatureAlgorithm,
      digestAlgorithm: config.digestAlgorithm,
      wantAssertionsSigned: config.wantAssertionsSigned,
      identifierFormat: config.identifierFormat,
      acceptedClockSkewMs: config.acceptedClockSkewMs,
    },
    async (profile, done) => {
      try {
        // 查找或创建用户
        const email = profile.email || profile.nameID;
        let user = await User.findOne({ 
          email,
          ssoProvider: 'saml',
          ssoId: profile.nameID 
        });

        if (!user) {
          // 创建新用户
          user = await User.create({
            email,
            username: profile.username || email.split('@')[0],
            ssoProvider: 'saml',
            ssoId: profile.nameID,
            ssoAttributes: profile,
            role: mapSSORoleToUserRole(profile), // 角色映射
          });
        } else {
          // 更新 SSO 属性
          user.ssoAttributes = profile;
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
  // 发起 SAML 认证
  async initiateSAML(req: Request, res: Response) {
    passport.authenticate('saml', {
      failureRedirect: '/login?error=saml_failed',
    })(req, res);
  }

  // SAML 回调处理
  async handleSAMLCallback(req: Request, res: Response) {
    passport.authenticate('saml', {
      failureRedirect: '/login?error=saml_failed',
      session: false,
    }, async (err, user) => {
      if (err || !user) {
        return res.redirect('/login?error=saml_failed');
      }

      // 生成 JWT Token
      const token = generateJWT(user);
      
      // 设置 Cookie 或返回 Token
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
      });

      return res.redirect('/');
    })(req, res);
  }
}
```

### 2.4 元数据配置

**SP 元数据生成** (供 IdP 配置使用):
```xml
<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                  entityID="https://apiadmin.example.com">
  <SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <AssertionConsumerService 
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="https://apiadmin.example.com/api/auth/sso/saml/callback"
      index="0"/>
  </SPSSODescriptor>
</EntityDescriptor>
```

---

## 3. OAuth 2.0 集成

### 3.1 协议概述

OAuth 2.0 是授权框架，允许第三方应用在用户授权后访问资源。

**授权流程**:
1. 用户点击 OAuth 登录
2. 重定向到授权服务器
3. 用户授权
4. 授权服务器回调，携带授权码
5. 应用用授权码换取访问令牌
6. 使用访问令牌获取用户信息

### 3.2 配置示例

```typescript
// Server/Config/OAuth2Config.ts
export interface OAuth2Config {
  authorizationURL: string;    // 授权端点
  tokenURL: string;            // 令牌端点
  clientID: string;           // 客户端 ID
  clientSecret: string;         // 客户端密钥
  callbackURL: string;         // 回调 URL
  scope: string[];             // 请求的权限范围
  userInfoURL?: string;        // 用户信息端点
}

// 示例：GitHub OAuth
const githubOAuthConfig: OAuth2Config = {
  authorizationURL: 'https://github.com/login/oauth/authorize',
  tokenURL: 'https://github.com/login/oauth/access_token',
  clientID: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  callbackURL: 'https://apiadmin.example.com/api/auth/sso/oauth2/github/callback',
  scope: ['user:email'],
  userInfoURL: 'https://api.github.com/user',
};

// 示例：GitLab OAuth
const gitlabOAuthConfig: OAuth2Config = {
  authorizationURL: 'https://gitlab.com/oauth/authorize',
  tokenURL: 'https://gitlab.com/oauth/token',
  clientID: process.env.GITLAB_CLIENT_ID!,
  clientSecret: process.env.GITLAB_CLIENT_SECRET!,
  callbackURL: 'https://apiadmin.example.com/api/auth/sso/oauth2/gitlab/callback',
  scope: ['read_user', 'api'],
  userInfoURL: 'https://gitlab.com/api/v4/user',
};
```

### 3.3 实现代码

```typescript
// Server/Middleware/Auth/OAuth2Strategy.ts
import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import axios from 'axios';

export function configureOAuth2Strategy(config: OAuth2Config, provider: string) {
  passport.use(`oauth2-${provider}`, new OAuth2Strategy(
    {
      authorizationURL: config.authorizationURL,
      tokenURL: config.tokenURL,
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackURL,
      scope: config.scope,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 使用访问令牌获取用户信息
        const userInfo = await axios.get(config.userInfoURL!, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const email = userInfo.data.email;
        let user = await User.findOne({
          email,
          ssoProvider: `oauth2-${provider}`,
        });

        if (!user) {
          user = await User.create({
            email,
            username: userInfo.data.login || userInfo.data.username,
            ssoProvider: `oauth2-${provider}`,
            ssoId: userInfo.data.id.toString(),
            ssoAttributes: userInfo.data,
            role: mapSSORoleToUserRole(userInfo.data),
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

---

## 4. OpenID Connect (OIDC) 集成

### 4.1 协议概述

OpenID Connect 是建立在 OAuth 2.0 之上的身份认证层，提供标准化的用户信息。

**特点**:
- 基于 OAuth 2.0
- 提供 ID Token（JWT）
- 支持 Discovery 机制
- 现代 Web 应用首选

### 4.2 配置示例

```typescript
// Server/Config/OIDCConfig.ts
export interface OIDCConfig {
  issuer: string;              // IdP 标识符
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope: string[];             // 通常包含 'openid profile email'
  discoveryURL?: string;       // OIDC Discovery 端点
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userInfoEndpoint?: string;
}

// 示例：Google OIDC
const googleOIDCConfig: OIDCConfig = {
  issuer: 'https://accounts.google.com',
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: 'https://apiadmin.example.com/api/auth/sso/oidc/google/callback',
  scope: ['openid', 'profile', 'email'],
  discoveryURL: 'https://accounts.google.com/.well-known/openid-configuration',
};
```

### 4.3 实现代码

```typescript
// Server/Middleware/Auth/OIDCStrategy.ts
import passport from 'passport';
import { Strategy as OpenIDConnectStrategy } from 'passport-openidconnect';

export function configureOIDCStrategy(config: OIDCConfig, provider: string) {
  passport.use(`oidc-${provider}`, new OpenIDConnectStrategy(
    {
      issuer: config.issuer,
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackURL,
      scope: config.scope,
      authorizationURL: config.authorizationEndpoint,
      tokenURL: config.tokenEndpoint,
      userInfoURL: config.userInfoEndpoint,
    },
    async (issuer, sub, profile, accessToken, refreshToken, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        let user = await User.findOne({
          email,
          ssoProvider: `oidc-${provider}`,
          ssoId: sub,
        });

        if (!user) {
          user = await User.create({
            email,
            username: profile.displayName || profile.username,
            ssoProvider: `oidc-${provider}`,
            ssoId: sub,
            ssoAttributes: profile,
            role: mapSSORoleToUserRole(profile),
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

---

## 5. LDAP/Active Directory 集成

### 5.1 协议概述

LDAP (Lightweight Directory Access Protocol) 用于访问目录服务，常用于企业内部认证。

**适用场景**:
- 企业内部用户目录
- Active Directory 集成
- 统一用户管理

### 5.2 配置示例

```typescript
// Server/Config/LDAPConfig.ts
export interface LDAPConfig {
  serverUrl: string;           // LDAP 服务器地址
  bindDN: string;              // 绑定 DN（用于搜索用户）
  bindCredentials: string;      // 绑定密码
  searchBase: string;          // 搜索基础 DN
  searchFilter: string;        // 搜索过滤器 (例如: '(uid={{username}})')
  tlsOptions?: {
    rejectUnauthorized?: boolean;
    ca?: string[];
  };
  timeout?: number;
  connectTimeout?: number;
}

// 示例配置
const ldapConfig: LDAPConfig = {
  serverUrl: 'ldap://ldap.example.com:389',
  bindDN: 'cn=admin,dc=example,dc=com',
  bindCredentials: process.env.LDAP_BIND_PASSWORD!,
  searchBase: 'ou=users,dc=example,dc=com',
  searchFilter: '(uid={{username}})',
  tlsOptions: {
    rejectUnauthorized: false,
  },
};
```

### 5.3 实现代码

```typescript
// Server/Middleware/Auth/LDAPStrategy.ts
import passport from 'passport';
import { Strategy as LdapStrategy } from 'passport-ldapauth';
import ldap from 'ldapjs';

export function configureLDAPStrategy(config: LDAPConfig) {
  passport.use('ldap', new LdapStrategy(
    {
      server: {
        url: config.serverUrl,
        bindDN: config.bindDN,
        bindCredentials: config.bindCredentials,
        searchBase: config.searchBase,
        searchFilter: config.searchFilter,
        tlsOptions: config.tlsOptions,
        timeout: config.timeout || 5000,
        connectTimeout: config.connectTimeout || 10000,
      },
    },
    async (user, done) => {
      try {
        const email = user.mail || user.email || `${user.uid}@example.com`;
        let dbUser = await User.findOne({
          email,
          ssoProvider: 'ldap',
          ssoId: user.dn,
        });

        if (!dbUser) {
          dbUser = await User.create({
            email,
            username: user.uid || user.cn,
            ssoProvider: 'ldap',
            ssoId: user.dn,
            ssoAttributes: user,
            role: mapLDAPGroupToUserRole(user.memberOf),
          });
        }

        return done(null, dbUser);
      } catch (error) {
        return done(error, null);
      }
    }
  ));
}

// LDAP 认证路由
export async function authenticateLDAP(
  username: string,
  password: string,
  config: LDAPConfig
): Promise<User> {
  const client = ldap.createClient({
    url: config.serverUrl,
    tlsOptions: config.tlsOptions,
  });

  return new Promise((resolve, reject) => {
    // 先绑定管理员 DN 搜索用户
    client.bind(config.bindDN, config.bindCredentials, (err) => {
      if (err) return reject(err);

      const searchFilter = config.searchFilter.replace('{{username}}', username);
      client.search(config.searchBase, {
        filter: searchFilter,
        scope: 'sub',
      }, (err, res) => {
        if (err) return reject(err);

        let userDN: string | null = null;
        res.on('searchEntry', (entry) => {
          userDN = entry.dn.toString();
        });

        res.on('end', () => {
          if (!userDN) {
            return reject(new Error('User not found'));
          }

          // 用用户 DN 和密码验证
          const userClient = ldap.createClient({
            url: config.serverUrl,
            tlsOptions: config.tlsOptions,
          });

          userClient.bind(userDN, password, (err) => {
            if (err) {
              return reject(new Error('Invalid credentials'));
            }

            // 认证成功，查找或创建用户
            User.findOne({ ssoId: userDN, ssoProvider: 'ldap' })
              .then(user => resolve(user!))
              .catch(reject);
          });
        });
      });
    });
  });
}
```

---

## 6. CAS 集成

### 6.1 协议概述

CAS (Central Authentication Service) 是中央认证服务，常用于学术机构。

### 6.2 配置示例

```typescript
// Server/Config/CASConfig.ts
export interface CASConfig {
  version: '1.0' | '2.0' | '3.0';
  ssoBaseURL: string;          // CAS 服务器基础 URL
  serverBaseURL: string;        // 应用服务器基础 URL
  serviceURL: string;          // 服务 URL（回调地址）
  validateURL?: string;         // 验证端点
}

const casConfig: CASConfig = {
  version: '3.0',
  ssoBaseURL: 'https://cas.example.com/cas',
  serverBaseURL: 'https://apiadmin.example.com',
  serviceURL: 'https://apiadmin.example.com/api/auth/sso/cas/callback',
};
```

### 6.3 实现代码

```typescript
// Server/Middleware/Auth/CASStrategy.ts
import passport from 'passport';
import { Strategy as CASStrategy } from 'passport-cas';

export function configureCASStrategy(config: CASConfig) {
  passport.use('cas', new CASStrategy(
    {
      version: config.version,
      ssoBaseURL: config.ssoBaseURL,
      serverBaseURL: config.serverBaseURL,
      serviceURL: config.serviceURL,
      validateURL: config.validateURL,
    },
    async (profile, done) => {
      try {
        const username = profile.user;
        let user = await User.findOne({
          username,
          ssoProvider: 'cas',
          ssoId: profile.user,
        });

        if (!user) {
          user = await User.create({
            username,
            email: profile.attributes?.email || `${username}@example.com`,
            ssoProvider: 'cas',
            ssoId: profile.user,
            ssoAttributes: profile.attributes,
            role: mapSSORoleToUserRole(profile.attributes),
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

---

## 7. 统一配置管理

### 7.1 SSO 配置模型

```typescript
// Server/Models/SSOConfig.ts
import mongoose from 'mongoose';

const SSOConfigSchema = new mongoose.Schema({
  name: { type: String, required: true },           // 配置名称
  type: { 
    type: String, 
    enum: ['saml', 'oauth2', 'oidc', 'ldap', 'cas'],
    required: true 
  },
  enabled: { type: Boolean, default: true },
  config: { type: mongoose.Schema.Types.Mixed, required: true },
  roleMapping: { type: mongoose.Schema.Types.Mixed }, // 角色映射规则
  defaultRole: { 
    type: String, 
    enum: ['super_admin', 'group_leader', 'project_leader', 'developer', 'guest'],
    default: 'guest'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const SSOConfig = mongoose.model('SSOConfig', SSOConfigSchema);
```

### 7.2 角色映射

```typescript
// Server/Utils/SSORoleMapping.ts
interface RoleMappingRule {
  ssoAttribute: string;      // SSO 属性名（如 'groups', 'roles'）
  attributeValue: string;     // 属性值
  targetRole: UserRole;      // 映射到的系统角色
}

export function mapSSORoleToUserRole(
  ssoAttributes: any,
  mappingRules: RoleMappingRule[]
): UserRole {
  for (const rule of mappingRules) {
    const attributeValue = getNestedValue(ssoAttributes, rule.ssoAttribute);
    
    if (Array.isArray(attributeValue)) {
      if (attributeValue.includes(rule.attributeValue)) {
        return rule.targetRole;
      }
    } else if (attributeValue === rule.attributeValue) {
      return rule.targetRole;
    }
  }

  return UserRole.GUEST; // 默认角色
}

// 示例映射规则
const samlRoleMapping: RoleMappingRule[] = [
  {
    ssoAttribute: 'groups',
    attributeValue: 'admin',
    targetRole: UserRole.SUPER_ADMIN,
  },
  {
    ssoAttribute: 'groups',
    attributeValue: 'developer',
    targetRole: UserRole.DEVELOPER,
  },
];
```

---

## 8. 前端集成

### 8.1 SSO 登录组件

```typescript
// Client/Components/Auth/SSOLogin.tsx
import React from 'react';
import { Button, Space } from 'antd';
import { LoginOutlined } from '@ant-design/icons';

interface SSOProvider {
  id: string;
  name: string;
  type: 'saml' | 'oauth2' | 'oidc' | 'ldap' | 'cas';
  icon?: string;
  color?: string;
}

export const SSOLogin: React.FC = () => {
  const [providers, setProviders] = React.useState<SSOProvider[]>([]);

  React.useEffect(() => {
    // 获取可用的 SSO 提供者
    fetch('/api/auth/sso/providers')
      .then(res => res.json())
      .then(data => setProviders(data.providers));
  }, []);

  const handleSSOLogin = (provider: SSOProvider) => {
    window.location.href = `/api/auth/sso/${provider.id}`;
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {providers.map(provider => (
        <Button
          key={provider.id}
          type="primary"
          icon={<LoginOutlined />}
          block
          onClick={() => handleSSOLogin(provider)}
          style={{ backgroundColor: provider.color }}
        >
          使用 {provider.name} 登录
        </Button>
      ))}
    </Space>
  );
};
```

### 8.2 登录页面集成

```typescript
// Client/Containers/Login/Login.tsx
import { SSOLogin } from '../../Components/Auth/SSOLogin';
import { Divider } from 'antd';

export const Login: React.FC = () => {
  return (
    <div className="login-container">
      <h1>ApiAdmin 登录</h1>
      
      {/* SSO 登录 */}
      <SSOLogin />
      
      <Divider>或</Divider>
      
      {/* 本地登录表单 */}
      <LocalLoginForm />
    </div>
  );
};
```

---

## 9. API 路由设计

### 9.1 SSO 相关路由

```typescript
// Server/Router/AuthRouter.ts
import Router from 'koa-router';
import { AuthController } from '../Controllers/AuthController';

const router = new Router();

// 获取可用的 SSO 提供者
router.get('/sso/providers', async (ctx) => {
  const providers = await SSOConfig.find({ enabled: true });
  ctx.body = {
    providers: providers.map(p => ({
      id: p._id.toString(),
      name: p.name,
      type: p.type,
    })),
  };
});

// 发起 SSO 认证
router.get('/sso/:providerId', async (ctx) => {
  const config = await SSOConfig.findById(ctx.params.providerId);
  if (!config || !config.enabled) {
    return ctx.throw(404, 'SSO provider not found');
  }

  // 根据类型选择策略
  const strategy = getStrategyByType(config.type);
  return passport.authenticate(strategy)(ctx, () => {});
});

// SSO 回调处理
router.get('/sso/:providerId/callback', async (ctx) => {
  const config = await SSOConfig.findById(ctx.params.providerId);
  const strategy = getStrategyByType(config.type);

  return passport.authenticate(
    strategy,
    { failureRedirect: '/login?error=sso_failed' },
    async (err, user) => {
      if (err || !user) {
        return ctx.redirect('/login?error=sso_failed');
      }

      // 生成 JWT
      const token = generateJWT(user);
      ctx.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      ctx.redirect('/');
    }
  )(ctx, () => {});
});
```

---

## 10. 安全考虑

### 10.1 安全最佳实践

1. **证书管理**
   - SAML 证书安全存储
   - 定期轮换证书
   - 使用环境变量存储密钥

2. **请求验证**
   - 验证 SAML 断言签名
   - 验证 OAuth 2.0 状态参数
   - 验证 OIDC ID Token 签名

3. **会话管理**
   - 使用 HttpOnly Cookie
   - 设置合理的过期时间
   - 支持会话撤销

4. **错误处理**
   - 不泄露敏感信息
   - 记录安全事件
   - 实现速率限制

### 10.2 配置安全

```typescript
// 敏感配置加密存储
import crypto from 'crypto';

function encryptConfig(secret: string, config: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', secret);
  let encrypted = cipher.update(config, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptConfig(secret: string, encrypted: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', secret);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

## 11. 测试

### 11.1 单元测试

```typescript
// Test/Auth/SSO.test.ts
import { describe, it, expect } from 'vitest';
import { mapSSORoleToUserRole } from '../../Server/Utils/SSORoleMapping';

describe('SSO Role Mapping', () => {
  it('should map SAML groups to user roles', () => {
    const attributes = {
      groups: ['admin', 'developer'],
    };
    const rules = [
      { ssoAttribute: 'groups', attributeValue: 'admin', targetRole: 'super_admin' },
    ];
    
    const role = mapSSORoleToUserRole(attributes, rules);
    expect(role).toBe('super_admin');
  });
});
```

### 11.2 集成测试

```typescript
// Test/Auth/SSOIntegration.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../Server/App';

describe('SSO Integration', () => {
  it('should return available SSO providers', async () => {
    const res = await request(app)
      .get('/api/auth/sso/providers')
      .expect(200);
    
    expect(res.body.providers).toBeInstanceOf(Array);
  });
});
```

---

## 12. 部署与配置

### 12.1 环境变量

```bash
# .env.example
# SAML
SAML_ENTRY_POINT=https://idp.example.com/sso
SAML_ISSUER=https://apiadmin.example.com
SAML_CERT_PATH=/path/to/idp-cert.pem

# OAuth 2.0 - GitHub
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=https://apiadmin.example.com/api/auth/sso/oauth2/github/callback

# OAuth 2.0 - GitLab
GITLAB_CLIENT_ID=your_gitlab_client_id
GITLAB_CLIENT_SECRET=your_gitlab_client_secret
GITLAB_CALLBACK_URL=https://apiadmin.example.com/api/auth/sso/oauth2/gitlab/callback

# OIDC
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://apiadmin.example.com/api/auth/google/callback

# LDAP
LDAP_SERVER_URL=ldap://ldap.example.com:389
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_BIND_PASSWORD=your_ldap_password
LDAP_SEARCH_BASE=ou=users,dc=example,dc=com
```

### 12.2 Docker 配置

```dockerfile
# Dockerfile
FROM node:18-alpine

# 安装依赖
COPY package*.json ./
RUN npm ci

# 复制配置
COPY . .

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
```

---

## 13. GitHub.com 和 GitLab.com 登录集成

### 13.1 GitHub.com 登录

#### 13.1.1 创建 GitHub OAuth App

1. 访问 https://github.com/settings/developers
2. 点击 "New OAuth App" 或 "Register a new application"
3. 填写应用信息：
   - **Application name**: ApiAdmin
   - **Homepage URL**: https://apiadmin.example.com
   - **Authorization callback URL**: https://apiadmin.example.com/api/auth/sso/oauth2/github/callback
4. 点击 "Register application"
5. 获取 **Client ID** 和 **Client Secret**

#### 13.1.2 配置代码

```typescript
// Server/Config/GitHubConfig.ts
export const githubConfig: OAuth2Config = {
  authorizationURL: 'https://github.com/login/oauth/authorize',
  tokenURL: 'https://github.com/login/oauth/access_token',
  clientID: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  callbackURL: process.env.GITHUB_CALLBACK_URL!,
  scope: ['user:email'],
  userInfoURL: 'https://api.github.com/user',
};

// 注册策略
configureOAuth2Strategy(githubConfig, 'github');
```

#### 13.1.3 实现代码（带白名单）

```typescript
// Server/Middleware/Auth/GitHubStrategy.ts
import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import axios from 'axios';
import { User } from '../../Models/User';
import { isInWhitelist } from '../../Utils/Whitelist';
import { getConfig } from '../../Utils/Config';

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

        // 获取用户邮箱（GitHub API 需要额外请求）
        let email = userInfo.data.email;
        if (!email) {
          const emails = await axios.get('https://api.github.com/user/emails', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          email = emails.data.find((e: any) => e.primary)?.email || 
                  emails.data[0]?.email || 
                  `${userInfo.data.login}@github.local`;
        }

        const username = userInfo.data.login;

        // 检查白名单
        const whitelistEnabled = await getConfig('whitelist.enabled');
        if (whitelistEnabled) {
          // 检查 GitHub 用户名或邮箱是否在白名单中
          const inWhitelist = await isInWhitelist('github', username) || 
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
            username,
            avatar: userInfo.data.avatar_url,
            ssoProvider: 'oauth2-github',
            ssoId: userInfo.data.id.toString(),
            ssoAttributes: {
              login: userInfo.data.login,
              name: userInfo.data.name,
              bio: userInfo.data.bio,
              company: userInfo.data.company,
              blog: userInfo.data.blog,
              location: userInfo.data.location,
              avatar_url: userInfo.data.avatar_url,
            },
            role: UserRole.GUEST,
          });
        } else {
          // 更新用户信息
          user.ssoAttributes = {
            login: userInfo.data.login,
            name: userInfo.data.name,
            bio: userInfo.data.bio,
            company: userInfo.data.company,
            blog: userInfo.data.blog,
            location: userInfo.data.location,
            avatar_url: userInfo.data.avatar_url,
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
```

#### 13.1.4 路由配置

```typescript
// Server/Router/AuthRouter.ts
// GitHub 登录
router.get('/sso/oauth2/github', async (ctx) => {
  return passport.authenticate('oauth2-github')(ctx, () => {});
});

router.get('/sso/oauth2/github/callback', async (ctx) => {
  return passport.authenticate(
    'oauth2-github',
    { failureRedirect: '/login?error=github_failed' },
    async (err, user) => {
      if (err || !user) {
        return ctx.redirect('/login?error=github_failed');
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
});
```

### 13.2 GitLab.com 登录

#### 13.2.1 创建 GitLab OAuth App

1. 访问 https://gitlab.com/-/profile/applications
2. 点击 "Add new application"
3. 填写应用信息：
   - **Name**: ApiAdmin
   - **Redirect URI**: https://apiadmin.example.com/api/auth/sso/oauth2/gitlab/callback
   - **Scopes**: 选择 `read_user` 和 `api`
4. 点击 "Save application"
5. 获取 **Application ID** 和 **Secret**

#### 13.2.2 配置代码

```typescript
// Server/Config/GitLabConfig.ts
export const gitlabConfig: OAuth2Config = {
  authorizationURL: 'https://gitlab.com/oauth/authorize',
  tokenURL: 'https://gitlab.com/oauth/token',
  clientID: process.env.GITLAB_CLIENT_ID!,
  clientSecret: process.env.GITLAB_CLIENT_SECRET!,
  callbackURL: process.env.GITLAB_CALLBACK_URL!,
  scope: ['read_user', 'api'],
  userInfoURL: 'https://gitlab.com/api/v4/user',
};

// 注册策略
configureOAuth2Strategy(gitlabConfig, 'gitlab');
```

#### 13.2.3 实现代码（带白名单）

```typescript
// Server/Middleware/Auth/GitLabStrategy.ts
import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import axios from 'axios';
import { User } from '../../Models/User';
import { isInWhitelist } from '../../Utils/Whitelist';
import { getConfig } from '../../Utils/Config';

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
          // 检查 GitLab 用户名或邮箱是否在白名单中
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
            ssoAttributes: {
              username: userInfo.data.username,
              name: userInfo.data.name,
              bio: userInfo.data.bio,
              organization: userInfo.data.organization,
              website_url: userInfo.data.website_url,
              location: userInfo.data.location,
              avatar_url: userInfo.data.avatar_url,
            },
            role: UserRole.GUEST,
          });
        } else {
          // 更新用户信息
          user.ssoAttributes = {
            username: userInfo.data.username,
            name: userInfo.data.name,
            bio: userInfo.data.bio,
            organization: userInfo.data.organization,
            website_url: userInfo.data.website_url,
            location: userInfo.data.location,
            avatar_url: userInfo.data.avatar_url,
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
```

#### 13.2.4 路由配置

```typescript
// Server/Router/AuthRouter.ts
// GitLab 登录
router.get('/sso/oauth2/gitlab', async (ctx) => {
  return passport.authenticate('oauth2-gitlab')(ctx, () => {});
});

router.get('/sso/oauth2/gitlab/callback', async (ctx) => {
  return passport.authenticate(
    'oauth2-gitlab',
    { failureRedirect: '/login?error=gitlab_failed' },
    async (err, user) => {
      if (err || !user) {
        return ctx.redirect('/login?error=gitlab_failed');
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
});
```

### 13.3 前端登录组件

```typescript
// Client/Components/Auth/SSOLogin.tsx
import React from 'react';
import { Button, Space } from 'antd';
import { GithubOutlined, GitlabOutlined } from '@ant-design/icons';

export const SSOLogin: React.FC = () => {
  const handleGitHubLogin = () => {
    window.location.href = '/api/auth/sso/oauth2/github';
  };

  const handleGitLabLogin = () => {
    window.location.href = '/api/auth/sso/oauth2/gitlab';
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Button
        type="primary"
        icon={<GithubOutlined />}
        block
        onClick={handleGitHubLogin}
        style={{ backgroundColor: '#24292e' }}
      >
        使用 GitHub 登录
      </Button>
      
      <Button
        type="primary"
        icon={<GitlabOutlined />}
        block
        onClick={handleGitLabLogin}
        style={{ backgroundColor: '#fc6d26' }}
      >
        使用 GitLab 登录
      </Button>
    </Space>
  );
};
```

### 13.4 白名单管理示例

```typescript
// 添加 GitHub 用户到白名单
await addToWhitelist('github', 'octocat', 'GitHub username');
await addToWhitelist('email', 'user@example.com', 'GitHub email');

// 添加 GitLab 用户到白名单
await addToWhitelist('gitlab', 'username', 'GitLab username');
await addToWhitelist('email', 'user@example.com', 'GitLab email');
```

## 14. 总结

### 14.1 支持的协议总结

| 协议 | 实现状态 | 优先级 | 适用场景 |
|:---|:---:|:---:|:---|
| SAML 2.0 | ✅ | 🔴 高 | 企业级 B2B |
| OAuth 2.0 | ✅ | 🔴 高 | 第三方授权 |
| OpenID Connect | ✅ | 🔴 高 | 现代 Web 应用 |
| LDAP/AD | ✅ | 🟡 中 | 企业内部目录 |
| CAS | ✅ | 🟢 低 | 学术机构 |

### 14.2 支持的第三方登录平台

| 平台 | 协议 | 实现状态 | 白名单支持 | 优先级 |
|:---|:---:|:---:|:---:|:---:|
| GitHub.com | OAuth 2.0 | ✅ | ✅ | 🔴 高 |
| GitLab.com | OAuth 2.0 | ✅ | ✅ | 🔴 高 |
| Google (Gmail) | OIDC | ✅ | ✅ | 🔴 高 |
| 微信 | OAuth 2.0 | ✅ | ✅ | 🟡 中 |
| 手机号 | SMS OTP | ✅ | ✅ | 🟡 中 |
| 邮箱验证码 | Email OTP | ✅ | ✅ | 🟡 中 |

### 14.3 实施建议

1. **Phase 1**: 实现 OAuth 2.0 和 OIDC（最常见）
   - GitHub.com 登录
   - GitLab.com 登录
   - Google (Gmail) 登录
2. **Phase 2**: 实现 SAML 2.0（企业需求）
3. **Phase 3**: 实现 LDAP（内部目录）
4. **Phase 4**: 实现 CAS（特殊需求）

---

**文档版本**：v0.0.1
**创建日期**：2025-01-27  
**最后更新**：2025-01-27

