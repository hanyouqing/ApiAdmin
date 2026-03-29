# ApiAdmin - 项目架构文档

## 1. 项目概述

ApiAdmin 是一个现代化的 API 管理平台，采用前后端分离架构，基于 React 18 + TypeScript + Koa + MongoDB 构建。

## 2. 技术栈

### 2.1 前端技术栈
- **框架**: React
- **语言**: TypeScript
- **UI 库**: Ant Design
- **状态管理**: Redux Toolkit (轻量场景可选 Zustand)
- **路由**: React Router
- **构建工具**: Vite
- **样式**: SCSS + Less
- **HTTP 客户端**: Axios
- **国际化**: i18next
- **代码编辑器**: Monaco Editor (推荐，替代 Ace Editor)
- **拖拽**: react-dnd
- **实时协作**: Yjs + y-websocket (CRDT 算法)

### 2.2 后端技术栈
- **框架**: Koa (可选 NestJS 企业级方案)
- **语言**: JavaScript (逐步迁移到 TypeScript)
- **数据库**: MongoDB + Mongoose
- **缓存**: Redis + ioredis
- **认证**: JWT (jsonwebtoken)
- **SSO 认证**: Passport.js + 多种策略
  - **SAML 2.0**: passport-saml
  - **OAuth 2.0**: passport-oauth2
  - **OpenID Connect**: passport-openidconnect
  - **LDAP/Active Directory**: ldapjs, passport-ldapauth
  - **CAS**: passport-cas
  - **可选 IAM**: Keycloak (统一身份提供者)
- **第三方登录**:
  - **GitHub.com 登录**: passport-oauth2 (OAuth 2.0)
  - **GitLab.com 登录**: passport-oauth2 (OAuth 2.0)
  - **Gmail 登录**: passport-google-oauth20 (OIDC)
  - **微信登录**: passport-wechat / 微信开放平台 OAuth2.0
  - **手机号登录**: 短信验证码 (OTP)
  - **邮箱验证码登录**: 邮件验证码 (OTP)
  - **白名单管理**: 支持 GitHub、GitLab、微信ID、手机号、邮箱白名单
- **WebSocket**: Socket.io (推荐，替代 koa-websocket)
- **文件上传**: koa-multer (支持云存储: AWS S3/阿里云 OSS)
- **会话管理**: Redis Session Store
- **安全**: helmet, express-rate-limit, bcrypt
- **日志**: Winston / Pino
- **监控**: 
  - **Prometheus**: 指标收集和监控
  - **prom-client**: Prometheus 客户端
  - **Sentry**: 错误追踪
- **邮件服务**: 
  - **Nodemailer**: SMTP 邮件发送
  - **SendGrid** (可选): 第三方邮件服务
  - **AWS SES** (可选): 云邮件服务
  - **阿里云邮件推送** (可选): 国内邮件服务
- **短信服务** (手机号登录):
  - **Twilio** (可选): 国际短信服务
  - **阿里云短信服务** (可选): 国内短信服务
  - **腾讯云短信** (可选): 国内短信服务

### 2.3 核心库
- **Mock**: Mockjs
- **Schema**: JSON Schema (ajv)
- **数据格式**: Json5
- **加密**: bcrypt (密码), crypto-js (其他加密)
- **工具**: lodash
- **API 文档**: ReDoc / RapiDoc (OpenAPI 文档展示)
- **测试**: Vitest (单元测试), Newman (Postman CLI)
- **图片处理**: Sharp

## 3. 项目结构

```
ApiAdmin/
├── Client/                    # 前端代码
│   ├── Application.tsx       # 应用主组件
│   ├── Index.tsx             # 入口文件
│   ├── Components/           # 公共组件
│   │   ├── UI/              # UI 基础组件
│   │   ├── AceEditor/       # 代码编辑器
│   │   ├── Breadcrumb/      # 面包屑导航
│   │   ├── Header/          # 页面头部
│   │   ├── Loading/         # 加载组件
│   │   └── ...
│   ├── Containers/          # 页面容器组件
│   │   ├── Home/            # 首页
│   │   ├── Login/           # 登录页
│   │   ├── Group/           # 分组管理
│   │   ├── Project/         # 项目管理
│   │   │   ├── Interface/   # 接口管理
│   │   │   ├── Setting/     # 项目设置
│   │   │   └── Activity/    # 项目动态
│   │   ├── User/            # 用户中心
│   │   └── ...
│   ├── Reducer/             # Redux 状态管理
│   │   ├── Create.ts        # Store 创建
│   │   ├── Modules/         # Reducer 模块
│   │   │   ├── User.ts      # 用户状态
│   │   │   ├── Group.ts     # 分组状态
│   │   │   ├── Project.ts   # 项目状态
│   │   │   ├── Interface.ts # 接口状态
│   │   │   └── ...
│   │   └── Middleware/      # 中间件
│   ├── I18n/                # 国际化
│   │   ├── Config.ts        # i18n 配置
│   │   └── Locales/         # 语言文件
│   ├── Styles/              # 全局样式
│   │   ├── Common.scss      # 通用样式
│   │   ├── Mixin.scss       # SCSS 混入
│   │   └── Theme.less       # Ant Design 主题
│   ├── Constants/           # 常量定义
│   ├── Utils.ts             # 工具函数
│   └── Plugin.ts            # 插件系统入口
│
├── Server/                   # 后端代码
│   ├── App.js               # 应用入口
│   ├── Router.js            # 路由配置
│   ├── WebSocket.js         # WebSocket 服务
│   ├── Install.js           # 安装脚本
│   ├── Plugin.js            # 插件系统
│   ├── Controllers/         # 控制器
│   │   ├── Base.js          # 基础控制器
│   │   ├── User.js          # 用户控制器
│   │   ├── Group.js         # 分组控制器
│   │   ├── Project.js       # 项目控制器
│   │   ├── Interface.js     # 接口控制器
│   │   ├── InterfaceCol.js  # 接口集合控制器
│   │   ├── Test.js          # 测试控制器
│   │   ├── Follow.js        # 关注控制器
│   │   ├── Log.js           # 日志控制器
│   │   └── Open.js          # OpenAPI 控制器
│   ├── Models/              # 数据模型
│   │   ├── Base.js          # 基础模型
│   │   ├── User.js          # 用户模型
│   │   ├── Group.js         # 分组模型
│   │   ├── Project.js       # 项目模型
│   │   ├── Interface.js     # 接口模型
│   │   ├── InterfaceCat.js  # 接口分类模型
│   │   ├── InterfaceCol.js  # 接口集合模型
│   │   ├── InterfaceCase.js # 测试用例模型
│   │   ├── Token.js         # Token 模型
│   │   ├── Follow.js        # 关注模型
│   │   ├── Log.js           # 日志模型
│   │   ├── Storage.js       # 存储模型
│   │   └── Avatar.js        # 头像模型
│   ├── Middleware/          # 中间件
│   │   └── MockServer.js    # Mock 服务中间件
│   └── Utils/               # 工具函数
│       ├── Commons.js       # 通用工具
│       ├── Request.js       # 请求工具
│       └── ...
│
├── Core/                     # 核心公共代码
│   ├── Config.js            # 配置管理
│   ├── Utils.js             # 核心工具
│   ├── Lib.js               # 核心库
│   ├── MockExtra.js         # Mock 扩展
│   ├── SchemaTransformToTable.js # Schema 转换
│   ├── MergeJsonSchema.js   # Schema 合并
│   ├── PostmanLib.js        # Postman 库
│   ├── HandleImportData.js  # 数据导入处理
│   ├── Formats.js           # 格式处理
│   ├── Markdown.js          # Markdown 处理
│   └── ...
│
├── Plugins/                  # 插件系统
│   ├── AdvancedMock/         # 高级 Mock 插件
│   ├── ExportData/          # 数据导出插件
│   ├── ExportSwagger2Data/  # Swagger 导出插件
│   ├── GenServices/         # 代码生成插件
│   ├── ImportHar/           # HAR 导入插件
│   ├── ImportPostman/       # Postman 导入插件
│   ├── ImportSwagger/       # Swagger 导入插件
│   ├── ImportApiAdminJson/      # ApiAdmin JSON 导入插件
│   ├── Statistics/          # 统计插件
│   ├── SwaggerAutoSync/     # Swagger 自动同步插件
│   └── Wiki/                # Wiki 插件
│
├── Static/                   # 静态资源
│   ├── Index.html           # HTML 模板
│   ├── Iconfont/            # 图标字体
│   └── Image/               # 图片资源
│
├── package.json              # 项目配置
├── tsconfig.json             # TypeScript 配置
├── vite.config.ts            # Vite 配置
└── README.md                 # 项目说明
```

## 4. 核心模块设计

### 4.1 用户与权限模块

#### 4.1.1 数据模型
- **User Model**: 用户信息、角色、权限
- **Group Model**: 分组信息、成员、权限
- **Project Model**: 项目信息、成员、权限

#### 4.1.2 权限控制
```typescript
// 权限角色枚举
enum UserRole {
  SUPER_ADMIN = 'super_admin',    // 超级管理员
  GROUP_LEADER = 'group_leader',   // 分组组长
  PROJECT_LEADER = 'project_leader', // 项目组长
  DEVELOPER = 'developer',        // 开发者
  GUEST = 'guest'                  // 游客
}

// 权限检查中间件
function checkPermission(requiredRole: UserRole) {
  // 权限验证逻辑
}
```

### 4.2 接口管理模块

#### 4.2.1 数据模型
- **Interface Model**: 接口基本信息
- **InterfaceCat Model**: 接口分类
- **InterfaceCol Model**: 测试集合

#### 4.2.2 核心功能
- 接口 CRUD
- 接口编辑（请求参数、返回数据）
- 接口运行/调试
- 接口预览

### 4.3 Mock 服务模块

#### 4.3.1 Mock 引擎
```typescript
// Mock 数据生成器
class MockGenerator {
  // 基于 Mockjs 生成数据
  generateFromMockjs(template: string): any;
  
  // 基于 JSON Schema 生成数据
  generateFromSchema(schema: JSONSchema): any;
  
  // 处理 Mock 期望
  handleMockExpectation(request: Request): Response;
  
  // 执行自定义脚本
  executeCustomScript(script: string, context: MockContext): any;
}
```

#### 4.3.2 Mock 优先级
1. Mock 期望（匹配条件）
2. 自定义 Mock 脚本
3. 项目全局 Mock 脚本
4. 普通 Mock（接口定义的 Mock 数据）

### 4.4 自动化测试模块

#### 4.4.1 测试引擎
```typescript
// 测试执行器
class TestRunner {
  // 执行测试用例
  async runTestCase(testCase: TestCase): Promise<TestResult>;
  
  // 执行测试集合
  async runTestCollection(collection: TestCollection): Promise<TestReport>;
  
  // 变量解析
  resolveVariables(expression: string, context: TestContext): any;
  
  // 断言执行
  executeAssertions(script: string, response: Response): AssertionResult;
}
```

### 4.5 数据导入导出模块

#### 4.5.1 导入器
```typescript
// 数据导入接口
interface DataImporter {
  import(data: any, options: ImportOptions): Promise<ImportResult>;
}

// 各种格式的导入器
class PostmanImporter implements DataImporter { }
class SwaggerImporter implements DataImporter { }
class HARImporter implements DataImporter { }
```

#### 4.5.2 导出器
```typescript
// 数据导出接口
interface DataExporter {
  export(interfaces: Interface[], options: ExportOptions): Promise<ExportResult>;
}

// 各种格式的导出器
class JSONExporter implements DataExporter { }
class SwaggerExporter implements DataExporter { }
class MarkdownExporter implements DataExporter { }
```

## 5. API 设计

### 5.1 RESTful API 规范

#### 5.1.1 用户相关
```
POST   /api/user/register          # 用户注册
POST   /api/user/login             # 用户登录
POST   /api/user/logout            # 用户登出
GET    /api/user/info              # 获取用户信息
PUT    /api/user/info              # 更新用户信息
POST   /api/user/password/reset    # 重置密码
```

#### 5.1.7 SSO 认证相关
```
GET    /api/auth/sso/providers     # 获取可用的 SSO 提供者列表
GET    /api/auth/sso/:provider     # 发起 SSO 认证（重定向到 IdP）
POST   /api/auth/sso/:provider/callback  # SSO 回调处理
GET    /api/auth/sso/config        # 获取 SSO 配置（管理员）
POST   /api/auth/sso/config        # 创建 SSO 配置（管理员）
PUT    /api/auth/sso/config/:id    # 更新 SSO 配置（管理员）
DELETE /api/auth/sso/config/:id    # 删除 SSO 配置（管理员）
POST   /api/auth/sso/mapping       # 配置 SSO 用户角色映射（管理员）
```

#### 5.1.2 分组相关
```
GET    /api/group/list             # 获取分组列表
POST   /api/group/add              # 创建分组
PUT    /api/group/up               # 更新分组
DELETE /api/group/del              # 删除分组
GET    /api/group/get              # 获取分组详情
POST   /api/group/member/add       # 添加成员
DELETE /api/group/member/del       # 移除成员
```

#### 5.1.3 项目相关
```
GET    /api/project/list           # 获取项目列表
POST   /api/project/add            # 创建项目
PUT    /api/project/up             # 更新项目
DELETE /api/project/del            # 删除项目
GET    /api/project/get            # 获取项目详情
POST   /api/project/copy           # 复制项目
POST   /api/project/transfer       # 迁移项目
```

#### 5.1.4 接口相关
```
GET    /api/interface/list         # 获取接口列表
POST   /api/interface/add          # 创建接口
PUT    /api/interface/up           # 更新接口
DELETE /api/interface/del          # 删除接口
GET    /api/interface/get          # 获取接口详情
POST   /api/interface/run          # 运行接口
```

#### 5.1.5 Mock 相关
```
GET    /mock/:projectId/:path      # Mock 接口
POST   /api/mock/expectation/add   # 添加 Mock 期望
PUT    /api/mock/expectation/up    # 更新 Mock 期望
DELETE /api/mock/expectation/del   # 删除 Mock 期望
```

#### 5.1.6 测试相关
```
GET    /api/test/collection/list   # 获取测试集合列表
POST   /api/test/collection/add    # 创建测试集合
POST   /api/test/case/add          # 添加测试用例
POST   /api/test/run               # 运行测试
GET    /api/test/report/:id       # 获取测试报告
```

### 5.2 WebSocket API

#### 5.2.1 实时协作
```typescript
// 接口编辑协作
interface WebSocketMessage {
  type: 'interface_edit' | 'interface_save' | 'user_join' | 'user_leave';
  data: any;
  userId: string;
  timestamp: number;
}
```

## 6. 数据库设计

### 6.1 核心集合（Collections）

#### 6.1.1 users - 用户表
```javascript
{
  _id: ObjectId,
  username: String,        // 用户名
  email: String,           // 邮箱
  password: String,        // 密码（加密）
  role: String,           // 角色
  avatar: String,         // 头像
  created_at: Date,       // 创建时间
  updated_at: Date        // 更新时间
}
```

#### 6.1.2 groups - 分组表
```javascript
{
  _id: ObjectId,
  group_name: String,      // 分组名称
  group_desc: String,      // 分组描述
  uid: ObjectId,          // 创建者 ID
  member: [ObjectId],     // 成员列表
  created_at: Date,
  updated_at: Date
}
```

#### 6.1.3 projects - 项目表
```javascript
{
  _id: ObjectId,
  project_name: String,    // 项目名称
  project_desc: String,    // 项目描述
  group_id: ObjectId,      // 所属分组
  uid: ObjectId,          // 创建者 ID
  icon: String,          // 项目图标
  color: String,         // 背景色
  basepath: String,      // 基本路径
  member: [ObjectId],    // 成员列表
  env: [Object],         // 环境配置
  tag: [Object],         // Tag 配置
  created_at: Date,
  updated_at: Date
}
```

#### 6.1.4 interfaces - 接口表
```javascript
{
  _id: ObjectId,
  project_id: ObjectId,   // 项目 ID
  catid: ObjectId,        // 分类 ID
  title: String,          // 接口名称
  path: String,           // 接口路径
  method: String,         // HTTP 方法
  req_query: [Object],   // Query 参数
  req_headers: [Object], // 请求头
  req_body_type: String,  // Body 类型
  req_body_form: [Object],// Form 参数
  req_body_other: String,// 其他 Body
  req_body: String,      // 请求 Body
  res_body: String,      // 返回数据
  res_body_type: String, // 返回类型
  status: String,        // 接口状态
  tag: [String],        // Tag 标签
  desc: String,         // 描述
  markdown: String,     // Markdown 描述
  uid: ObjectId,        // 创建者
  created_at: Date,
  updated_at: Date
}
```

#### 6.1.5 interface_cases - 测试用例表
```javascript
{
  _id: ObjectId,
  col_id: ObjectId,      // 测试集合 ID
  interface_id: ObjectId,// 接口 ID
  title: String,         // 用例名称
  req_query: [Object],  // Query 参数
  req_headers: [Object],// 请求头
  req_body: String,     // 请求 Body
  res_body: String,     // 返回数据
  test_script: String, // 断言脚本
  index: Number,        // 排序索引
  created_at: Date,
  updated_at: Date
}
```

## 7. 状态管理设计

### 7.1 Redux Store 结构
```typescript
interface RootState {
  user: UserState;           // 用户状态
  group: GroupState;         // 分组状态
  project: ProjectState;     // 项目状态
  interface: InterfaceState; // 接口状态
  interfaceCol: InterfaceColState; // 接口集合状态
  test: TestState;          // 测试状态
  mock: MockState;          // Mock 状态
  ui: UIState;              // UI 状态
}
```

### 7.2 异步操作
使用 Redux Toolkit 的 `createAsyncThunk` 处理异步操作：
```typescript
// 示例：获取项目列表
const fetchProjects = createAsyncThunk(
  'project/fetchList',
  async (groupId: string) => {
    const response = await api.get(`/api/project/list?group_id=${groupId}`);
    return response.data;
  }
);
```

## 8. 安全设计

### 8.1 认证机制

#### 8.1.1 本地认证
- JWT Token 认证
- Token 过期时间管理
- 刷新 Token 机制
- 密码加密存储（bcrypt，替代 MD5/SHA256）

#### 8.1.2 SSO 单点登录集成

**支持的协议**:
- **SAML 2.0**: 企业级 SSO，适用于 B2B 场景
- **OAuth 2.0**: 授权框架，支持第三方应用授权
- **OpenID Connect (OIDC)**: 基于 OAuth 2.0 的身份认证协议
- **LDAP/Active Directory**: 企业目录服务集成
- **CAS (Central Authentication Service)**: 中央认证服务

**技术实现**:
```typescript
// SSO 认证策略配置
interface SSOConfig {
  type: 'saml' | 'oauth2' | 'oidc' | 'ldap' | 'cas';
  enabled: boolean;
  config: SAMLConfig | OAuth2Config | OIDCConfig | LDAPConfig | CASConfig;
}

// SAML 2.0 配置
interface SAMLConfig {
  entryPoint: string;        // IdP SSO URL
  issuer: string;            // SP Entity ID
  callbackUrl: string;        // ACS URL
  cert: string;              // IdP 证书
  privateKey?: string;       // SP 私钥（可选）
  signatureAlgorithm?: string;
  digestAlgorithm?: string;
}

// OAuth 2.0 配置
interface OAuth2Config {
  authorizationURL: string;
  tokenURL: string;
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope: string[];
}

// OpenID Connect 配置
interface OIDCConfig {
  issuer: string;
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope: string[];
  discoveryURL?: string;    // OIDC Discovery 端点
}

// LDAP 配置
interface LDAPConfig {
  serverUrl: string;
  bindDN: string;
  bindCredentials: string;
  searchBase: string;
  searchFilter: string;
  tlsOptions?: object;
}

// CAS 配置
interface CASConfig {
  version: '1.0' | '2.0' | '3.0';
  ssoBaseURL: string;
  serverBaseURL: string;
  serviceURL: string;
}
```

**认证流程**:
1. 用户选择 SSO 登录方式
2. 重定向到身份提供者（IdP）
3. 用户在 IdP 完成认证
4. IdP 回调到应用，携带认证信息
5. 应用验证并创建本地会话
6. 返回 JWT Token 给前端

### 8.2 权限验证
- 中间件权限检查
- 前端路由守卫
- API 接口权限验证
- SSO 用户权限映射（将 SSO 用户角色映射到系统角色）

### 8.3 数据安全
- 密码加密存储（bcrypt，替代 MD5/SHA256）
- XSS 防护
- CSRF 防护
- SQL 注入防护（MongoDB 查询验证）
- SSO 请求签名验证
- Token 加密传输

## 9. 性能优化

### 9.1 前端优化
- 代码分割（路由级别）
- 组件懒加载
- 虚拟滚动（长列表）
- 图片懒加载
- 缓存策略

### 9.2 后端优化
- 数据库索引优化
- 查询优化
- 缓存机制（Redis，可选）
- 接口限流

## 10. 部署方案

### 10.1 开发环境
- 前后端分离开发
- 热更新支持
- 开发代理配置

### 10.2 生产环境
- 前端构建静态文件
- 后端服务部署
- Nginx 反向代理
- PM2 进程管理
- MongoDB 数据库

### 10.3 Docker 容器化部署

#### 10.3.1 Dockerfile 配置

**多阶段构建 Dockerfile**:
```dockerfile
# 阶段1: 构建前端
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY Client/ ./Client/
COPY vite.config.ts tsconfig.json ./
RUN npm run build

# 阶段2: 构建后端
FROM node:18-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY Server/ ./Server/
COPY Core/ ./Core/
COPY Plugins/ ./Plugins/

# 阶段3: 生产镜像
FROM node:18-alpine
WORKDIR /app

# 安装生产依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制构建产物
COPY --from=frontend-builder /app/dist ./Static
COPY --from=backend-builder /app/Server ./Server
COPY --from=backend-builder /app/Core ./Core
COPY --from=backend-builder /app/Plugins ./Plugins

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置权限
RUN chown -R nodejs:nodejs /app
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 启动应用
CMD ["node", "Server/app.js"]
```

#### 10.3.2 Docker Compose 配置

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  apiadmin:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: apiadmin
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URL=mongodb://mongodb:27017/apiadmin
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET:-your-secret-key}
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    restart: unless-stopped
    networks:
      - apiadmin-network

  mongodb:
    image: mongo:6.0
    container_name: apiadmin-mongodb
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD:-admin123}
      - MONGO_INITDB_DATABASE=apiadmin
    volumes:
      - mongodb-data:/data/db
      - ./scripts/mongo-init.js:/docker-entrypoint-initdb.d/init.js:ro
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - apiadmin-network

  redis:
    image: redis:7-alpine
    container_name: apiadmin-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redis123}
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    restart: unless-stopped
    networks:
      - apiadmin-network

  nginx:
    image: nginx:alpine
    container_name: apiadmin-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - apiadmin
    restart: unless-stopped
    networks:
      - apiadmin-network

volumes:
  mongodb-data:
  redis-data:

networks:
  apiadmin-network:
    driver: bridge
```

**环境变量配置 (.env.example)**:
```bash
# 应用配置
NODE_ENV=production
PORT=3000

# 数据库配置
MONGODB_URL=mongodb://mongodb:27017/apiadmin
MONGO_PASSWORD=your-mongodb-password

# Redis 配置
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your-redis-password

# JWT 配置
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# 邮件服务配置（可选）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password

# 文件上传配置
UPLOAD_MAX_SIZE=10485760
UPLOAD_PATH=/app/uploads
```

#### 10.3.3 使用 Docker Compose 部署

```bash
# 1. 构建并启动所有服务
docker-compose up -d

# 2. 查看服务状态
docker-compose ps

# 3. 查看日志
docker-compose logs -f apiadmin

# 4. 停止服务
docker-compose down

# 5. 停止并删除数据卷
docker-compose down -v

# 6. 更新服务
docker-compose pull
docker-compose up -d
```

### 10.4 Kubernetes 部署

#### 10.4.1 Helm Chart 结构

```
helm/
├── Chart.yaml              # Chart 元数据
├── values.yaml             # 默认配置值
├── templates/              # Kubernetes 模板
│   ├── deployment.yaml     # Deployment 配置
│   ├── service.yaml         # Service 配置
│   ├── ingress.yaml         # Ingress 配置
│   ├── configmap.yaml       # ConfigMap 配置
│   ├── secret.yaml          # Secret 配置
│   ├── pvc.yaml             # PersistentVolumeClaim 配置
│   └── hpa.yaml             # HorizontalPodAutoscaler 配置
└── README.md                # Chart 说明文档
```

#### 10.4.2 Helm Chart 配置

**Chart.yaml**:
```yaml
apiVersion: v2
name: apiadmin
description: A Helm chart for ApiAdmin API Management Platform
type: application
version: 1.0.0
appVersion: "1.0.0"
keywords:
  - api
  - management
  - mock
  - testing
maintainers:
  - name: ApiAdmin Team
```

**values.yaml** (主要配置):
```yaml
replicaCount: 2

image:
  repository: apiadmin/apiadmin
  pullPolicy: IfNotPresent
  tag: "latest"

imagePullSecrets: []

nameOverride: ""
fullnameOverride: ""

serviceAccount:
  create: true
  annotations: {}
  name: ""

podAnnotations: {}

podSecurityContext:
  fsGroup: 1001

securityContext:
  capabilities:
    drop:
    - ALL
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  runAsUser: 1001

service:
  type: ClusterIP
  port: 3000

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: apiadmin.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: apiadmin-tls
      hosts:
        - apiadmin.example.com

resources:
  limits:
    cpu: 1000m
    memory: 2Gi
  requests:
    cpu: 500m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

nodeSelector: {}

tolerations: []

affinity: {}

mongodb:
  enabled: true
  auth:
    enabled: true
    rootPassword: "change-me"
    database: "apiadmin"
  persistence:
    enabled: true
    size: 20Gi
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi

redis:
  enabled: true
  auth:
    enabled: true
    password: "change-me"
  persistence:
    enabled: true
    size: 10Gi
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

env:
  NODE_ENV: production
  PORT: "3000"

config:
  jwtSecret: "change-me"
  jwtExpiresIn: "7d"
  uploadMaxSize: "10485760"

persistence:
  enabled: true
  storageClass: ""
  accessMode: ReadWriteOnce
  size: 10Gi
```

#### 10.4.3 Kubernetes 部署步骤

```bash
# 1. 添加 Helm 仓库（如果使用私有仓库）
helm repo add apiadmin https://charts.apiadmin.com
helm repo update

# 2. 安装 Chart
helm install apiadmin ./helm \
  --namespace apiadmin \
  --create-namespace \
  --set mongodb.auth.rootPassword=your-password \
  --set redis.auth.password=your-redis-password \
  --set config.jwtSecret=your-jwt-secret

# 3. 查看部署状态
kubectl get pods -n apiadmin
kubectl get svc -n apiadmin
kubectl get ingress -n apiadmin

# 4. 查看日志
kubectl logs -f deployment/apiadmin -n apiadmin

# 5. 升级部署
helm upgrade apiadmin ./helm \
  --namespace apiadmin \
  --set image.tag=v1.1.0

# 6. 卸载部署
helm uninstall apiadmin -n apiadmin
```

#### 10.4.4 高可用配置

- **多副本部署**: 通过 `replicaCount` 配置多个 Pod 实例
- **自动扩缩容**: 使用 HPA (HorizontalPodAutoscaler) 根据 CPU/内存自动扩缩容
- **数据库高可用**: MongoDB 副本集或使用云数据库服务
- **Redis 高可用**: Redis Sentinel 或 Redis Cluster
- **负载均衡**: 通过 Service 和 Ingress 实现负载均衡
- **持久化存储**: 使用 PVC 保证数据持久化

#### 10.4.5 监控与日志

- **Prometheus 监控**: 集成 Prometheus Operator
- **Grafana 仪表盘**: 可视化监控指标
- **日志收集**: 使用 Fluentd 或 Filebeat 收集日志
- **分布式追踪**: 可选集成 Jaeger 或 Zipkin

## 11. 邮件服务设计

### 11.1 邮件服务架构

```typescript
// Server/Services/EmailService.ts
interface EmailService {
  sendEmail(options: EmailOptions): Promise<EmailResult>;
  sendVerificationCode(email: string, code: string): Promise<void>;
  sendWelcomeEmail(email: string, username: string): Promise<void>;
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  attachments?: Attachment[];
}
```

### 11.2 支持的邮件服务商

- **SMTP**: 通用 SMTP 协议（Gmail、Outlook、自定义服务器）
- **SendGrid**: 第三方邮件服务（高可用、统计分析）
- **AWS SES**: 云邮件服务（可扩展、低成本）
- **阿里云邮件推送**: 国内邮件服务

### 11.3 邮件模板

- 验证码邮件模板
- 欢迎邮件模板
- 密码重置邮件模板
- 通知邮件模板

## 12. 监控系统设计

### 12.1 Prometheus 集成

```typescript
// Server/Middleware/Metrics.ts
import client from 'prom-client';

// 注册默认指标
client.collectDefaultMetrics();

// 自定义指标
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// 暴露指标端点
app.get('/metrics', async (ctx) => {
  ctx.set('Content-Type', client.register.contentType);
  ctx.body = await client.register.metrics();
});
```

### 12.2 监控指标

- **HTTP 指标**: 请求数、响应时间、错误率
- **系统指标**: CPU、内存、磁盘使用率
- **业务指标**: 用户数、接口调用数、Mock 请求数
- **数据库指标**: 连接数、查询时间

### 12.3 性能监控与分析系统

#### 12.3.1 数据存储

**时间序列数据库**:
- **InfluxDB**: 高性能时间序列数据库（推荐）
- **TimescaleDB**: 基于 PostgreSQL 的时间序列扩展
- **MongoDB**: 使用现有数据库存储聚合数据

#### 12.3.2 API 调用统计

```typescript
// Server/Models/APICallLog.ts
const APICallLogSchema = new mongoose.Schema({
  projectId: { type: ObjectId, required: true, index: true },
  interfaceId: { type: ObjectId, required: true, index: true },
  method: { type: String, required: true },
  path: { type: String, required: true },
  statusCode: { type: Number, required: true },
  responseTime: { type: Number, required: true }, // 毫秒
  requestSize: { type: Number },
  responseSize: { type: Number },
  userId: { type: ObjectId, index: true },
  ip: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
});

// 聚合统计
interface APIStatistics {
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  callsByHour: Array<{ hour: string; count: number }>;
  callsByDay: Array<{ day: string; count: number }>;
  topErrors: Array<{ statusCode: number; count: number }>;
}
```

#### 12.3.3 响应时间分析

```typescript
// Server/Services/AnalyticsService.ts
export class AnalyticsService {
  // 获取接口响应时间分析
  async getResponseTimeAnalysis(
    interfaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ResponseTimeAnalysis> {
    const logs = await APICallLog.find({
      interfaceId,
      timestamp: { $gte: startDate, $lte: endDate },
    });

    const responseTimes = logs.map(log => log.responseTime);
    const sorted = responseTimes.sort((a, b) => a - b);

    return {
      avg: this.average(responseTimes),
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      distribution: this.getDistribution(responseTimes),
    };
  }

  // 错误率统计
  async getErrorRate(
    interfaceId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ErrorRateStats> {
    const logs = await APICallLog.find({
      interfaceId,
      timestamp: { $gte: startDate, $lte: endDate },
    });

    const total = logs.length;
    const errors = logs.filter(log => log.statusCode >= 400).length;

    return {
      total,
      errors,
      errorRate: total > 0 ? (errors / total) * 100 : 0,
      errorsByStatus: this.groupBy(logs.filter(log => log.statusCode >= 400), 'statusCode'),
    };
  }

  // 使用趋势分析
  async getUsageTrend(
    projectId: string,
    period: 'hour' | 'day' | 'week' | 'month'
  ): Promise<UsageTrend> {
    const groupBy = this.getGroupByFormat(period);
    
    const trend = await APICallLog.aggregate([
      {
        $match: {
          projectId: new mongoose.Types.ObjectId(projectId),
          timestamp: { $gte: this.getStartDate(period) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: groupBy, date: '$timestamp' } },
          count: { $sum: 1 },
          avgResponseTime: { $avg: '$responseTime' },
          errorCount: {
            $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      period,
      data: trend.map(item => ({
        time: item._id,
        calls: item.count,
        avgResponseTime: item.avgResponseTime,
        errors: item.errorCount,
      })),
    };
  }
}
```

#### 12.3.4 监控看板 API

```typescript
// Server/Controllers/AnalyticsController.ts
export class AnalyticsController {
  // 获取接口统计
  async getInterfaceStats(ctx: Context) {
    const { interfaceId, startDate, endDate } = ctx.query;
    const stats = await analyticsService.getInterfaceStatistics(
      interfaceId,
      new Date(startDate),
      new Date(endDate)
    );
    ctx.body = stats;
  }

  // 获取响应时间分析
  async getResponseTimeAnalysis(ctx: Context) {
    const { interfaceId, startDate, endDate } = ctx.query;
    const analysis = await analyticsService.getResponseTimeAnalysis(
      interfaceId,
      new Date(startDate),
      new Date(endDate)
    );
    ctx.body = analysis;
  }

  // 获取使用趋势
  async getUsageTrend(ctx: Context) {
    const { projectId, period = 'day' } = ctx.query;
    const trend = await analyticsService.getUsageTrend(projectId, period);
    ctx.body = trend;
  }

  // 获取错误率统计
  async getErrorRate(ctx: Context) {
    const { interfaceId, startDate, endDate } = ctx.query;
    const errorRate = await analyticsService.getErrorRate(
      interfaceId,
      new Date(startDate),
      new Date(endDate)
    );
    ctx.body = errorRate;
  }
}
```

## 13. 第三方登录设计

### 13.1 微信登录

```typescript
// Server/Middleware/Auth/WeChatStrategy.ts
import passport from 'passport';
import { Strategy as WeChatStrategy } from 'passport-wechat';

export function configureWeChatStrategy(config: WeChatConfig) {
  passport.use('wechat', new WeChatStrategy(
    {
      appID: config.appID,
      appSecret: config.appSecret,
      callbackURL: config.callbackURL,
      scope: 'snsapi_login',
    },
    async (accessToken, refreshToken, profile, done) => {
      // 检查白名单
      if (!isInWhitelist('wechat', profile.openid)) {
        return done(new Error('User not in whitelist'), null);
      }

      // 查找或创建用户
      let user = await User.findOne({
        ssoProvider: 'wechat',
        ssoId: profile.openid,
      });

      if (!user) {
        user = await User.create({
          username: profile.nickname,
          email: `${profile.openid}@wechat.local`,
          ssoProvider: 'wechat',
          ssoId: profile.openid,
          ssoAttributes: profile,
          role: UserRole.GUEST,
        });
      }

      return done(null, user);
    }
  ));
}
```

### 13.2 手机号登录

```typescript
// Server/Controllers/AuthController.ts
export class AuthController {
  // 发送验证码
  async sendPhoneCode(ctx: Context) {
    const { phone } = ctx.request.body;
    
    // 检查白名单
    if (!isInWhitelist('phone', phone)) {
      return ctx.throw(403, 'Phone number not in whitelist');
    }

    // 生成验证码
    const code = generateOTP(6);
    
    // 存储验证码（Redis，5分钟过期）
    await redis.setex(`phone:code:${phone}`, 300, code);
    
    // 发送短信
    await smsService.send(phone, `您的验证码是：${code}，5分钟内有效`);
    
    ctx.body = { success: true, message: '验证码已发送' };
  }

  // 手机号登录
  async loginWithPhone(ctx: Context) {
    const { phone, code } = ctx.request.body;
    
    // 验证验证码
    const storedCode = await redis.get(`phone:code:${phone}`);
    if (storedCode !== code) {
      return ctx.throw(400, 'Invalid verification code');
    }

    // 删除验证码
    await redis.del(`phone:code:${phone}`);

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

### 13.3 Gmail 登录

```typescript
// Server/Middleware/Auth/GoogleStrategy.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

export function configureGoogleStrategy(config: GoogleConfig) {
  passport.use('google', new GoogleStrategy(
    {
      clientID: config.clientID,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackURL,
    },
    async (accessToken, refreshToken, profile, done) => {
      const email = profile.emails[0].value;
      
      // 检查白名单（仅允许 Gmail 邮箱）
      if (!isInWhitelist('email', email)) {
        return done(new Error('Email not in whitelist'), null);
      }

      let user = await User.findOne({
        email,
        ssoProvider: 'google',
      });

      if (!user) {
        user = await User.create({
          email,
          username: profile.displayName,
          ssoProvider: 'google',
          ssoId: profile.id,
          ssoAttributes: profile,
          role: UserRole.GUEST,
        });
      }

      return done(null, user);
    }
  ));
}
```

### 13.4 邮箱验证码登录

```typescript
// Server/Controllers/AuthController.ts
export class AuthController {
  // 发送邮箱验证码
  async sendEmailCode(ctx: Context) {
    const { email } = ctx.request.body;
    
    // 检查白名单
    if (!isInWhitelist('email', email)) {
      return ctx.throw(403, 'Email not in whitelist');
    }

    // 生成验证码
    const code = generateOTP(6);
    
    // 存储验证码
    await redis.setex(`email:code:${email}`, 300, code);
    
    // 发送邮件
    await emailService.sendVerificationCode(email, code);
    
    ctx.body = { success: true, message: '验证码已发送到邮箱' };
  }

  // 邮箱验证码登录
  async loginWithEmailCode(ctx: Context) {
    const { email, code } = ctx.request.body;
    
    // 验证验证码
    const storedCode = await redis.get(`email:code:${email}`);
    if (storedCode !== code) {
      return ctx.throw(400, 'Invalid verification code');
    }

    await redis.del(`email:code:${email}`);

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        email,
        username: email.split('@')[0],
        role: UserRole.GUEST,
      });
    }

    const token = generateJWT(user);
    ctx.body = { token, user };
  }
}
```

### 13.5 白名单管理

```typescript
// Server/Models/Whitelist.ts
const WhitelistSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['wechat', 'phone', 'email'],
    required: true,
  },
  value: { type: String, required: true }, // 微信ID、手机号、邮箱
  description: String,
  enabled: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// 白名单检查工具
export async function isInWhitelist(
  type: 'wechat' | 'phone' | 'email',
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
```

---

**文档版本**：v0.0.1
**创建日期**：2025-01-27  
**最后更新**：2025-01-27

