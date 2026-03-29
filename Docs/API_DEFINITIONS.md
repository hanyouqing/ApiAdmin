# ApiAdmin - 未实现功能 API 定义

**文档版本**: 1.0  
**创建日期**: 2025-01-27  
**目标**: 为所有未实现功能定义完整的 API 端点

---

## 1. SSO 单点登录 API

### 1.1 SSO 配置管理

#### 获取 SSO 提供者列表
```
GET /api/sso/providers
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "type": "saml|oauth2|oidc|ldap|cas",
      "enabled": true,
      "description": "string"
    }
  ]
}
```

#### 获取 SSO 提供者详情
```
GET /api/sso/providers/:id
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "type": "saml|oauth2|oidc|ldap|cas",
    "enabled": true,
    "config": {
      // 根据 type 不同，config 结构不同
    },
    "roleMapping": {
      "ssoRole": "systemRole"
    },
    "autoCreateUser": true,
    "createdAt": "2025-01-27T00:00:00Z",
    "updatedAt": "2025-01-27T00:00:00Z"
  }
}
```

#### 创建 SSO 提供者
```
POST /api/sso/providers
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "name": "string",
  "type": "saml|oauth2|oidc|ldap|cas",
  "enabled": true,
  "config": {
    // SAML 2.0
    "entryPoint": "string",
    "issuer": "string",
    "callbackUrl": "string",
    "cert": "string",
    "privateKey": "string",
    // OAuth 2.0
    "authorizationURL": "string",
    "tokenURL": "string",
    "clientID": "string",
    "clientSecret": "string",
    "callbackURL": "string",
    "scope": ["string"],
    // OIDC
    "issuer": "string",
    "clientID": "string",
    "clientSecret": "string",
    "callbackURL": "string",
    "scope": ["string"],
    // LDAP
    "serverUrl": "string",
    "bindDN": "string",
    "bindCredentials": "string",
    "searchBase": "string",
    "searchFilter": "string",
    // CAS
    "casUrl": "string",
    "serviceUrl": "string"
  },
  "roleMapping": {
    "ssoRole": "systemRole"
  },
  "autoCreateUser": true
}

Response 200:
{
  "success": true,
  "data": {
    "id": "string",
    // ... provider data
  },
  "message": "SSO provider created successfully"
}
```

#### 更新 SSO 提供者
```
PUT /api/sso/providers/:id
Authorization: Bearer {token}
Content-Type: application/json

Request Body: (同创建，所有字段可选)

Response 200:
{
  "success": true,
  "data": { /* updated provider */ },
  "message": "SSO provider updated successfully"
}
```

#### 删除 SSO 提供者
```
DELETE /api/sso/providers/:id
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "SSO provider deleted successfully"
}
```

#### 启用/禁用 SSO 提供者
```
PATCH /api/sso/providers/:id/enable
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "enabled": true
}

Response 200:
{
  "success": true,
  "message": "SSO provider updated successfully"
}
```

#### 发起 SSO 认证
```
GET /api/sso/auth/:providerId
Query Parameters:
  - redirectUrl: string (可选，认证成功后跳转的URL)

Response 302: Redirect to SSO provider
```

#### SSO 认证回调
```
GET /api/sso/auth/:providerId/callback
Query Parameters:
  - code: string (OAuth/OIDC)
  - state: string (OAuth/OIDC)
  - SAMLResponse: string (SAML)
  - ticket: string (CAS)

Response 302: Redirect to redirectUrl or /login?success=true
```

---

## 2. 第三方登录 API

### 2.1 GitHub 登录

#### 发起 GitHub 登录
```
GET /api/auth/github
Query Parameters:
  - redirectUrl: string (可选)

Response 302: Redirect to GitHub OAuth
```

#### GitHub 登录回调
```
GET /api/auth/github/callback
Query Parameters:
  - code: string
  - state: string

Response 200:
{
  "success": true,
  "data": {
    "token": "string",
    "user": {
      "id": "string",
      "username": "string",
      "email": "string",
      "avatar": "string",
      "role": "string"
    }
  }
}
```

### 2.2 GitLab 登录

#### 发起 GitLab 登录
```
GET /api/auth/gitlab
Query Parameters:
  - redirectUrl: string (可选)

Response 302: Redirect to GitLab OAuth
```

#### GitLab 登录回调
```
GET /api/auth/gitlab/callback
Query Parameters:
  - code: string
  - state: string

Response 200: (同 GitHub)
```

### 2.3 Gmail 登录

#### 发起 Gmail 登录
```
GET /api/auth/gmail
Query Parameters:
  - redirectUrl: string (可选)

Response 302: Redirect to Google OAuth
```

#### Gmail 登录回调
```
GET /api/auth/gmail/callback
Query Parameters:
  - code: string
  - state: string

Response 200: (同 GitHub)
```

### 2.4 微信登录

#### 发起微信登录
```
GET /api/auth/wechat
Query Parameters:
  - redirectUrl: string (可选)

Response 302: Redirect to WeChat OAuth
```

#### 微信登录回调
```
GET /api/auth/wechat/callback
Query Parameters:
  - code: string
  - state: string

Response 200: (同 GitHub)
```

### 2.5 手机号登录

#### 发送手机验证码
```
POST /api/auth/phone/send-code
Content-Type: application/json

Request Body:
{
  "phone": "string" // 手机号，格式：1[3-9]\\d{9}
}

Response 200:
{
  "success": true,
  "message": "Verification code sent successfully"
}
```

#### 手机号登录
```
POST /api/auth/phone/login
Content-Type: application/json

Request Body:
{
  "phone": "string",
  "code": "string" // 6位数字验证码
}

Response 200:
{
  "success": true,
  "data": {
    "token": "string",
    "user": { /* user data */ }
  }
}
```

### 2.6 邮箱验证码登录

#### 发送邮箱验证码
```
POST /api/auth/email/send-code
Content-Type: application/json

Request Body:
{
  "email": "string" // 邮箱地址
}

Response 200:
{
  "success": true,
  "message": "Verification code sent to email"
}
```

#### 邮箱验证码登录
```
POST /api/auth/email/login
Content-Type: application/json

Request Body:
{
  "email": "string",
  "code": "string" // 6位数字验证码
}

Response 200:
{
  "success": true,
  "data": {
    "token": "string",
    "user": { /* user data */ }
  }
}
```

---

## 3. 白名单管理 API

### 3.1 白名单配置

#### 获取白名单配置
```
GET /api/whitelist/config
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "enabled": true,
    "platforms": ["github", "gitlab", "gmail", "wechat", "phone", "email"]
  }
}
```

#### 更新白名单配置
```
PUT /api/whitelist/config
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "enabled": true,
  "platforms": ["github", "gitlab", "gmail", "wechat", "phone", "email"]
}

Response 200:
{
  "success": true,
  "message": "Whitelist config updated successfully"
}
```

### 3.2 白名单条目管理

#### 获取白名单列表
```
GET /api/whitelist/entries
Authorization: Bearer {token}
Query Parameters:
  - platform: string (可选，筛选平台类型)
  - page: number (可选，默认1)
  - pageSize: number (可选，默认10)
  - search: string (可选，搜索关键词)

Response 200:
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "string",
        "platform": "github|gitlab|gmail|wechat|phone|email",
        "value": "string",
        "description": "string",
        "enabled": true,
        "createdAt": "2025-01-27T00:00:00Z",
        "createdBy": {
          "id": "string",
          "username": "string"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

#### 添加白名单条目
```
POST /api/whitelist/entries
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "platform": "github|gitlab|gmail|wechat|phone|email",
  "value": "string",
  "description": "string" (可选)
}

Response 200:
{
  "success": true,
  "data": {
    "id": "string",
    // ... entry data
  },
  "message": "Whitelist entry added successfully"
}
```

#### 批量添加白名单条目
```
POST /api/whitelist/entries/batch
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "entries": [
    {
      "platform": "github",
      "value": "string",
      "description": "string"
    }
  ]
}

Response 200:
{
  "success": true,
  "data": {
    "successCount": 10,
    "failedCount": 0,
    "failedEntries": []
  },
  "message": "Batch add completed"
}
```

#### 更新白名单条目
```
PUT /api/whitelist/entries/:id
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "value": "string" (可选),
  "description": "string" (可选),
  "enabled": true (可选)
}

Response 200:
{
  "success": true,
  "data": { /* updated entry */ },
  "message": "Whitelist entry updated successfully"
}
```

#### 删除白名单条目
```
DELETE /api/whitelist/entries/:id
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "Whitelist entry deleted successfully"
}
```

#### 批量删除白名单条目
```
DELETE /api/whitelist/entries
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "ids": ["string"]
}

Response 200:
{
  "success": true,
  "data": {
    "deletedCount": 10
  },
  "message": "Batch delete completed"
}
```

#### 检查值是否在白名单中
```
POST /api/whitelist/entries/check
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "platform": "github|gitlab|gmail|wechat|phone|email",
  "value": "string"
}

Response 200:
{
  "success": true,
  "data": {
    "inWhitelist": true,
    "entry": { /* entry data if found */ }
  }
}
```

---

## 4. 邮件服务 API

### 4.1 邮件服务配置

#### 获取邮件服务配置
```
GET /api/email/config
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "provider": "smtp|sendgrid|ses|aliyun",
    "smtp": {
      "host": "string",
      "port": 587,
      "secure": false,
      "auth": {
        "user": "string",
        "pass": "string"
      }
    },
    "sendgrid": {
      "apiKey": "string"
    },
    "ses": {
      "accessKeyId": "string",
      "secretAccessKey": "string",
      "region": "string"
    },
    "aliyun": {
      "accessKeyId": "string",
      "accessKeySecret": "string",
      "region": "string"
    },
    "from": {
      "name": "string",
      "email": "string"
    }
  }
}
```

#### 更新邮件服务配置
```
PUT /api/email/config
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "provider": "smtp|sendgrid|ses|aliyun",
  "smtp": { /* smtp config */ },
  "sendgrid": { /* sendgrid config */ },
  "ses": { /* ses config */ },
  "aliyun": { /* aliyun config */ },
  "from": {
    "name": "string",
    "email": "string"
  }
}

Response 200:
{
  "success": true,
  "message": "Email config updated successfully"
}
```

#### 测试邮件发送
```
POST /api/email/test
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "to": "string", // 测试邮箱地址
  "subject": "string" (可选),
  "content": "string" (可选)
}

Response 200:
{
  "success": true,
  "message": "Test email sent successfully"
}
```

### 4.2 邮件模板管理

#### 获取邮件模板列表
```
GET /api/email/templates
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "type": "verification|welcome|password-reset|interface-change|custom",
      "subject": "string",
      "html": "string",
      "text": "string",
      "variables": ["string"], // 模板变量列表
      "createdAt": "2025-01-27T00:00:00Z",
      "updatedAt": "2025-01-27T00:00:00Z"
    }
  ]
}
```

#### 获取邮件模板详情
```
GET /api/email/templates/:id
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": { /* template data */ }
}
```

#### 创建邮件模板
```
POST /api/email/templates
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "name": "string",
  "type": "verification|welcome|password-reset|interface-change|custom",
  "subject": "string",
  "html": "string",
  "text": "string" (可选),
  "variables": ["string"] (可选)
}

Response 200:
{
  "success": true,
  "data": { /* template data */ },
  "message": "Email template created successfully"
}
```

#### 更新邮件模板
```
PUT /api/email/templates/:id
Authorization: Bearer {token}
Content-Type: application/json

Request Body: (同创建，所有字段可选)

Response 200:
{
  "success": true,
  "data": { /* updated template */ },
  "message": "Email template updated successfully"
}
```

#### 删除邮件模板
```
DELETE /api/email/templates/:id
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "Email template deleted successfully"
}
```

#### 发送邮件（使用模板）
```
POST /api/email/send
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "to": "string|array", // 单个邮箱或邮箱数组
  "templateId": "string",
  "variables": {
    "key": "value" // 模板变量
  },
  "subject": "string" (可选，覆盖模板主题),
  "attachments": [ // 可选
    {
      "filename": "string",
      "content": "string", // base64
      "contentType": "string"
    }
  ]
}

Response 200:
{
  "success": true,
  "data": {
    "sentCount": 1,
    "failedCount": 0,
    "messageIds": ["string"]
  },
  "message": "Email sent successfully"
}
```

---

## 5. 插件系统 API

### 5.1 插件管理

#### 获取插件列表
```
GET /api/plugins
Authorization: Bearer {token}
Query Parameters:
  - enabled: boolean (可选，筛选启用/禁用状态)
  - category: string (可选，筛选分类)

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "displayName": "string",
      "version": "string",
      "description": "string",
      "author": "string",
      "license": "string",
      "icon": "string",
      "category": "export|import|mock|test|integration|buildin|other",
      "enabled": true,
      "installed": true,
      "hasUpdate": false,
      "latestVersion": "string",
      "dependencies": {
        "package": "version"
      },
      "routes": [
        {
          "path": "string",
          "method": "string"
        }
      ],
      "hooks": ["string"],
      "permissions": ["string"],
      "config": { /* plugin config */ },
      "installedAt": "2025-01-27T00:00:00Z",
      "updatedAt": "2025-01-27T00:00:00Z"
    }
  ]
}
```

#### 获取插件详情
```
GET /api/plugins/:id
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": { /* plugin data */ }
}
```

#### 安装插件（本地）
```
POST /api/plugins/install/local
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "pluginPath": "string" // 插件目录路径，相对于 Plugins 目录
}

Response 200:
{
  "success": true,
  "data": { /* installed plugin */ },
  "message": "Plugin installed successfully"
}
```

#### 安装插件（远程 - npm）
```
POST /api/plugins/install/npm
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "packageName": "string", // npm 包名，如 @apiadmin/plugin-xxx
  "version": "string" (可选，默认 latest)
}

Response 200:
{
  "success": true,
  "data": { /* installed plugin */ },
  "message": "Plugin installed successfully"
}
```

#### 安装插件（远程 - Git）
```
POST /api/plugins/install/git
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "repository": "string", // Git 仓库 URL
  "branch": "string" (可选，默认 main),
  "path": "string" (可选，子目录路径)
}

Response 200:
{
  "success": true,
  "data": { /* installed plugin */ },
  "message": "Plugin installed successfully"
}
```

#### 安装插件（文件上传）
```
POST /api/plugins/install/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

Form Data:
  - file: File (插件压缩包，zip 格式)

Response 200:
{
  "success": true,
  "data": { /* installed plugin */ },
  "message": "Plugin installed successfully"
}
```

#### 卸载插件
```
DELETE /api/plugins/:id
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "Plugin uninstalled successfully"
}
```

#### 启用/禁用插件
```
PATCH /api/plugins/:id/enable
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "enabled": true
}

Response 200:
{
  "success": true,
  "message": "Plugin status updated successfully"
}
```

#### 更新插件
```
POST /api/plugins/:id/update
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "version": "string" (可选，指定版本)
}

Response 200:
{
  "success": true,
  "data": { /* updated plugin */ },
  "message": "Plugin updated successfully"
}
```

#### 检查插件更新
```
GET /api/plugins/:id/check-update
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "hasUpdate": true,
    "currentVersion": "string",
    "latestVersion": "string",
    "changelog": "string"
  }
}
```

#### 批量检查更新
```
POST /api/plugins/check-updates
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": [
    {
      "pluginId": "string",
      "hasUpdate": true,
      "currentVersion": "string",
      "latestVersion": "string"
    }
  ]
}
```

### 5.2 插件配置

#### 获取插件配置
```
GET /api/plugins/:id/config
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "config": { /* plugin config object */ },
    "schema": { /* JSON Schema for config validation */ }
  }
}
```

#### 更新插件配置
```
PUT /api/plugins/:id/config
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "config": { /* config object according to schema */ }
}

Response 200:
{
  "success": true,
  "data": { /* updated config */ },
  "message": "Plugin config updated successfully"
}
```

### 5.3 插件 Hook 管理

#### 获取插件 Hook 列表
```
GET /api/plugins/:id/hooks
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": [
    {
      "name": "string",
      "type": "beforeRequest|afterResponse|onInterfaceCreate|...",
      "handler": "string", // handler file path
      "enabled": true,
      "priority": 100, // 执行优先级，数字越小优先级越高
      "description": "string"
    }
  ]
}
```

#### 启用/禁用 Hook
```
PATCH /api/plugins/:id/hooks/:hookName/enable
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "enabled": true
}

Response 200:
{
  "success": true,
  "message": "Hook status updated successfully"
}
```

---

## 6. CI/CD 集成 API

### 6.1 CLI Token 管理

#### 生成 CLI Token
```
POST /api/cicd/tokens
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "name": "string", // Token 名称
  "projectId": "string" (可选，限制到特定项目),
  "expiresAt": "string" (可选，过期时间，ISO 8601)
}

Response 200:
{
  "success": true,
  "data": {
    "id": "string",
    "token": "string", // 仅返回一次，需保存
    "name": "string",
    "projectId": "string",
    "expiresAt": "string",
    "createdAt": "2025-01-27T00:00:00Z"
  },
  "message": "CLI token generated successfully"
}
```

#### 获取 CLI Token 列表
```
GET /api/cicd/tokens
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "projectId": "string",
      "expiresAt": "string",
      "lastUsedAt": "string",
      "createdAt": "2025-01-27T00:00:00Z"
    }
  ]
}
```

#### 删除 CLI Token
```
DELETE /api/cicd/tokens/:id
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "CLI token deleted successfully"
}
```

### 6.2 测试执行（CLI）

#### 执行测试集合（CLI）
```
POST /api/cicd/test/run
Authorization: Bearer {cliToken}
Content-Type: application/json

Request Body:
{
  "collectionId": "string",
  "environment": {
    "key": "value"
  },
  "format": "json|junit|allure" (可选，默认 json)
}

Response 200:
{
  "success": true,
  "data": {
    "report": { /* test report */ },
    "format": "json|junit|allure",
    "content": "string" // 格式化的报告内容
  }
}
```

#### Swagger 同步（CLI）
```
POST /api/cicd/sync/swagger
Authorization: Bearer {cliToken}
Content-Type: application/json

Request Body:
{
  "url": "string", // Swagger JSON URL
  "projectId": "string",
  "mode": "normal|good|mergin" (可选，默认 normal)
}

Response 200:
{
  "success": true,
  "data": {
    "importedCount": 10,
    "updatedCount": 5,
    "failedCount": 0
  },
  "message": "Swagger sync completed"
}
```

---

## 7. 已导入接口自动化测试 API

### 7.1 自动测试配置

#### 获取自动测试配置
```
GET /api/auto-test/config
Authorization: Bearer {token}
Query Parameters:
  - projectId: string (可选)

Response 200:
{
  "success": true,
  "data": {
    "enabled": true,
    "autoGenerate": true, // 导入后自动生成测试用例
    "autoExecute": false, // 导入后自动执行测试
    "dataGenerationStrategy": "mock|example|history", // 测试数据生成策略
    "assertionTemplate": "string" (可选，断言模板ID),
    "timeout": 30000, // 测试超时时间（毫秒）
    "retryCount": 0 // 重试次数
  }
}
```

#### 更新自动测试配置
```
PUT /api/auto-test/config
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "projectId": "string" (可选),
  "enabled": true,
  "autoGenerate": true,
  "autoExecute": false,
  "dataGenerationStrategy": "mock|example|history",
  "assertionTemplate": "string",
  "timeout": 30000,
  "retryCount": 0
}

Response 200:
{
  "success": true,
  "message": "Auto test config updated successfully"
}
```

### 7.2 自动测试用例生成

#### 为导入的接口生成测试用例
```
POST /api/auto-test/generate
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "interfaceIds": ["string"], // 接口ID数组，为空则处理所有导入的接口
  "projectId": "string" (可选),
  "strategy": "mock|example|history" (可选)
}

Response 200:
{
  "success": true,
  "data": {
    "generatedCount": 10,
    "testCases": [
      {
        "id": "string",
        "interfaceId": "string",
        "name": "string",
        "type": "parameter-validation|response-validation|success|error",
        "request": { /* test request */ },
        "assertion": { /* assertion script */ }
      }
    ]
  },
  "message": "Test cases generated successfully"
}
```

#### 执行导入接口的自动测试
```
POST /api/auto-test/run
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "interfaceIds": ["string"] (可选),
  "projectId": "string" (可选),
  "collectionId": "string" (可选，指定测试集合)
}

Response 200:
{
  "success": true,
  "data": {
    "report": {
      "total": 10,
      "passed": 8,
      "failed": 2,
      "results": [
        {
          "interfaceId": "string",
          "testCaseId": "string",
          "status": "passed|failed",
          "duration": 100,
          "error": "string" (可选)
        }
      ]
    },
    "qualityReport": {
      "totalInterfaces": 10,
      "testedInterfaces": 10,
      "passedInterfaces": 8,
      "failedInterfaces": 2,
      "issues": [
        {
          "interfaceId": "string",
          "type": "not-accessible|format-mismatch|missing-params|type-mismatch",
          "message": "string"
        }
      ],
      "suggestions": ["string"]
    }
  }
}
```

---

## 8. 消息通知 API

### 8.1 系统消息

#### 获取消息列表
```
GET /api/notifications
Authorization: Bearer {token}
Query Parameters:
  - unreadOnly: boolean (可选，仅未读消息)
  - type: string (可选，消息类型)
  - page: number (可选)
  - pageSize: number (可选)

Response 200:
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "string",
        "type": "interface-change|test-failed|project-update|system",
        "title": "string",
        "content": "string",
        "read": false,
        "readAt": "string" (可选),
        "createdAt": "2025-01-27T00:00:00Z",
        "metadata": { /* additional data */ }
      }
    ],
    "pagination": { /* pagination info */ },
    "unreadCount": 5
  }
}
```

#### 标记消息为已读
```
PATCH /api/notifications/:id/read
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "Notification marked as read"
}
```

#### 标记所有消息为已读
```
PATCH /api/notifications/read-all
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "updatedCount": 10
  },
  "message": "All notifications marked as read"
}
```

#### 删除消息
```
DELETE /api/notifications/:id
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "Notification deleted"
}
```

### 8.2 通知设置

#### 获取通知设置
```
GET /api/notifications/settings
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "email": {
      "interfaceChange": true,
      "testFailed": true,
      "projectUpdate": false,
      "system": true
    },
    "inApp": {
      "interfaceChange": true,
      "testFailed": true,
      "projectUpdate": true,
      "system": true
    },
    "webhook": {
      "enabled": false,
      "url": "string"
    }
  }
}
```

#### 更新通知设置
```
PUT /api/notifications/settings
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "email": { /* email settings */ },
  "inApp": { /* in-app settings */ },
  "webhook": { /* webhook settings */ }
}

Response 200:
{
  "success": true,
  "message": "Notification settings updated successfully"
}
```

---

## 9. 搜索功能 API

### 9.1 全局搜索

#### 全局搜索
```
GET /api/search
Authorization: Bearer {token}
Query Parameters:
  - q: string (必需，搜索关键词)
  - type: string (可选，all|interface|project|group)
  - page: number (可选)
  - pageSize: number (可选)

Response 200:
{
  "success": true,
  "data": {
    "results": [
      {
        "type": "interface|project|group",
        "id": "string",
        "title": "string",
        "description": "string",
        "highlight": "string", // 高亮显示的匹配文本
        "score": 0.95, // 相关性分数
        "metadata": { /* additional data */ }
      }
    ],
    "pagination": { /* pagination info */ },
    "total": 100
  }
}
```

#### 搜索建议
```
GET /api/search/suggestions
Authorization: Bearer {token}
Query Parameters:
  - q: string (必需，搜索关键词)
  - limit: number (可选，默认5)

Response 200:
{
  "success": true,
  "data": [
    {
      "text": "string",
      "type": "interface|project|group",
      "count": 10
    }
  ]
}
```

#### 搜索历史
```
GET /api/search/history
Authorization: Bearer {token}
Query Parameters:
  - limit: number (可选，默认10)

Response 200:
{
  "success": true,
  "data": [
    {
      "keyword": "string",
      "count": 5,
      "lastSearchedAt": "2025-01-27T00:00:00Z"
    }
  ]
}
```

#### 清除搜索历史
```
DELETE /api/search/history
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "Search history cleared"
}
```

---

## 10. 项目关注 API

### 10.1 关注管理

#### 关注项目
```
POST /api/projects/:projectId/follow
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "Project followed successfully"
}
```

#### 取消关注项目
```
DELETE /api/projects/:projectId/follow
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "Project unfollowed successfully"
}
```

#### 获取关注的项目列表
```
GET /api/projects/following
Authorization: Bearer {token}
Query Parameters:
  - page: number (可选)
  - pageSize: number (可选)

Response 200:
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "string",
        "projectName": "string",
        "description": "string",
        "followedAt": "2025-01-27T00:00:00Z",
        "lastUpdateAt": "2025-01-27T00:00:00Z"
      }
    ],
    "pagination": { /* pagination info */ }
  }
}
```

#### 检查是否关注项目
```
GET /api/projects/:projectId/following
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "following": true,
    "followedAt": "2025-01-27T00:00:00Z"
  }
}
```

---

## 11. 操作日志 API

### 11.1 日志查询

#### 获取操作日志
```
GET /api/logs
Authorization: Bearer {token}
Query Parameters:
  - type: string (可选，project|interface|user|all)
  - projectId: string (可选)
  - userId: string (可选)
  - action: string (可选，create|update|delete|...)
  - startDate: string (可选，ISO 8601)
  - endDate: string (可选，ISO 8601)
  - page: number (可选)
  - pageSize: number (可选)

Response 200:
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "string",
        "type": "project|interface|user",
        "action": "create|update|delete|run|...",
        "targetId": "string",
        "targetName": "string",
        "userId": "string",
        "username": "string",
        "details": { /* action details */ },
        "ip": "string",
        "userAgent": "string",
        "createdAt": "2025-01-27T00:00:00Z"
      }
    ],
    "pagination": { /* pagination info */ }
  }
}
```

#### 导出操作日志
```
GET /api/logs/export
Authorization: Bearer {token}
Query Parameters:
  - type: string (可选)
  - projectId: string (可选)
  - startDate: string (可选)
  - endDate: string (可选)
  - format: string (可选，csv|json|excel，默认csv)

Response 200:
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="logs.csv"

[文件内容]
```

---

## 12. 用户中心增强 API

### 12.1 我的项目

#### 获取我参与的项目
```
GET /api/user/projects
Authorization: Bearer {token}
Query Parameters:
  - role: string (可选，筛选角色)
  - page: number (可选)
  - pageSize: number (可选)

Response 200:
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "string",
        "projectName": "string",
        "description": "string",
        "role": "project_leader|project_developer|guest",
        "joinedAt": "2025-01-27T00:00:00Z"
      }
    ],
    "pagination": { /* pagination info */ }
  }
}
```

### 12.2 操作统计

#### 获取个人操作统计
```
GET /api/user/stats
Authorization: Bearer {token}
Query Parameters:
  - startDate: string (可选，ISO 8601)
  - endDate: string (可选，ISO 8601)

Response 200:
{
  "success": true,
  "data": {
    "totalActions": 100,
    "actionsByType": {
      "interface_create": 20,
      "interface_update": 30,
      "test_run": 50
    },
    "actionsByDate": [
      {
        "date": "2025-01-27",
        "count": 10
      }
    ],
    "projectsContributed": 5,
    "interfacesCreated": 20,
    "testsRun": 50
  }
}
```

---

## 13. OpenAPI 接口

### 13.1 项目 Token 认证

所有 OpenAPI 接口使用项目 Token 进行认证：
```
Authorization: Bearer {projectToken}
```

### 13.2 接口管理

#### 获取接口列表
```
GET /api/openapi/interfaces
Authorization: Bearer {projectToken}
Query Parameters:
  - catId: string (可选，分类ID)
  - tag: string (可选，Tag)
  - status: string (可选，接口状态)
  - page: number (可选)
  - pageSize: number (可选)

Response 200:
{
  "success": true,
  "data": {
    "list": [ /* interface data */ ],
    "pagination": { /* pagination info */ }
  }
}
```

#### 获取接口详情
```
GET /api/openapi/interfaces/:id
Authorization: Bearer {projectToken}

Response 200:
{
  "success": true,
  "data": { /* interface data */ }
}
```

#### 创建接口
```
POST /api/openapi/interfaces
Authorization: Bearer {projectToken}
Content-Type: application/json

Request Body: { /* interface data */ }

Response 200:
{
  "success": true,
  "data": { /* created interface */ }
}
```

#### 更新接口
```
PUT /api/openapi/interfaces/:id
Authorization: Bearer {projectToken}
Content-Type: application/json

Request Body: { /* interface data */ }

Response 200:
{
  "success": true,
  "data": { /* updated interface */ }
}
```

#### 删除接口
```
DELETE /api/openapi/interfaces/:id
Authorization: Bearer {projectToken}

Response 200:
{
  "success": true,
  "message": "Interface deleted successfully"
}
```

### 13.3 项目 Token 管理

#### 生成项目 Token
```
POST /api/projects/:projectId/tokens
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "name": "string",
  "expiresAt": "string" (可选)
}

Response 200:
{
  "success": true,
  "data": {
    "id": "string",
    "token": "string", // 仅返回一次
    "name": "string",
    "expiresAt": "string",
    "createdAt": "2025-01-27T00:00:00Z"
  }
}
```

#### 获取项目 Token 列表
```
GET /api/projects/:projectId/tokens
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": [
    {
      "id": "string",
      "name": "string",
      "expiresAt": "string",
      "lastUsedAt": "string",
      "createdAt": "2025-01-27T00:00:00Z"
    }
  ]
}
```

#### 删除项目 Token
```
DELETE /api/projects/:projectId/tokens/:tokenId
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "message": "Token deleted successfully"
}
```

---

## 14. 交互式文档中心 API

### 14.1 文档发布

#### 发布项目文档
```
POST /api/projects/:projectId/docs/publish
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "version": "string" (可选，版本号),
  "theme": { /* theme config */ } (可选)
}

Response 200:
{
  "success": true,
  "data": {
    "url": "string", // 文档访问URL
    "version": "string",
    "publishedAt": "2025-01-27T00:00:00Z"
  },
  "message": "Documentation published successfully"
}
```

#### 获取文档发布历史
```
GET /api/projects/:projectId/docs/versions
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": [
    {
      "version": "string",
      "url": "string",
      "publishedAt": "2025-01-27T00:00:00Z",
      "publishedBy": {
        "id": "string",
        "username": "string"
      }
    }
  ]
}
```

### 14.2 文档导出

#### 导出文档为 PDF
```
GET /api/projects/:projectId/docs/export/pdf
Authorization: Bearer {token}
Query Parameters:
  - interfaceIds: string (可选，逗号分隔的接口ID)
  - template: string (可选，模板ID)

Response 200:
Content-Type: application/pdf
Content-Disposition: attachment; filename="documentation.pdf"

[PDF文件内容]
```

#### 导出文档为 Word
```
GET /api/projects/:projectId/docs/export/word
Authorization: Bearer {token}
Query Parameters:
  - interfaceIds: string (可选)
  - template: string (可选)

Response 200:
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="documentation.docx"

[Word文件内容]
```

---

## 15. 数据洞察与质量中心 API

### 15.1 项目健康度

#### 获取项目健康度
```
GET /api/projects/:projectId/health
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "totalInterfaces": 100,
    "documentedInterfaces": 90,
    "documentationCoverage": 0.9,
    "mockUsageRate": 0.75,
    "testPassRate": 0.85,
    "teamActivity": {
      "totalMembers": 10,
      "activeMembers": 8,
      "contributionScore": 85
    },
    "changeFrequency": {
      "daily": 5,
      "weekly": 20,
      "monthly": 80
    },
    "score": 85, // 综合健康度分数 (0-100)
    "trend": "improving|stable|declining"
  }
}
```

### 15.2 接口质量分析

#### 获取接口质量分析
```
GET /api/interfaces/:id/quality
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "data": {
    "testHistory": {
      "totalRuns": 100,
      "successRate": 0.95,
      "averageResponseTime": 200,
      "trend": [
        {
          "date": "2025-01-27",
          "successRate": 0.95,
          "averageResponseTime": 200
        }
      ]
    },
    "impactAnalysis": {
      "affectedFrontendPages": ["string"],
      "affectedDownstreamServices": ["string"],
      "riskLevel": "low|medium|high"
    }
  }
}
```

### 15.3 性能监控

#### 获取 API 调用统计
```
GET /api/monitor/stats/api-calls
Authorization: Bearer {token}
Query Parameters:
  - startDate: string (可选，ISO 8601)
  - endDate: string (可选，ISO 8601)
  - interval: string (可选，hour|day|week|month，默认day)
  - interfaceId: string (可选，特定接口)

Response 200:
{
  "success": true,
  "data": {
    "total": 10000,
    "success": 9500,
    "failed": 500,
    "byTime": [
      {
        "time": "2025-01-27T00:00:00Z",
        "total": 100,
        "success": 95,
        "failed": 5
      }
    ],
    "byInterface": [
      {
        "interfaceId": "string",
        "interfaceName": "string",
        "total": 1000,
        "success": 950,
        "failed": 50
      }
    ],
    "byUser": [
      {
        "userId": "string",
        "username": "string",
        "total": 500,
        "frequency": 10 // 调用频率（次/小时）
      }
    ]
  }
}
```

#### 获取响应时间分析
```
GET /api/monitor/stats/response-time
Authorization: Bearer {token}
Query Parameters:
  - startDate: string (可选)
  - endDate: string (可选)
  - interfaceId: string (可选)

Response 200:
{
  "success": true,
  "data": {
    "average": 200,
    "p50": 180,
    "p95": 500,
    "p99": 1000,
    "distribution": [
      {
        "range": "0-100",
        "count": 1000
      }
    ],
    "trend": [
      {
        "date": "2025-01-27",
        "average": 200,
        "p50": 180,
        "p95": 500,
        "p99": 1000
      }
    ],
    "slowInterfaces": [
      {
        "interfaceId": "string",
        "interfaceName": "string",
        "averageResponseTime": 2000,
        "p95": 5000
      }
    ]
  }
}
```

#### 获取错误率统计
```
GET /api/monitor/stats/error-rate
Authorization: Bearer {token}
Query Parameters:
  - startDate: string (可选)
  - endDate: string (可选)
  - interfaceId: string (可选)

Response 200:
{
  "success": true,
  "data": {
    "overall": 0.05, // 5%
    "byStatusCode": {
      "400": 10,
      "401": 5,
      "403": 3,
      "404": 20,
      "500": 50
    },
    "trend": [
      {
        "date": "2025-01-27",
        "errorRate": 0.05
      }
    ],
    "errors": [
      {
        "interfaceId": "string",
        "statusCode": 500,
        "count": 10,
        "lastOccurredAt": "2025-01-27T00:00:00Z"
      }
    ]
  }
}
```

---

**文档版本**：v0.0.1
**创建日期**：2025-01-27  
**最后更新**：2025-01-27

*本文档定义了所有未实现功能的 API 端点。*

