# ApiAdmin - 现代化 API 管理平台

> ⚠️ **开发中**: 当前项目正在积极开发中，功能和 API 可能会随时更改。

<div align="center">

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-%3E%3D4.4-green.svg)

一个现代化的、可本地部署的 API 管理平台，旨在为开发、产品、测试人员提供高效、易用、功能强大的接口管理服务。

[功能特性](#-核心功能) • [快速开始](#-快速开始) • [部署指南](#-部署方式) • [文档](#-文档) • [贡献](#-贡献指南)

[中文](README_zh.md) | [English](README.md)

</div>

---

## 📖 项目简介

ApiAdmin 是一个现代化的 API 管理平台，通过可视化的方式帮助团队轻松创建、发布、维护 API，提升团队协作效率。项目采用前后端分离架构，基于 React 18 + TypeScript + Koa + MongoDB 构建，支持本地部署，数据安全可控。

### 产品愿景

成为连接前端、后端、测试与管理的 **API 协作中心**，通过"设计即文档、文档即 Mock、变更即同步、测试即保障"的闭环，彻底提升研发团队的协作效率与接口质量。

### 核心价值

- **高效**：基于 Json5 和 Mockjs 快速定义接口，效率提升多倍
- **易用**：扁平化权限设计，简单直观的操作界面
- **强大**：完整的接口管理、Mock、测试、导入导出功能
- **安全**：可本地部署，数据安全可控

### 功能截图

![测试流水线](Images/test-pipline.png)

![Swagger 集成](Images/swagger.png)

![单元测试](Images/unittest.png)

## ✨ 核心功能

### 🔐 用户与权限管理
- 用户注册、登录、密码找回
- 扁平化权限设计（超级管理员、分组组长、项目组长、开发者、游客）
- JWT 认证机制
- 🚧 SSO 单点登录（SAML 2.0、OAuth 2.0、OIDC、LDAP、CAS）
- 🚧 第三方登录（GitHub、GitLab、Gmail、微信、手机号、邮箱验证码）
- 🚧 白名单管理

### 📁 分组与项目管理
- 分组管理（创建、编辑、删除、成员管理）
- 项目管理（创建、编辑、删除、迁移、复制）
- 项目设置（环境配置、全局变量、Token 配置）
- 项目成员管理
- 项目动态（操作日志）

### 🔌 接口管理
- 接口 CRUD 操作
- 接口分类管理
- 接口编辑（请求参数、返回数据、Headers）
- 接口运行/调试（类似 Postman）
- 接口预览（美观的文档展示）
- 支持 RESTful 动态路由
- 支持多种请求体格式（Form、JSON、File、Raw）
- 支持 JSON Schema 和 Mockjs 数据生成

### 🎭 Mock 服务
- 基础 Mock（基于 Mockjs 和 Json5）
- Mock 期望（根据请求条件返回不同数据）
- 自定义 Mock 脚本（JavaScript）
- Mock 严格模式（参数校验）
- Mock 优先级管理
- 支持参数替换和正则表达式

### 🧪 自动化测试
- 测试集合管理
- 测试用例编辑（请求参数、断言脚本）
- 变量参数支持（`$.{key}.{params|body}.{path}`）
- 测试执行和报告
- 服务端自动化测试（可集成 CI/CD）
- **测试流水线管理**：创建、编辑、执行和管理测试流水线
- **AI 智能测试分析**：自动分析测试结果、提供 bug 修复建议和测试用例改进建议
- **代码仓库集成**：将测试流水线与代码仓库关联，进行综合分析
- 🚧 CI/CD 深度集成（GitHub Actions、Jenkins、GitLab CI）
- 🚧 已导入接口自动化测试

### 📥 数据导入导出
- Postman 导入（Collection v1/v2）
- Swagger 导入（2.0 / OpenAPI 3.0）
- HAR 导入
- ApiAdmin JSON 导入
- 数据导出（JSON、Swagger、Markdown、HTML）
- 🚧 Swagger 自动同步（定时同步）

### 🔌 插件系统
- 插件架构设计
- 插件管理（安装、卸载、启用/禁用）
- 内置插件（代码生成、统计、Wiki 等）
- 🚧 插件 Hook 系统
- 🚧 插件路由系统
- 🚧 前端插件集成

### 💻 代码仓库管理
- 代码仓库配置（GitHub、GitLab、Gitee 等）
- SSH 私钥认证（支持密码保护）
- 仓库连接测试
- 代码拉取和同步
- 与测试流水线集成，支持 AI 分析

### 🤖 AI 配置与分析
- AI 服务提供商配置（OpenAI、DeepSeek 等）
- AI 智能测试结果分析
- 自动 bug 检测和修复建议
- 测试用例改进建议
- 代码质量分析

### 📊 系统功能
- 操作日志
- 登录日志
- 国际化支持（中文、英文）
- 搜索功能
- 用户中心
- OpenAPI 接口
- 版本信息查询
- Swagger 集成（UI + JSON）
- 监控和统计（Prometheus 指标）
- 邮件服务配置
- 白名单管理
- 🚧 项目关注
- 🚧 消息通知（站内消息、邮件通知）

## 🌟 亮点特性

### 1. 现代化技术栈
- **前端**：React 18 + TypeScript + Ant Design 5 + Vite
- **后端**：Node.js + Koa + MongoDB
- **开发体验**：热更新、TypeScript 类型检查、ESLint + Prettier

### 2. 强大的 Mock 能力
- 基于 Mockjs 和 Json5 的灵活数据生成
- 支持 Mock 期望，根据条件返回不同数据
- 支持自定义 JavaScript 脚本
- Mock 严格模式，参数校验

### 3. 完善的测试支持
- 可视化测试用例编辑
- 支持变量参数和表达式
- JavaScript 断言脚本
- 可集成到 CI/CD 流程
- 测试流水线管理，支持项目关联
- AI 智能测试分析和优化
- 代码仓库集成，实现全面测试

### 4. 灵活的导入导出
- 支持多种格式导入（Postman、Swagger、HAR）
- 支持多种格式导出（JSON、Swagger、Markdown、HTML）
- 智能合并和覆盖模式

### 5. 可扩展的插件系统
- 插件化架构，支持自定义扩展
- 内置多个实用插件
- 支持 Hook 和路由扩展

### 6. 企业级特性
- 完整的权限管理体系
- 操作日志和审计
- 监控和统计（Prometheus）
- 支持 Docker 和 Kubernetes 部署

### 7. 开发者友好
- 完整的单元测试框架（Vitest）
- **高测试覆盖率目标**（目标接近 100%）
- Swagger API 文档
- 详细的开发文档
- 版本信息查询

### 8. AI 增强工作流
- AI 智能测试分析和优化
- 自动 bug 检测和修复建议
- 测试用例改进建议
- 代码质量洞察

## 🛠 技术栈

### 前端
- **框架**：React 18 + TypeScript
- **UI 库**：Ant Design 5
- **状态管理**：Redux Toolkit
- **路由**：React Router v6
- **构建工具**：Vite
- **代码编辑器**：Monaco Editor
- **国际化**：i18next
- **实时协作**：Yjs + y-websocket

### 后端
- **框架**：Koa 2
- **数据库**：MongoDB + Mongoose
- **认证**：JWT (jsonwebtoken)
- **WebSocket**：Socket.io
- **文件上传**：koa-multer
- **安全**：helmet、bcrypt
- **日志**：Winston / Pino
- **监控**：Prometheus (prom-client)
- **API 文档**：Swagger (swagger-jsdoc)

### 开发工具
- **测试**：Vitest
- **代码规范**：ESLint + Prettier
- **类型检查**：TypeScript
- **版本控制**：Git

## 🚀 快速开始

> **15 分钟开源演示：** 见 **[Docs/QUICKSTART_OSS.md](Docs/QUICKSTART_OSS.md)**（导入 → Mock → Run → 流水线 → Monitor）。  
> 冲刺清单：[Docs/SPRINT_6DAY_CHECKLIST.md](Docs/SPRINT_6DAY_CHECKLIST.md) · Cloud Agents：[Docs/CLOUD_AGENT_PROMPTS.md](Docs/CLOUD_AGENT_PROMPTS.md)

### 环境要求

- **Node.js >= 18.0.0**（推荐 20.x LTS）
- **npm >= 9.0.0**
- **MongoDB >= 4.4**

> ⚠️ **重要**：如果您的 Node.js 版本低于 18，请先升级 Node.js。

### 安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/hanyouqing/ApiAdmin.git
cd ApiAdmin
```

#### 2. 安装依赖

```bash
# 方法 1: 使用 install:all 脚本（推荐）
npm run install:all

# 方法 2: 手动安装
npm install
cd Client && npm install
cd ../Server && npm install
```

#### 3. 配置环境变量

创建 `.env` 文件：

```env
# 应用配置
PORT=3000
NODE_ENV=development

# 数据库配置
# 如果 MongoDB 未启用认证，使用：
MONGODB_URL=mongodb://localhost:27017/apiadmin
# 如果 MongoDB 已启用认证，使用：
# MONGODB_URL=mongodb://username:password@localhost:27017/apiadmin?authSource=admin

# JWT 配置
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRES_IN=7d
```

#### 4. 初始化 MongoDB

**如果使用 Docker Compose：**

```bash
# 设置环境变量
export MONGO_USERNAME=admin
export MONGO_PASSWORD=your-password

# 启动 MongoDB（会自动初始化）
docker-compose up -d mongodb
```

**如果使用本地 MongoDB：**

```bash
# 运行初始化脚本
./scripts/init-mongodb.sh
```

详细说明请查看 [MongoDB 初始化指南](Docs/MONGODB_INIT.md)

#### 5. 启动开发服务器

```bash
# 从根目录启动（同时启动前后端）
npm run dev

# 或分别启动
npm run dev:client  # 前端：http://localhost:3001
npm run dev:server  # 后端：http://localhost:3000
```

访问 http://localhost:3001 即可使用。

#### 6. 构建生产版本

```bash
npm run build
```

## 🐳 部署方式

### Docker 部署（推荐）

#### 使用构建脚本

项目提供了便捷的 Docker 构建脚本：

```bash
# 查看帮助
./docker-build.sh --help

# 普通构建
./docker-build.sh

# 构建 release 版本
./docker-build.sh --release 1.0.0

# 清理后构建并运行测试
./docker-build.sh --clean --run
```

#### 使用 Docker Compose

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

#### 手动构建

```bash
# 构建镜像
docker build -t apiadmin .

# 运行容器
docker run -d -p 3000:3000 \
  -e MONGODB_URL=mongodb://host.docker.internal:27017/apiadmin \
  -e JWT_SECRET=your-secret-key \
  --name apiadmin \
  apiadmin
```

### Kubernetes 部署

项目提供了 Helm Chart，支持 Kubernetes 部署：

```bash
# 安装 Chart
helm install apiadmin ./Helm/apiadmin \
  --namespace apiadmin \
  --create-namespace \
  --set mongodb.auth.rootPassword=your-password \
  --set config.jwtSecret=your-jwt-secret
```

详细部署说明请查看 [部署文档](Docs/DEPLOYMENT.md)

## 📁 项目结构

```
ApiAdmin/
├── Client/              # 前端代码
│   ├── Components/      # 公共组件
│   ├── Containers/      # 页面容器
│   ├── Reducer/         # Redux 状态管理
│   ├── Utils/           # 工具函数
│   ├── Styles/          # 样式文件
│   └── i18n/            # 国际化
├── Server/              # 后端代码
│   ├── Controllers/     # 控制器
│   ├── Models/          # 数据模型
│   ├── Middleware/      # 中间件
│   ├── Utils/           # 工具函数
│   └── Router.js        # 路由配置
├── Plugins/             # 插件系统
│   ├── CodeGenerator/   # 代码生成插件
│   └── _template/        # 插件模板
├── Docs/                # 文档
├── Scripts/             # 脚本
├── tests/               # 单元测试
├── Helm/                # Kubernetes Helm Chart
└── Static/              # 静态资源
```

## 🧪 测试

项目致力于实现**接近 100% 的测试覆盖率**，以确保代码质量和可靠性。

```bash
# 运行测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage
```

![测试覆盖率](Images/npm-run-test-coverage.png)

```bash
# 运行测试 UI
npm run test:ui
```

![测试 UI](Images/npm-run-test-ui.png)

### 测试覆盖率目标

- **目标覆盖率**：所有关键路径接近 100%
- **当前重点**：
  - 所有 Controllers 的单元测试
  - 所有 Models 的单元测试
  - 所有 Utils 的单元测试
  - API 端点的集成测试
  - 前端组件测试

详细测试指南请查看 [测试文档](Docs/TESTING.md)

## 📝 开发指南

### 代码规范

项目使用 ESLint + Prettier 进行代码规范检查：

```bash
# 检查代码规范
npm run lint

# 自动修复代码格式
npm run format
```

### 提交规范

提交代码时请遵循以下规范：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

### 开发流程

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 🤝 贡献指南

我们欢迎所有形式的贡献，包括但不限于：

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码

请查看 [贡献指南](CONTRIBUTING.md) 了解详细信息。

## 📄 许可证

本项目采用 [Apache License 2.0](LICENSE) 许可证。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

## 📞 联系方式

- 项目 Issues: [GitHub Issues](https://github.com/hanyouqing/ApiAdmin/issues)
- 文档: [项目文档](Docs/)

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐ Star！**
</div>

