# ApiAdmin - Swagger API 文档规范

本文档详细说明 ApiAdmin 项目中 Swagger/OpenAPI 的开发规范、使用指南和安全注意事项。

## 目录

1. [概述](#1-概述)
2. [配置说明](#2-配置说明)
3. [开发规范](#3-开发规范)
4. [使用指南](#4-使用指南)
5. [安全注意事项](#5-安全注意事项)
6. [最佳实践](#6-最佳实践)
7. [故障排查](#7-故障排查)

## 1. 概述

### 1.1 什么是 Swagger

Swagger 是一个用于设计、构建、文档化和使用 RESTful Web 服务的工具集。ApiAdmin 使用 OpenAPI 3.0.0 规范来定义和文档化 API。

### 1.2 功能特性

- **自动生成 API 文档**：基于代码自动生成交互式 API 文档
- **在线测试**：在浏览器中直接测试 API 接口
- **代码生成**：支持生成客户端 SDK
- **安全控制**：支持 IP 白名单和访问控制

### 1.3 访问地址

- **Swagger UI**: `http://localhost:3000/swagger`
- **Swagger JSON**: `http://localhost:3000/swagger.json`
- **备用地址**: `http://localhost:3000/swagger-ui`

## 2. 配置说明

### 2.1 环境变量

在 `.env` 或 `.env.local` 文件中配置以下变量：

```env
# 启用/禁用 Swagger
SWAGGER_ENABLED=true

# IP 白名单（可选，多个 IP 用逗号分隔）
# 支持单个 IP 或 CIDR 格式（如 192.168.1.0/24）
SWAGGER_ALLOWED_IP_ADDRESSES=127.0.0.1,192.168.1.0/24
```

### 2.2 配置说明

#### SWAGGER_ENABLED

- **类型**: `boolean` 或 `string`
- **默认值**: `false`
- **说明**: 控制 Swagger UI 是否启用
- **可选值**: 
  - `true` / `'true'` / `'1'`: 启用
  - `false` / `'false'` / `'0'`: 禁用

#### SWAGGER_ALLOWED_IP_ADDRESSES

- **类型**: `string` (逗号分隔)
- **默认值**: `null` (不限制)
- **说明**: 限制访问 Swagger UI 的 IP 地址
- **格式**: 
  - 单个 IP: `127.0.0.1`
  - CIDR 网段: `192.168.1.0/24`
  - 多个地址: `127.0.0.1,192.168.1.0/24,10.0.0.1`

### 2.3 配置示例

#### 开发环境（本地访问）

```env
SWAGGER_ENABLED=true
SWAGGER_ALLOWED_IP_ADDRESSES=127.0.0.1,::1
```

#### 生产环境（内网访问）

```env
SWAGGER_ENABLED=true
SWAGGER_ALLOWED_IP_ADDRESSES=10.0.0.0/8,192.168.0.0/16
```

#### 生产环境（完全禁用）

```env
SWAGGER_ENABLED=false
```

## 3. 开发规范

### 3.1 文件结构

Swagger 定义文件位于 `Server/Utils/swagger.js`：

```
Server/
├── Utils/
│   └── swagger.js          # Swagger API 定义
├── Middleware/
│   └── swaggerWhitelist.js # IP 白名单中间件
└── App.js                  # Swagger UI 路由配置
```

### 3.2 API 定义规范

#### 3.2.1 基本结构

```javascript
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ApiAdmin API',
    version: '1.0.0',
    description: 'ApiAdmin API Documentation',
  },
  servers: [
    {
      url: `http://localhost:${config.PORT}`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    // API 路径定义
  },
};
```

#### 3.2.2 路径定义规范

每个 API 端点应包含以下信息：

```javascript
'/api/user/register': {
  post: {
    tags: ['User'],                    // 标签，用于分组
    summary: 'Register a new user',    // 简短描述
    description: 'Register a new user account with email, password and username', // 详细描述
    requestBody: {                     // 请求体（POST/PUT/PATCH）
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password', 'username'],
            properties: {
              email: {
                type: 'string',
                format: 'email',
                description: 'User email address',
                example: 'user@example.com',
              },
              password: {
                type: 'string',
                format: 'password',
                minLength: 6,
                description: 'User password',
              },
              username: {
                type: 'string',
                minLength: 3,
                maxLength: 20,
                description: 'Username',
              },
            },
          },
        },
      },
    },
    responses: {                       // 响应定义
      '200': {
        description: 'Registration successful',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    user: { type: 'object' },
                    token: { type: 'string' },
                  },
                },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      '400': {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
},
```

#### 3.2.3 认证定义

需要认证的接口应包含 `security` 字段：

```javascript
'/api/project/list': {
  get: {
    tags: ['Project'],
    summary: 'Get project list',
    security: [{ bearerAuth: [] }],  // 需要 JWT 认证
    responses: {
      '200': { /* ... */ },
      '401': {
        description: 'Unauthorized',
      },
    },
  },
},
```

#### 3.2.4 参数定义

##### 路径参数

```javascript
'/api/project/{id}': {
  get: {
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
        },
        description: 'Project ID',
      },
    ],
  },
},
```

##### 查询参数

```javascript
'/api/project/list': {
  get: {
    parameters: [
      {
        name: 'page',
        in: 'query',
        schema: {
          type: 'integer',
          default: 1,
          minimum: 1,
        },
        description: 'Page number',
      },
      {
        name: 'pageSize',
        in: 'query',
        schema: {
          type: 'integer',
          default: 10,
          minimum: 1,
          maximum: 100,
        },
        description: 'Items per page',
      },
    ],
  },
},
```

### 3.3 标签使用规范

使用标签对 API 进行分组，建议的标签命名：

- `User`: 用户相关接口
- `Project`: 项目相关接口
- `Interface`: 接口相关接口
- `Group`: 分组相关接口
- `Test`: 测试相关接口
- `Health`: 健康检查接口
- `System`: 系统相关接口

### 3.4 响应状态码规范

遵循 HTTP 状态码标准：

- `200`: 成功
- `201`: 创建成功
- `400`: 请求参数错误
- `401`: 未授权（需要登录）
- `403`: 禁止访问（权限不足）
- `404`: 资源不存在
- `429`: 请求过于频繁（限流）
- `500`: 服务器内部错误
- `503`: 服务不可用（依赖未就绪）

### 3.5 数据模型定义

使用 `components.schemas` 定义可复用的数据模型：

```javascript
components: {
  schemas: {
    User: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        username: { type: 'string' },
        email: { type: 'string', format: 'email' },
        role: {
          type: 'string',
          enum: ['super_admin', 'group_leader', 'project_leader', 'developer', 'guest'],
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    Error: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string' },
      },
    },
  },
},
```

然后在响应中引用：

```javascript
responses: {
  '200': {
    description: 'Success',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/User',
        },
      },
    },
  },
},
```

## 4. 使用指南

### 4.1 访问 Swagger UI

1. **确保 Swagger 已启用**

   检查环境变量 `SWAGGER_ENABLED=true`

2. **访问 Swagger UI**

   在浏览器中打开：`http://localhost:3000/swagger`

3. **查看 API 文档**

   Swagger UI 会显示所有已定义的 API 端点，按标签分组

### 4.2 测试 API

#### 4.2.1 未认证接口

1. 找到要测试的接口（如 `/api/user/register`）
2. 点击接口展开详情
3. 点击 "Try it out" 按钮
4. 填写请求参数
5. 点击 "Execute" 执行请求
6. 查看响应结果

#### 4.2.2 需要认证的接口

1. 首先登录获取 token：
   - 调用 `/api/user/login` 接口
   - 从响应中复制 `token` 值

2. 设置认证信息：
   - 点击页面右上角的 "Authorize" 按钮
   - 在弹出框中输入：`Bearer <your-token>`
   - 点击 "Authorize" 确认
   - 点击 "Close" 关闭对话框

3. 测试需要认证的接口：
   - 现在可以正常调用需要认证的接口
   - Token 会自动添加到请求头中

### 4.3 导出 API 定义

#### 4.3.1 导出 JSON

访问 `http://localhost:3000/swagger.json` 获取完整的 OpenAPI JSON 定义

#### 4.3.2 使用 Swagger UI 导出

1. 在 Swagger UI 页面
2. 点击右上角的下载按钮
3. 选择导出格式（JSON/YAML）

### 4.4 生成客户端 SDK

可以使用 OpenAPI Generator 或 Swagger Codegen 生成客户端 SDK：

```bash
# 使用 OpenAPI Generator
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:3000/swagger.json \
  -g typescript-axios \
  -o ./generated-client
```

## 5. 安全注意事项

### 5.1 生产环境安全

#### ⚠️ 重要警告

**在生产环境中，必须采取以下安全措施：**

1. **禁用或限制访问**
   - 如果不需要公开 API 文档，设置 `SWAGGER_ENABLED=false`
   - 如果需要访问，必须配置 IP 白名单

2. **配置 IP 白名单**

   ```env
   # 只允许内网访问
   SWAGGER_ENABLED=true
   SWAGGER_ALLOWED_IP_ADDRESSES=10.0.0.0/8,192.168.0.0/16,172.16.0.0/12
   ```

3. **使用 HTTPS**

   在生产环境中，确保通过 HTTPS 访问 Swagger UI，避免敏感信息泄露

4. **隐藏敏感信息**

   - 不要在 API 文档中暴露真实的密码、密钥等敏感信息
   - 使用示例值代替真实值
   - 对于敏感接口，考虑不在 Swagger 中暴露

### 5.2 IP 白名单配置

#### 5.2.1 支持的格式

- **单个 IP**: `127.0.0.1`
- **CIDR 网段**: `192.168.1.0/24`
- **多个地址**: `127.0.0.1,192.168.1.0/24,10.0.0.1`

#### 5.2.2 配置示例

```env
# 开发环境：只允许本地访问
SWAGGER_ALLOWED_IP_ADDRESSES=127.0.0.1,::1

# 测试环境：允许内网访问
SWAGGER_ALLOWED_IP_ADDRESSES=192.168.0.0/16,10.0.0.0/8

# 生产环境：严格限制
SWAGGER_ALLOWED_IP_ADDRESSES=10.1.1.100,10.1.1.101
```

#### 5.2.3 IP 检测机制

系统会按以下顺序检测客户端 IP：

1. `X-Forwarded-For` 请求头（第一个 IP）
2. `X-Real-IP` 请求头
3. Socket 远程地址
4. Koa 的 `ctx.ip`

### 5.3 认证安全

#### 5.3.1 Token 管理

- **不要在生产环境使用测试 Token**
- **定期轮换 JWT Secret**
- **设置合理的 Token 过期时间**

#### 5.3.2 敏感接口

对于包含敏感操作的接口（如删除、修改配置等），建议：

1. 不在 Swagger 中暴露
2. 或添加额外的安全说明
3. 使用更严格的权限控制

### 5.4 内容安全策略 (CSP)

Swagger UI 已配置了基本的内容安全策略，但建议在生产环境中：

1. 审查并调整 CSP 策略
2. 确保只加载可信的资源
3. 禁用内联脚本（如果可能）

### 5.5 日志和监控

建议：

1. **记录访问日志**
   - 记录所有 Swagger UI 的访问
   - 记录失败的访问尝试

2. **监控异常访问**
   - 监控来自未授权 IP 的访问尝试
   - 设置告警机制

3. **审计日志**
   - 记录通过 Swagger UI 执行的操作
   - 保留操作历史

## 6. 最佳实践

### 6.1 文档编写

1. **清晰的描述**
   - 为每个接口提供清晰的 `summary` 和 `description`
   - 使用中文或英文，保持一致性

2. **完整的参数说明**
   - 为所有参数提供 `description`
   - 使用 `example` 提供示例值
   - 明确标注 `required` 参数

3. **详细的响应定义**
   - 定义所有可能的响应状态码
   - 提供响应示例
   - 说明错误情况

4. **使用标签分组**
   - 合理使用标签对接口进行分组
   - 保持标签命名的一致性

### 6.2 版本管理

1. **API 版本控制**
   - 在 URL 中包含版本号：`/api/v1/user/login`
   - 或在 OpenAPI 的 `servers` 中定义不同版本

2. **文档版本**
   - 保持 `info.version` 与代码版本同步
   - 记录重要的变更历史

### 6.3 错误处理

1. **统一的错误格式**
   ```javascript
   {
     success: false,
     message: "错误描述",
     code: "ERROR_CODE",  // 可选
     details: {}          // 可选
   }
   ```

2. **完整的错误响应定义**
   - 为每个接口定义可能的错误响应
   - 使用 `components.schemas` 定义统一的错误模型

### 6.4 性能考虑

1. **避免暴露大量数据**
   - 对于返回列表的接口，使用分页
   - 限制单次返回的数据量

2. **合理的超时设置**
   - 在文档中说明接口的超时时间
   - 对于长时间运行的接口，考虑异步处理

### 6.5 维护建议

1. **及时更新文档**
   - 代码变更时同步更新 Swagger 定义
   - 定期审查文档的准确性

2. **代码审查**
   - 在代码审查时检查 Swagger 定义
   - 确保文档与实际实现一致

3. **自动化测试**
   - 使用 Swagger 定义生成测试用例
   - 验证 API 实现与文档的一致性

## 7. 故障排查

### 7.1 常见问题

#### 问题 1: Swagger UI 无法访问（404）

**可能原因：**
- `SWAGGER_ENABLED` 未设置为 `true`
- IP 不在白名单中

**解决方法：**
1. 检查环境变量配置
2. 检查 IP 白名单设置
3. 查看服务器日志

#### 问题 2: 静态资源加载失败（404）

**可能原因：**
- `swagger-ui-dist` 包未安装
- 静态文件服务配置错误

**解决方法：**
```bash
# 重新安装依赖
cd Server
npm install swagger-ui-dist
```

#### 问题 3: MIME 类型错误

**可能原因：**
- 静态文件服务的 MIME 类型设置不正确

**解决方法：**
- 检查 `Server/App.js` 中的静态文件服务配置
- 确保 CSS 和 JS 文件的 MIME 类型正确

#### 问题 4: 认证失败

**可能原因：**
- Token 格式错误
- Token 已过期
- JWT_SECRET 配置不一致

**解决方法：**
1. 检查 Token 格式：应为 `Bearer <token>`
2. 重新登录获取新 Token
3. 检查 JWT_SECRET 配置

#### 问题 5: IP 白名单不生效

**可能原因：**
- IP 格式错误
- 代理服务器导致 IP 检测不准确

**解决方法：**
1. 检查 IP 格式是否正确
2. 检查 `X-Forwarded-For` 和 `X-Real-IP` 请求头
3. 查看服务器日志中的实际 IP

### 7.2 调试技巧

#### 查看配置

```bash
# 检查环境变量
cd Server
cat .env.local | grep SWAGGER

# 检查 Swagger 是否启用
curl http://localhost:3000/swagger.json
```

#### 查看日志

```bash
# 查看服务器日志
# 在服务器日志中查找 Swagger 相关日志
grep -i swagger logs/*.log
```

#### 测试 IP 白名单

```bash
# 测试从不同 IP 访问
curl -H "X-Forwarded-For: 192.168.1.100" http://localhost:3000/swagger.json
```

### 7.3 联系支持

如果遇到无法解决的问题：

1. 查看项目 Issues
2. 查看相关文档
3. 联系开发团队

## 附录

### A. OpenAPI 3.0 规范参考

- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)

### B. 相关文件

- `Server/Utils/swagger.js`: Swagger API 定义
- `Server/Middleware/swaggerWhitelist.js`: IP 白名单中间件
- `Server/App.js`: Swagger UI 路由配置

### C. 环境变量参考

| 变量名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `SWAGGER_ENABLED` | boolean/string | `false` | 是否启用 Swagger |
| `SWAGGER_ALLOWED_IP_ADDRESSES` | string | `null` | IP 白名单（逗号分隔） |

---

**最后更新**: 2025-12-28  
**维护者**: ApiAdmin 开发团队



