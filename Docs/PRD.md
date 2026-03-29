# ApiAdmin - 产品需求文档 (PRD)

**文档版本**: 1.2  
**状态**: 草案  
**最后更新**: 2025-01-27  
**目标**: 构建下一代一体化API协作、管理与测试平台

## 1. 产品概述

### 1.1 产品愿景
成为连接前端、后端、测试与管理的 **API协作中心**，通过"设计即文档、文档即Mock、变更即同步、测试即保障"的闭环，彻底提升研发团队的协作效率与接口质量。

### 1.2 产品定位
ApiAdmin 是一个现代化的、可本地部署的 API 管理平台，旨在为开发、产品、测试人员提供高效、易用、功能强大的接口管理服务。通过可视化的方式帮助团队轻松创建、发布、维护 API，提升团队协作效率。

### 1.3 核心痛点与机会
- **维护缺失**: 替代已停止维护的旧平台，解决安全与兼容性风险。
- **协作割裂**: 整合设计、文档、测试、Mock等分散的工具链。
- **体验现代化**: 引入实时协作、智能提示与更优的交互设计。
- **生态集成**: 更好地适配现代微服务、云原生与CI/CD流程。

### 1.4 目标用户画像
| 角色 | 核心需求 | 关键收益 |
| :--- | :--- | :--- |
| **后端开发** | 快速定义、迭代和调试API | 减少沟通成本，自动化生成代码与文档 |
| **前端开发** | 不阻塞于后端进度进行开发 | 获得可靠、可配置的Mock数据服务 |
| **测试工程师** | 高效创建和执行自动化测试 | 可视化编排复杂场景，深度集成CI |
| **技术负责人** | 掌控项目进度与接口质量 | 全景视图、质量报表与性能洞察 |

### 1.5 目标用户（详细）
- **前端开发工程师**：需要查看接口文档、使用 Mock 数据进行开发
- **后端开发工程师**：需要编写和维护接口文档
- **测试工程师**：需要进行接口测试和自动化测试
- **产品经理**：需要查看接口文档，了解接口功能
- **项目经理**：需要管理项目和团队协作

### 1.6 核心价值
- **高效**：基于 Json5 和 Mockjs 快速定义接口，效率提升多倍
- **易用**：扁平化权限设计，简单直观的操作界面
- **强大**：完整的接口管理、Mock、测试、导入导出功能
- **安全**：可本地部署，数据安全可控

## 2. 功能架构

### 2.1 功能模块总览

```
ApiAdmin
├── 用户与权限管理
├── 分组管理
├── 项目管理
├── 接口管理
├── Mock 服务
├── 自动化测试
├── 数据导入导出
├── 插件系统
└── 系统功能
```

### 2.2 代码组织架构

**核心原则**：公共代码和可复用逻辑统一抽象到 Utils 目录，简化代码、降低代码量、提高可维护性。

**目录结构**：
```
ApiAdmin/
├── Server/
│   ├── Utils/              # 后端工具函数（公共代码）
│   │   ├── config.js       # 配置管理
│   │   ├── logger.js       # 日志工具
│   │   ├── validation.js   # 数据验证
│   │   ├── response.js     # 统一响应格式
│   │   ├── pagination.js   # 分页工具
│   │   └── ...             # 其他工具函数
│   ├── Controllers/        # 控制器（使用 Utils 工具）
│   ├── Models/             # 数据模型
│   └── Middleware/         # 中间件（可复用逻辑）
├── Client/
│   ├── Utils/              # 前端工具函数（公共代码）
│   │   ├── api.ts          # API 请求封装
│   │   ├── hooks/          # 自定义 Hooks（可复用逻辑）
│   │   └── components/     # 通用组件
│   ├── Components/         # 业务组件（使用 Utils 工具）
│   └── Containers/         # 页面容器
└── Core/                   # 前后端共享代码
    └── Utils.js            # 共享工具函数
```

**代码复用策略**：
- **控制器层**：所有控制器继承 BaseController，统一错误处理、响应格式、参数验证
- **中间件层**：认证、权限、错误处理、日志记录等可复用中间件
- **数据访问层**：所有模型继承 BaseModel，统一 CRUD 操作和查询构建
- **业务逻辑层**：复杂业务逻辑抽象为 Service，便于复用和测试
- **前端组件层**：提取通用 UI 组件和自定义 Hooks，减少重复代码

## 3. 详细功能需求

### 3.0 智能API设计中心（增强功能）

#### 3.0.1 接口定义增强
- 支持 **OpenAPI 3.0+** 和 **GraphQL** 标准。
- 提供可视化与代码（JSON/YAML）双模式编辑器。
- **AI辅助**: 根据自然语言描述（如"创建返回用户列表的GET接口"）生成接口雏形。
- 支持 **JSON Schema** 拖拽构建与高级校验规则设置。

#### 3.0.2 实时协作与版本管理
- 支持多用户实时在线编辑（光标可见、变更实时同步）。
- 完整的接口修改历史记录，支持版本对比与一键回滚。
- 基于Git的版本管理思想，支持分支、合并请求（可选高级功能）。

#### 3.0.3 代码共生
- **导入**: 支持从代码注解（Swagger/JSDoc）自动同步。
- **导出**: 一键生成主流框架（Spring Boot, Express, Django等）的控制器/路由层骨架代码。

### 3.1 用户与权限管理

#### 3.1.1 用户注册与登录
**功能描述**：支持用户注册、登录、密码找回等功能

**详细需求**：
- 用户注册：邮箱注册，支持邮箱验证
- 用户登录：邮箱/用户名 + 密码登录
- 密码找回：通过邮箱重置密码
- 记住登录状态：支持 Cookie 记住登录
- **SSO 单点登录**：支持多种企业级 SSO 协议
  - **SAML 2.0**: 企业级 B2B SSO，支持加密和签名
  - **OAuth 2.0**: 第三方应用授权（GitHub、GitLab 等）
  - **OpenID Connect (OIDC)**: 现代 Web 应用身份认证（Google、Microsoft 等）
  - **LDAP/Active Directory**: 企业内部目录服务集成
  - **CAS**: 中央认证服务（学术机构常用）
- SSO 配置管理：管理员可配置多个 SSO 提供者
- SSO 角色映射：支持将 SSO 用户角色映射到系统角色
- SSO 用户自动创建：首次 SSO 登录自动创建用户账户
- **第三方登录**：
  - **GitHub.com 登录**：通过 GitHub OAuth2.0 实现 GitHub 账号登录
  - **GitLab.com 登录**：通过 GitLab OAuth2.0 实现 GitLab 账号登录
  - **Gmail 登录**：通过 Google OAuth2.0 实现 Gmail 账号登录
  - **微信登录**：通过微信开放平台 OAuth2.0 实现微信账号登录
  - **手机号登录**：通过短信验证码实现手机号登录
  - **邮箱验证码登录**：通过邮件验证码实现邮箱登录
- **白名单管理**：
  - 支持启用/禁用白名单功能
  - 支持 GitHub 用户名、GitLab 用户名、微信ID、手机号、邮箱白名单管理
  - 仅允许白名单内的用户通过第三方登录
  - 管理员可添加、删除、查询白名单条目
  - 支持按平台类型筛选白名单
- **邮件服务**：
  - 支持 SMTP 协议（Gmail、Outlook、自定义服务器）
  - 支持第三方邮件服务（SendGrid、AWS SES、阿里云邮件推送）
  - 支持邮件模板（验证码、欢迎邮件、密码重置等）
  - 支持批量发送和邮件队列
- **监控系统**：
  - 提供 `/metrics` 和 `/prometheus` 端点（Prometheus 格式）
  - 收集 HTTP 请求指标（请求数、响应时间、错误率）
  - 收集系统指标（CPU、内存、磁盘）
  - 收集业务指标（用户数、项目数、接口数、Mock 请求数）
  - 提供健康检查端点 `/health`
  - 提供系统统计端点 `/stats`

**权限角色**：
- **超级管理员**：系统最高权限，可管理所有分组和项目
- **分组组长**：可管理分组及分组下的项目
- **项目组长**：可管理单个项目的所有内容
- **项目开发者**：可编辑项目内的接口
- **游客**：只能浏览公开项目

#### 3.1.2 权限管理
**功能描述**：扁平化权限设计，支持灵活的权限分配

**详细需求**：
- 分组权限管理
  - 浏览分组
  - 在分组中新建项目
  - 编辑分组信息
  - 管理分组成员
  - 删除分组
- 项目权限管理
  - 浏览公开/私有项目
  - 编辑项目信息
  - 新建/编辑/删除接口
  - 编辑项目头像
  - 删除项目

### 3.2 分组管理

#### 3.2.1 分组 CRUD
**功能描述**：创建、查看、编辑、删除分组

**详细需求**：
- 创建分组：只有超级管理员可创建
- 查看分组：显示分组下的项目和成员
- 编辑分组：修改分组名称、描述等信息
- 删除分组：删除分组及其下所有项目（需确认）
- 分组列表：支持搜索、筛选

#### 3.2.2 分组成员管理
**功能描述**：管理分组内的成员和组长

**详细需求**：
- 添加成员：通过用户名/邮箱添加成员
- 移除成员：从分组中移除成员
- 设置组长：指定分组组长
- 成员列表：显示成员信息、角色、加入时间

### 3.3 项目管理

#### 3.3.1 项目 CRUD
**功能描述**：创建、查看、编辑、删除项目

**详细需求**：
- 创建项目
  - 项目名称（唯一性校验）
  - 项目描述
  - 所属分组
  - 项目类型（公开/私有）
  - 基本路径（接口统一前缀）
  - 项目图标和背景色
- 查看项目：项目首页展示接口列表
- 编辑项目：修改项目所有信息
- 删除项目：删除项目及所有接口（需二次确认）
- 项目迁移：将项目迁移到其他分组
- 项目拷贝：复制项目及所有接口到新项目

#### 3.3.2 项目设置
**功能描述**：项目详细配置管理

**详细需求**：
- **基本设置**
  - Tag 信息：自定义 tag 名称和描述
  - Mock 严格模式：开启后对请求参数进行校验
  - 开启 Json5：允许接口中使用 Json5 语法
- **环境配置**
  - 添加/编辑/删除环境（开发、测试、生产等）
  - 环境变量：定义全局变量，支持在接口中使用 `{{ global.var }}`
  - 全局 Header：为项目设置全局请求头
- **请求配置**
  - Pre-script：请求前执行的 JS 脚本
  - Post-script：请求后执行的 JS 脚本
  - 支持 context 对象访问请求/响应数据
  - 支持工具函数（md5、sha1、base64、axios 等）
  - 支持异步处理（Promise）
  - 支持 storage 持久化存储
- **Token 配置**
  - 项目唯一标识 token
  - 用于 OpenAPI 调用
  - Token 刷新功能
- **全局 Mock**
  - 项目级别的 Mock 脚本
  - 优先级：Mock 期望 > 自定义 Mock 脚本 > 全局 Mock > 普通 Mock

#### 3.3.3 项目成员管理
**功能描述**：管理项目成员和权限

**详细需求**：
- 添加成员：通过用户名/邮箱添加
- 移除成员：从项目中移除
- 设置项目组长：指定项目负责人
- 成员列表：显示成员、角色、权限

#### 3.3.4 项目动态
**功能描述**：记录项目操作日志

**详细需求**：
- 显示项目操作历史
- 记录接口创建、修改、删除等操作
- 显示操作人、操作时间、操作内容
- 支持筛选和搜索

### 3.4 接口管理

#### 3.4.1 接口分类（接口集合）
**功能描述**：对接口进行分类管理

**详细需求**：
- 创建分类：为接口创建分类（集合）
- 编辑分类：修改分类名称和描述
- 删除分类：删除分类及分类下接口（需确认）
- 分类排序：支持拖拽排序
- 接口唯一性：同一分类下接口名称不能重复

#### 3.4.2 接口 CRUD
**功能描述**：创建、查看、编辑、删除接口

**详细需求**：
- 创建接口
  - 接口名称
  - 接口路径（支持 RESTful 动态路由，如 `/api/{id}/{name}`）
  - HTTP 方法（GET、POST、PUT、DELETE、PATCH 等）
  - 所属分类
  - 接口描述
- 查看接口：接口预览页面
- 编辑接口：修改接口所有信息
- 删除接口：删除接口（需确认）
- 接口搜索：支持按名称、路径、Tag 搜索
- 接口筛选：按状态、Tag、分类筛选

#### 3.4.3 接口编辑
**功能描述**：详细的接口信息编辑

**详细需求**：
- **基本设置**
  - 接口路径：支持 RESTful 动态参数
  - HTTP 方法选择
  - 选择分类
  - 接口状态（开发中、已开发、已测试、已上线等）
  - Tag 标签：支持多个 Tag，用于分类和筛选
- **请求参数设置**
  - Query 参数
    - 参数名、类型、是否必填、默认值、描述
    - 支持拖拽排序
    - 支持 Mock 数据
  - 请求 Body
    - Form 格式：表单数据
    - Json 格式：JSON Schema 或 JSON 文本
    - File 格式：文件上传
    - Raw 格式：原始文本
  - Headers
    - 自定义请求头
    - 根据 Body 类型自动生成 Content-Type
  - Path 参数：RESTful 路径参数
- **返回数据设置**
  - Json 格式
    - 基于 Mockjs 和 Json5 的 Mock 数据定义
    - 支持注释说明
    - 支持全局编辑（F9）
  - Json Schema 格式
    - 可视化 JSON Schema 编辑器
    - 支持 Mockjs 占位符（@xxx）
    - 支持 format 类型（email、ip 等）
  - Raw 格式：原始文本返回
- **备注和其他**
  - 接口描述：Markdown 格式支持
  - 邮件通知：接口变更时通知项目成员
  - 开放接口：标记为公开接口，导出时可选择

#### 3.4.4 接口运行/调试
**功能描述**：类似 Postman 的接口测试功能

**详细需求**：
- 接口测试界面
  - 选择环境（开发、测试、生产）
  - 编辑请求参数（Query、Body、Headers）
  - 发送请求
  - 查看响应（状态码、Headers、Body）
  - 响应时间显示
- 保存到测试集合：将当前请求保存为测试用例
- 返回数据验证：基于 Json Schema 验证返回数据格式
- 请求历史：保存最近请求记录
- 代码生成：生成各种语言的请求代码（cURL、JavaScript、Python 等）

#### 3.4.5 接口预览
**功能描述**：美观的接口文档展示

**详细需求**：
- 接口信息展示
  - 接口名称、路径、方法
  - 请求参数表格
  - 返回数据示例
  - 接口描述
- 支持 Markdown 渲染
- 支持代码高亮
- 支持复制功能

### 3.5 Mock 服务

#### 3.5.1 基础 Mock
**功能描述**：基于 Mockjs 和 Json5 生成随机数据

**详细需求**：
- Mock 地址规则：`{平台地址}/mock/{项目ID}/{接口路径}`
- 支持 Mockjs 占位符（@id、@name、@email 等）
- 支持正则表达式：`"name|regexp": "[a-z0-9_]+?"`
- 支持参数替换：`"name": "${query.name}"`、`"type": "${body.type}"`
- 支持 Json5 语法
- Mock 数据预览

#### 3.5.2 Json Schema Mock
**功能描述**：基于 JSON Schema 生成 Mock 数据

**详细需求**：
- 可视化 JSON Schema 编辑器
- 根据 Schema 自动生成随机数据
- 支持 format 类型（email、ip、uri、date-time 等）
- 支持 Mockjs 占位符集成
- Schema 验证功能

#### 3.5.3 高级 Mock - Mock 期望
**功能描述**：根据请求条件返回不同的 Mock 数据

**详细需求**：
- 创建 Mock 期望
  - 期望名称
  - IP 过滤：根据请求 IP 返回不同数据
  - 参数过滤：根据 Query/Body 参数返回不同数据
  - 响应设置
    - HTTP 状态码
    - 延时设置
    - HTTP 头
    - 返回 JSON 数据
- 期望列表管理
- 期望优先级：按创建顺序匹配

#### 3.5.4 高级 Mock - 自定义脚本
**功能描述**：通过 JavaScript 脚本自定义 Mock 逻辑

**详细需求**：
- 全局变量
  - `header`：请求 HTTP 头
  - `params`：请求参数（Query + Body）
  - `cookie`：请求 Cookies
  - `mockJson`：接口定义的 Mock 模板
  - `resHeader`：响应 HTTP 头
  - `httpCode`：响应状态码
  - `delay`：响应延时
  - `Random`：Mock.Random 方法
- 脚本编辑：支持语法高亮
- 脚本执行：根据请求参数动态修改返回数据

#### 3.5.5 Mock 严格模式
**功能描述**：对 Mock 请求进行参数校验

**详细需求**：
- 开启/关闭严格模式
- Query 参数必填校验
- Form 参数必填校验
- Json Schema 格式校验
- 校验失败返回错误信息

#### 3.5.6 Mock 优先级
**规则说明**：
1. Mock 期望（匹配条件）
2. 自定义 Mock 脚本
3. 项目全局 Mock 脚本
4. 普通 Mock（接口定义的 Mock 数据）

### 3.6 自动化测试

#### 3.6.1 测试集合管理
**功能描述**：管理测试用例集合

**详细需求**：
- 创建测试集合
- 编辑测试集合信息
- 删除测试集合
- 导入接口到测试集合（同一接口可多次导入）
- 测试用例排序：支持拖拽调整执行顺序

#### 3.6.2 测试用例编辑
**功能描述**：编辑测试用例的请求参数和断言

**详细需求**：
- **请求参数编辑**
  - Query 参数：支持常量、Mock 数据、变量参数
  - Body 参数：支持常量、Mock 数据、变量参数
  - Headers：支持常量、变量参数
  - Path 参数：支持变量参数
- **变量参数**
  - 格式：`$.{key}.{params|body}.{path}`
  - 示例：`$.269.body.data.id`（使用 key 为 269 的用例返回值的 data.id）
  - 支持表达式生成器（可视化选择）
- **Mock 参数**
  - 使用 Mockjs 占位符生成随机数据
  - 每次请求生成新数据
- **断言脚本**
  - 使用 JavaScript 编写断言
  - 全局变量：
    - `assert`：断言函数（assert、assert.equal、assert.deepEqual 等）
    - `status`：HTTP 状态码
    - `params`：请求参数
    - `body`：响应 Body
    - `header`：响应 Header
    - `records`：所有用例的请求记录
    - `log`：日志函数
  - 支持复杂断言逻辑

#### 3.6.3 运行自动化测试
**功能描述**：执行测试用例并查看结果

**详细需求**：
- 开始测试：按顺序执行所有用例
- 测试进度：显示当前执行进度
- 测试报告
  - 每个用例的执行结果（成功/失败）
  - 请求信息（URL、方法、参数、Headers）
  - 响应信息（状态码、Headers、Body）
  - 断言结果
  - 执行时间
- 测试历史：保存历史测试记录
- 导出报告：导出测试报告

#### 3.6.4 服务端自动化测试
**功能描述**：在服务端执行测试，可集成到 CI/CD

**详细需求**：
- 生成测试 URL
- 访问 URL 即可执行测试
- 返回 JSON 格式测试结果
- 支持 Jenkins 等 CI/CD 工具集成

#### 3.6.5 CI/CD 深度集成
**功能描述**：提供完整的 CI/CD 集成方案，支持自动化测试和持续集成

**详细需求**：
- **CLI 命令行工具**:
  - 通过 npm 全局安装 `@apiadmin/cli`
  - 支持执行测试集合：`apiadmin test --collection <id>`
  - 支持 Swagger 同步：`apiadmin sync --url <url> --project <id>`
  - 支持数据导入导出：`apiadmin import/export`
  - 支持生成多种格式报告（JSON、JUnit、Allure）
  - 支持配置文件管理多个项目和环境
  - 支持环境变量配置（APIADMIN_URL、APIADMIN_TOKEN）
- **GitHub Actions 集成**:
  - 提供开箱即用的 GitHub Actions 工作流模板
  - 支持代码推送或 PR 时自动运行 API 测试
  - 自动上传测试报告到 GitHub Actions Artifacts
  - 测试结果作为 PR 状态检查，阻止未通过测试的代码合并
  - 支持定时执行测试（如每日回归测试）
  - 支持多环境测试（开发、测试、生产）
- **Jenkins 插件**:
  - 提供 Jenkins 插件，集成到 Jenkins 流水线
  - 在 Jenkins Pipeline 中添加 API 测试步骤
  - 测试结果集成到 Jenkins 测试报告
  - 测试失败时发送通知（邮件、Slack 等）
  - 支持并行测试执行
  - 支持测试结果趋势分析
- **GitLab CI 集成**:
  - 提供 `.gitlab-ci.yml` 配置模板
  - 在 GitLab CI 中运行 API 测试
  - 测试结果集成到 GitLab Merge Request
  - 支持保存测试报告为 GitLab Artifacts
  - 支持测试结果可视化展示
  - 支持测试覆盖率统计

#### 3.6.6 已导入接口自动化测试
**功能描述**：为从其他平台导入的接口自动创建测试用例并执行自动化测试

**详细需求**：
- **自动测试用例生成**
  - 导入接口时自动分析接口定义（路径、方法、参数、响应结构）
  - 根据接口类型自动生成基础测试用例
    - GET 接口：自动生成参数验证、响应格式验证用例
    - POST/PUT 接口：自动生成请求体验证、创建/更新成功用例
    - DELETE 接口：自动生成删除成功、资源不存在用例
  - 支持基于 JSON Schema 自动生成断言规则
  - 支持基于 Mock 数据生成测试数据
  - 支持批量生成：导入多个接口时批量创建测试用例
- **智能测试数据生成**
  - 根据接口参数类型自动生成测试数据
    - 必填参数：使用 Mockjs 生成符合类型的数据
    - 可选参数：生成边界值测试数据（空值、最大值、最小值）
    - 枚举类型：遍历所有枚举值生成测试用例
  - 支持从接口示例数据中提取测试数据
  - 支持从历史请求记录中学习测试数据模式
- **自动断言规则生成**
  - 基于响应 Schema 自动生成基础断言
    - 状态码断言：根据接口定义自动设置期望状态码
    - 响应结构断言：验证响应字段存在性和类型
    - 必填字段断言：验证必填字段是否存在
  - 支持自定义断言模板
    - 成功响应模板：验证成功响应的通用结构
    - 错误响应模板：验证错误响应的通用结构
  - 支持智能断言建议：根据接口描述和示例数据推荐断言规则
- **导入后自动测试执行**
  - 导入完成后自动执行基础测试用例
  - 支持配置导入后是否自动执行测试
  - 测试结果自动关联到导入的接口
  - 测试失败时自动标记接口状态（如标记为"需要修复"）
- **测试用例分组管理**
  - 自动为导入的接口创建测试集合
  - 支持按导入来源分组（Swagger、Postman、HAR 等）
  - 支持按项目分组
  - 支持测试集合的批量执行和管理
- **测试结果分析**
  - 导入接口的测试通过率统计
  - 识别导入接口中的潜在问题
    - 接口不可访问（404、500 等）
    - 响应格式不符合定义
    - 必填参数缺失
    - 数据类型不匹配
  - 生成导入质量报告
    - 导入接口总数
    - 测试通过数量
    - 测试失败数量
    - 问题接口列表
    - 建议修复项
- **持续集成支持**
  - 导入接口的测试用例可集成到 CI/CD 流程
  - 支持定时执行导入接口的回归测试
  - 支持接口变更后自动重新测试
  - 测试结果可导出为 CI/CD 工具兼容格式（JUnit、Allure 等）
- **测试用例自定义**
  - 自动生成的测试用例可手动编辑和优化
  - 支持添加自定义断言规则
  - 支持添加前置/后置脚本
  - 支持参数化测试（使用变量和表达式）
- **导入同步测试**
  - Swagger 自动同步时，自动更新对应的测试用例
  - 接口定义变更时，自动检测测试用例是否需要更新
  - 支持测试用例的版本管理和变更历史

**使用场景**：
- **批量导入验证**：从 Swagger/Postman 导入大量接口后，快速验证接口可用性
- **接口质量检查**：导入后自动测试，发现接口定义与实际实现的不一致
- **回归测试**：定期执行导入接口的自动化测试，确保接口稳定性
- **CI/CD 集成**：将导入接口的测试集成到持续集成流程，自动验证接口质量

**配置选项**：
- 启用/禁用自动测试用例生成
- 配置自动测试执行策略（导入后立即执行/手动执行）
- 配置测试数据生成策略（使用 Mock 数据/使用示例数据/使用历史数据）
- 配置断言规则模板
- 配置测试超时时间
- 配置测试重试次数

#### 3.6.7 通用规则配置
**功能描述**：配置通用的测试规则

**详细需求**：
- 定义通用断言规则
- 定义通用请求配置
- 应用到所有测试用例

### 3.7 数据导入导出

#### 3.7.1 数据导入
**功能描述**：从其他平台导入接口数据

**支持格式**：
- **Postman**
  - 支持 Collection v1/v2 格式
  - 导入接口、环境、测试用例
- **Swagger**
  - 支持 Swagger 2.0 / OpenAPI 3.0
  - 支持 URL 导入和文件导入
  - 自动同步功能（定时同步）
- **HAR**
  - 从 Chrome DevTools 导出 HAR 文件
  - 自动解析请求和响应
  - 只支持 JSON 格式响应
- **ApiAdmin JSON**
  - 导入 ApiAdmin 导出的 JSON 数据
  - 支持项目完整数据导入

**导入模式**：
- 普通模式（normal）：不导入已存在的接口
- 智能合并（good）：合并返回数据，保留已有修改
- 完全覆盖（mergin）：完全使用新数据

**导入后自动化测试**：
- 导入完成后可选择自动创建测试用例（详见 3.6.6 已导入接口自动化测试）
- 自动生成基础测试用例（参数验证、响应验证等）
- 支持导入后立即执行测试验证接口可用性
- 测试结果自动关联到导入的接口
- 生成导入质量报告，识别潜在问题

#### 3.7.2 数据导出
**功能描述**：导出接口数据到其他格式

**支持格式**：
- **JSON**：ApiAdmin 原生格式
- **Swagger 2.0**：OpenAPI 2.0 格式
- **Markdown**：Markdown 文档格式
- **HTML**：HTML 文档格式
- **Word**：Word 文档格式（通过插件）

**导出选项**：
- 选择导出接口范围
- 选择是否只导出公开接口
- 自定义导出模板

#### 3.7.3 命令行导入
**功能描述**：通过命令行工具导入数据

**详细需求**：
- 支持 apiadmin-cli 工具
- 配置文件方式导入
- 支持自动化集成

### 3.8 插件系统

#### 3.8.1 插件架构设计
**功能描述**：可扩展的插件系统架构，支持第三方平台对接和社区贡献

**目录结构**：
```
Plugins/
├── {PluginName}/              # 插件目录（每个插件一个独立目录）
│   ├── manifest.json          # 插件清单文件（必需）
│   ├── index.js               # 插件入口文件（必需）
│   ├── package.json           # 插件依赖配置（可选）
│   ├── README.md              # 插件说明文档
│   ├── Server/                # 服务端代码（可选）
│   │   ├── Controller.js      # 控制器
│   │   ├── Service.js         # 业务逻辑
│   │   └── Routes.js          # 路由定义
│   ├── Client/                # 前端代码（可选）
│   │   ├── Components/        # React 组件
│   │   ├── Pages/             # 页面组件
│   │   └── index.tsx          # 前端入口
│   ├── Hooks/                 # Hook 处理器（可选）
│   │   ├── beforeRequest.js   # 请求前 Hook
│   │   ├── afterResponse.js   # 响应后 Hook
│   │   └── ...
│   └── Config/                # 配置文件（可选）
│       └── default.json
```

**插件清单（manifest.json）**：
```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "displayName": "插件显示名称",
  "description": "插件功能描述",
  "author": "插件作者",
  "license": "MIT",
  "icon": "icon-url",
  "category": "export|import|mock|test|integration|buildin|other",
  "entry": {
    "server": "./Server/index.js",
    "client": "./Client/index.tsx"
  },
  "hooks": [
    "beforeRequest",
    "afterResponse",
    "onInterfaceCreate",
    "onInterfaceUpdate"
  ],
  "routes": [
    {
      "path": "/api/plugin/action",
      "method": "POST",
      "handler": "./Server/Controller.js#action"
    }
  ],
  "permissions": [
    "read:interface",
    "write:interface"
  ],
  "dependencies": {
    "axios": "^1.0.0"
  },
  "configSchema": {
    "type": "object",
    "properties": {
      "apiKey": {
        "type": "string",
        "description": "API Key"
      }
    }
  }
}
```

#### 3.8.2 插件管理
**功能描述**：管理平台插件

**详细需求**：
- 插件列表：显示已安装插件（名称、版本、状态、作者）
- 插件安装：
  - 本地安装：从 Plugins 目录加载
  - 远程安装：从 npm 或 Git 仓库安装
  - 文件上传：上传插件压缩包安装
- 插件卸载：卸载插件（需确认）
- 插件启用/禁用：控制插件状态（不影响已安装）
- 插件配置：配置插件参数（根据 configSchema）
- 插件更新：检查并更新插件版本
- 插件依赖管理：自动安装/卸载依赖

#### 3.8.3 插件 Hook 系统
**功能描述**：插件生命周期和事件 Hook

**Hook 类型**：
- **请求相关**
  - `beforeRequest`：请求发送前（可修改请求参数）
  - `afterResponse`：响应返回后（可处理响应数据）
  - `onRequestError`：请求错误时
- **接口相关**
  - `onInterfaceCreate`：接口创建时
  - `onInterfaceUpdate`：接口更新时
  - `onInterfaceDelete`：接口删除时
  - `onInterfaceRun`：接口运行时
- **项目相关**
  - `onProjectCreate`：项目创建时
  - `onProjectUpdate`：项目更新时
  - `onProjectDelete`：项目删除时
- **Mock 相关**
  - `beforeMock`：Mock 数据生成前
  - `afterMock`：Mock 数据生成后
- **测试相关**
  - `beforeTest`：测试执行前
  - `afterTest`：测试执行后
  - `onTestError`：测试错误时

**Hook 调用示例**：
```javascript
// Plugins/MyPlugin/Hooks/beforeRequest.js
export default async function beforeRequest(context) {
  const { request, project, interface } = context;
  
  // 修改请求头
  request.headers['X-Custom-Header'] = 'value';
  
  // 修改请求参数
  request.body.customParam = 'customValue';
  
  return request;
}
```

#### 3.8.4 插件 API
**功能描述**：插件可使用的核心 API

**API 列表**：
- **数据库操作**
  - `db.models.User`：用户模型
  - `db.models.Project`：项目模型
  - `db.models.Interface`：接口模型
  - `db.query()`：执行数据库查询
- **HTTP 请求**
  - `http.request()`：发送 HTTP 请求
  - `http.get()`、`http.post()` 等快捷方法
- **工具函数**
  - `utils.logger`：日志工具
  - `utils.validator`：数据验证
  - `utils.crypto`：加密工具
  - `utils.format`：格式化工具
- **配置管理**
  - `config.get()`：获取配置
  - `config.set()`：设置配置
- **存储管理**
  - `storage.get()`：获取存储数据
  - `storage.set()`：设置存储数据

#### 3.8.5 插件路由系统
**功能描述**：插件可注册自定义路由

**路由注册**：
- 插件在 manifest.json 中声明路由
- 路由自动注册到 `/api/plugin/{pluginName}/...`
- 支持中间件（认证、权限等）
- 支持参数验证

**路由示例**：
```javascript
// Plugins/MyPlugin/Server/Routes.js
export default {
  '/action': {
    method: 'POST',
    handler: async (ctx) => {
      // 处理逻辑
      ctx.body = { success: true };
    },
    middleware: ['auth', 'permission'],
    validation: {
      body: {
        type: 'object',
        required: ['param'],
        properties: {
          param: { type: 'string' }
        }
      }
    }
  }
};
```

#### 3.8.6 前端插件集成
**功能描述**：插件前端组件集成到主应用

**集成方式**：
- 插件注册前端路由
- 插件注册菜单项
- 插件注册工具栏按钮
- 插件注册接口详情页 Tab
- 插件注册设置页面

**前端 API**：
- `plugin.registerRoute()`：注册路由
- `plugin.registerMenu()`：注册菜单
- `plugin.registerButton()`：注册按钮
- `plugin.registerTab()`：注册 Tab
- `plugin.showNotification()`：显示通知
- `plugin.openModal()`：打开弹窗

#### 3.8.7 第三方平台对接
**功能描述**：支持对接第三方平台（如 Jira、Confluence、GitHub 等）

**对接方式**：
- **Webhook 集成**：接收第三方平台 Webhook
- **API 集成**：调用第三方平台 API
- **OAuth 集成**：OAuth 认证对接
- **数据同步**：双向数据同步

**对接示例**：
- **Jira 集成插件**：接口变更自动创建 Jira Issue
- **GitHub 集成插件**：接口文档自动同步到 GitHub
- **Slack 集成插件**：接口变更通知到 Slack
- **钉钉/企业微信集成**：接口变更通知到工作群

#### 3.8.8 社区贡献指南
**功能描述**：指导社区开发者贡献插件

**贡献流程**：
1. Fork 项目仓库
2. 在 Plugins 目录下创建插件目录
3. 实现插件功能（遵循插件规范）
4. 编写插件文档（README.md）
5. 提交 Pull Request
6. 代码审查和合并

**插件规范**：
- 遵循插件目录结构
- 提供完整的 manifest.json
- 编写清晰的 README.md
- 包含使用示例
- 提供测试用例（可选）
- 遵循代码规范（ESLint）
- 添加适当的错误处理
- 不包含敏感信息

**插件发布**：
- 插件可发布到 npm（命名：`@apiadmin/plugin-{name}`）
- 插件可发布到 GitHub
- 插件可提交到官方插件市场

#### 3.8.9 内置插件
**功能描述**：平台内置的常用插件

**插件列表**：
- **高级 Mock**：Mock 期望和自定义脚本
- **数据导出**：导出为各种格式（JSON、Swagger、Markdown、HTML）
- **Swagger 自动同步**：定时同步 Swagger 数据
- **统计**：接口调用统计和分析
- **代码生成**：生成各种语言的请求代码（cURL、JavaScript、Python、Java、Go 等）
- **Wiki**：项目文档管理
- **导入 HAR**：HAR 文件导入
- **导入 Postman**：Postman 数据导入
- **导入 Swagger**：Swagger 数据导入
- **导入 ApiAdmin JSON**：ApiAdmin 数据导入

#### 3.8.10 插件开发模板
**功能描述**：提供插件开发模板，快速创建新插件

**模板内容**：
- 基础目录结构
- manifest.json 模板
- 入口文件模板
- Hook 处理器模板
- 路由定义模板
- 前端组件模板
- 配置文件模板
- README.md 模板

**使用方式**：
```bash
# 使用 CLI 工具创建插件
npx @apiadmin/cli create-plugin MyPlugin

# 或手动复制模板
cp -r Plugins/_template Plugins/MyPlugin
```

### 3.9 系统功能

#### 3.9.1 项目关注
**功能描述**：关注感兴趣的项目

**详细需求**：
- 关注项目：点击星标关注
- 我的关注：查看所有关注的项目
- 取消关注：移除关注
- 关注通知：项目更新时通知

#### 3.9.2 消息通知
**功能描述**：系统消息和邮件通知

**详细需求**：
- 系统消息：站内消息通知
- 邮件通知：接口变更邮件通知
- 通知设置：用户可配置通知偏好

#### 3.9.3 操作日志
**功能描述**：记录系统操作日志

**详细需求**：
- 项目操作日志
- 接口操作日志
- 用户操作日志
- 日志查询和筛选

#### 3.9.4 国际化
**功能描述**：多语言支持

**详细需求**：
- **默认语言**：系统默认使用英语（en-US）
- **支持语言**：支持英语（en-US）和中文（zh-CN）
- **语言切换**：用户可通过 Header 中的语言选择器切换语言
- **语言持久化**：用户选择的语言保存在 localStorage 中，刷新页面后保持
- **Ant Design 集成**：Ant Design 组件库的语言随系统语言自动切换
- **扩展性**：支持扩展其他语言（通过添加语言资源文件）

**技术实现规则**：
- **禁止硬编码**：所有页面文本、提示信息、错误消息等必须使用国际化，禁止在代码中硬编码中英文文本
- **使用 i18next**：使用 `react-i18next` 和 `i18next` 作为国际化解决方案
- **语言资源文件**：所有翻译文本统一存放在 `Client/i18n/locales/` 目录下
  - `en.json`：英语翻译
  - `zh-CN.json`：中文翻译
- **命名规范**：翻译 key 使用命名空间结构，如 `auth.login`、`group.title`、`message.success` 等
- **组件使用**：在 React 组件中使用 `useTranslation` Hook 获取翻译函数
  ```typescript
  const { t } = useTranslation();
  <Button>{t('common.save')}</Button>
  ```
- **表单验证**：表单验证消息必须使用国际化
  ```typescript
  rules={[{ required: true, message: t('auth.emailRequired') }]}
  ```
- **动态内容**：支持参数化翻译，使用 `{{variable}}` 语法
  ```typescript
  t('validation.minLength', { min: 6 })
  ```
- **语言切换**：切换语言时自动刷新页面以应用 Ant Design 组件语言
- **Redux 集成**：语言状态保存在 Redux store 的 `ui.locale` 中

#### 3.9.5 搜索功能
**功能描述**：全局搜索

**详细需求**：
- 搜索接口：按名称、路径搜索
- 搜索项目：按项目名称搜索
- 搜索结果高亮
- 搜索历史

#### 3.9.6 用户中心
**功能描述**：个人设置和统计

**详细需求**：
- 个人信息：修改用户名、邮箱、头像
- 密码修改
- 我的项目：查看参与的项目
- 我的关注：查看关注的项目
- 操作统计：查看个人操作统计

#### 3.9.7 OpenAPI
**功能描述**：提供 OpenAPI 接口

**详细需求**：
- RESTful API 接口
- 使用项目 Token 认证
- API 文档
- 支持接口的增删改查
- 支持数据导入导出

#### 3.9.8 版本信息
**功能描述**：提供应用版本信息查询功能，方便确认当前部署版本

**详细需求**：
- **版本信息文件**：在 Docker 构建时自动生成 `version` 文件
  - 构建时间：格式为 `YYYY-MM-DD-HH:MM:SS+TZ`（如 `2025-01-27-14:30:45+0800`）
  - 构建分支：Git 分支名称（如 `main`、`develop`）
  - 构建提交：Git commit ID（完整 SHA）
  - Node.js 版本：构建时使用的 Node.js 版本
  - npm 版本：构建时使用的 npm 版本
- **版本信息 API**：提供 `/version` 和 `/api/version` 端点
  - 返回 JSON 格式的版本信息
  - 包含构建时间、构建分支、构建提交、Node.js 版本、npm 版本、应用版本
  - 无需认证即可访问
- **Docker 构建参数**：
  - `BUILD_TIME`：构建时间（可选，默认使用当前时间）
  - `BUILD_BRANCH`：构建分支（可选，默认 `unknown`）
  - `BUILD_COMMIT`：构建提交（可选，默认 `unknown`）

**Docker 构建示例**：
```bash
# 获取 Git 信息
BUILD_TIME=$(date +%Y-%m-%d-%H:%M:%S%z)
BUILD_BRANCH=$(git rev-parse --abbrev-ref HEAD)
BUILD_COMMIT=$(git rev-parse HEAD)

# 构建 Docker 镜像
docker build \
  --build-arg BUILD_TIME="$BUILD_TIME" \
  --build-arg BUILD_BRANCH="$BUILD_BRANCH" \
  --build-arg BUILD_COMMIT="$BUILD_COMMIT" \
  -t apiadmin:latest .
```

**API 响应示例**：
```json
{
  "buildTime": "2025-01-27-14:30:45+0800",
  "buildBranch": "main",
  "buildCommit": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
  "nodeVersion": "v20.11.0",
  "npmVersion": "10.2.4",
  "appVersion": "1.0.0"
}
```

**使用场景**：
- 部署后确认当前运行版本
- 故障排查时确认版本信息
- CI/CD 流程中验证部署版本
- 监控和日志记录

#### 3.9.9 Swagger 集成
**功能描述**：集成 Swagger UI 和 Swagger JSON，提供 API 文档浏览和测试功能

**详细需求**：
- **Swagger UI 集成**：提供可视化的 API 文档界面
  - 访问路径：`/swagger` 或 `/swagger-ui`
  - 支持在线测试 API 接口
  - 支持查看请求/响应示例
  - 支持认证配置
- **Swagger JSON 端点**：提供 OpenAPI 规范 JSON 文档
  - 访问路径：`/swagger.json` 或 `/api-docs`
  - 支持 OpenAPI 3.0 规范
  - 自动生成 API 文档
- **安全控制**：
  - **环境变量开关**：通过 `SWAGGER_ENABLED` 环境变量控制 Swagger 功能的开启/关闭
    - `true` 或 `1`：启用 Swagger
    - `false` 或 `0`：禁用 Swagger（默认返回 404）
  - **IP 白名单**：通过 `SWAGGER_ALLOWED_IP_ADDRESSES` 环境变量配置允许访问的 IP 地址列表
    - 格式：逗号分隔的 IP 地址列表，如 `127.0.0.1,192.168.1.0/24,10.0.0.1`
    - 支持单个 IP 地址（如 `127.0.0.1`）
    - 支持 CIDR 网段（如 `192.168.1.0/24`）
    - 未配置或为空时，允许所有 IP 访问（仅在 Swagger 启用时）
  - **访问控制规则**：
    - 当 `SWAGGER_ENABLED=false` 时，所有 Swagger 相关路径返回 404
    - 当 `SWAGGER_ENABLED=true` 时，检查 IP 白名单
    - 如果配置了 `SWAGGER_ALLOWED_IP_ADDRESSES`，只有白名单内的 IP 可以访问
    - 如果未配置 `SWAGGER_ALLOWED_IP_ADDRESSES`，允许所有 IP 访问
    - 不在白名单内的 IP 访问时返回 404
- **自动文档生成**：
  - 自动扫描路由定义
  - 自动生成 API 文档
  - 支持 JSDoc 注释解析
  - 支持请求/响应 Schema 定义

**环境变量配置**：
```bash
# 启用/禁用 Swagger（默认：false）
SWAGGER_ENABLED=true

# IP 白名单（可选，逗号分隔，支持 CIDR）
SWAGGER_ALLOWED_IP_ADDRESSES=127.0.0.1,192.168.1.0/24,10.0.0.1
```

**安全建议**：
- 生产环境建议禁用 Swagger 或仅允许内网 IP 访问
- 使用 IP 白名单限制访问范围
- 定期审查和更新白名单配置

### 3.10 交互式文档中心

#### 3.10.1 自动发布
- **自动发布**: 接口定义保存后，即时生成美观、可交互的文档网站。
- **多版本对比**: 并排展示接口不同历史版本的差异，支持字段级别对比。
- **在线调试**: 文档页内嵌"Try it out"功能，支持填写参数、添加认证并实时调用。
- **自定义主题**: 支持将文档站点风格匹配企业品牌（颜色、字体、Logo、自定义CSS）。

#### 3.10.2 文档导出
- **PDF 导出**: 支持将项目文档导出为 PDF 格式，包含完整接口信息。
- **Word 导出**: 支持将项目文档导出为 Word 格式，便于编辑和分享。
- **Markdown 导出**: 支持导出为 Markdown 格式，便于版本控制。
- **HTML 导出**: 支持导出为独立的 HTML 文件，可离线查看。

#### 3.10.3 高级文档功能
- **版本管理**: 自动保存接口历史版本，支持版本回滚。
- **版本对比**: 可视化对比不同版本的接口定义，高亮显示差异。
- **文档模板**: 支持自定义文档模板，统一文档风格。
- **文档预览**: 实时预览文档效果，支持多种主题切换。

### 3.11 数据洞察与质量中心

#### 3.11.1 项目健康度看板
- 展示项目级指标：接口总数、文档覆盖率、Mock使用率、测试通过率。
- 统计团队活跃度：成员贡献度、变更频率。

#### 3.11.2 接口质量分析
- 监控测试历史成功率、平均响应时间趋势。
- 在修改重要接口前，系统可分析并提示将影响的前端页面和下游服务。

#### 3.11.3 性能监控与分析
- **API 调用统计**:
  - 接口调用总数、成功数、失败数统计
  - 按时间维度统计（小时、天、周、月）
  - 按接口维度统计（最热门接口、最慢接口）
  - 按用户维度统计（活跃用户、调用频率）
  - 调用量趋势图表展示
- **响应时间分析**:
  - 平均响应时间计算
  - P50、P95、P99 响应时间统计
  - 响应时间分布图
  - 响应时间趋势分析（识别性能退化）
  - 慢接口自动识别和告警
- **错误率统计**:
  - 总体错误率计算
  - 按 HTTP 状态码统计错误分布
  - 错误趋势分析
  - 错误详情查看和日志关联
  - 错误告警机制
- **使用趋势分析**:
  - 调用量趋势（小时/天/周/月）
  - 峰值时间分析
  - 用户增长趋势
  - 接口使用热度排行
  - 容量规划建议

#### 3.11.4 高级协作功能
- **全局搜索**: 跨项目全文搜索接口、文档内容。
- **动态与通知**: 关键操作（接口变更、测试失败）通过站内信、邮件或Webhook通知相关人员。
- **知识图谱**（V2.0）: 可视化展示微服务间接口的调用依赖关系。

## 4. 非功能需求

| 类别 | 具体需求 |
| :--- | :--- |
| **性能** | 95%的页面打开时间 < 2秒。Mock服务P99延迟 < 200毫秒。单实例支持管理10万+接口定义。 |
| **安全性** | 全站强制HTTPS。接口数据加密存储。完善的RBAC与操作审计日志。防CSRF、XSS攻击。 |
| **可靠性** | 核心服务可用性 > 99.9%。支持数据每日自动备份与一键恢复。 |
| **可扩展性** | 微服务架构，核心服务可水平扩展。提供公开的插件API和Webhook事件。 |
| **可维护性** | 提供详细的部署、监控和故障排查指南。代码结构清晰，具备完整的单元与集成测试。 |
| **兼容性** | 支持从YAPI、Postman Collections、Swagger 2.0/3.0平滑导入数据。 |

### 4.1 性能需求
- 接口列表加载时间 < 1s
- Mock 响应时间 < 100ms（P99延迟 < 200ms）
- 支持 1000+ 接口的项目（单实例支持管理10万+接口定义）
- 支持 100+ 并发用户
- 95%的页面打开时间 < 2秒

### 4.2 安全需求
- **Node.js 版本与 TLS 安全**
  - 永远使用最新 TLS 版本的 Node.js LTS 版本
  - 确保使用最新的 TLS 协议（TLS 1.2+，推荐 TLS 1.3）
  - 定期更新 Node.js 版本以获取最新的安全修复和 TLS 改进
  - 在构建和部署流程中强制执行 Node.js 版本检查
  - 禁止使用已停止维护或存在已知安全漏洞的 Node.js 版本
- 用户密码加密存储
- Token 认证机制
- XSS 防护
- CSRF 防护
- SQL 注入防护
- 权限验证
- 全站强制HTTPS
- 接口数据加密存储
- 完善的RBAC与操作审计日志

### 4.3 可用性需求
- 系统可用性 > 99%（核心服务可用性 > 99.9%）
- 支持数据备份和恢复（每日自动备份与一键恢复）
- 错误处理和提示
- 操作确认机制
- **依赖检测与启动控制**
  - 服务启动前必须进行依赖检测（MongoDB、Redis 等）
  - 在日志中输出详细的检测结果和失败原因
  - 如果关键依赖（如 MongoDB）未就绪，服务不应启动或应等待修复
  - 支持自动重试机制（最多重试 10 次，每次间隔 5 秒）
  - 健康检查端点（`/api/health`）可以返回 `ready` 状态，但不执行业务逻辑
  - 当依赖未就绪时，业务 API 返回 503 Service Unavailable，避免产生过多错误日志
  - 系统端点（健康检查、版本信息）始终可访问，不受依赖状态影响

### 4.4 兼容性需求
- 支持 Chrome、Firefox、Safari、Edge 最新版本
- **Node.js 版本要求**
  - 最低版本：Node.js 18.0.0（LTS）
  - 推荐版本：Node.js 20.x LTS 或更高版本
  - **强制要求**：必须使用支持最新 TLS 版本的 Node.js LTS 版本
  - 通过 `.nvmrc` 文件锁定推荐版本，确保团队使用一致的 Node.js 版本
  - 在开发、构建和部署环境中强制执行版本检查
- 支持 MongoDB 2.6+
- 支持从ApiAdmin、Postman Collections、Swagger 2.0/3.0平滑导入数据

### 4.5 可扩展性需求
- 插件系统支持扩展
- API 接口支持扩展
- 支持自定义主题
- 支持自定义字段
- 微服务架构，核心服务可水平扩展
- 提供公开的插件API和Webhook事件

### 4.6 可维护性需求
- 提供详细的部署、监控和故障排查指南
- 代码结构清晰，具备完整的单元与集成测试

## 5. UI/UX 设计规范

### 5.1 设计原则
- **Clarity (清晰)**: 信息层级分明，关键操作路径明确。
- **Efficiency (高效)**: 为高频操作（如保存、运行测试）设置快捷键，减少点击步骤。
- **Consistency (一致)**: 全平台使用统一的组件库、图标和交互反馈。
- **简洁直观**：界面简洁，操作直观
- **反馈及时**：操作有明确的反馈
- **容错性**：支持撤销、确认等容错机制
- **响应式**：适配不同屏幕尺寸

### 5.2 核心交互与布局
- **三栏布局**: 左侧导航树（项目/接口），中间主工作区，右侧属性/调试面板。
- **全局命令面板**: `Cmd/Ctrl + K` 唤起，快速跳转至任何功能或接口。
- **拖拽交互**: 广泛支持列表排序、测试步骤编排等拖拽操作。
- 拖拽排序：支持接口、分类、测试用例拖拽排序
- 实时协作：基于 WebSocket 的多人协作编辑（光标可见、变更实时同步）
- 快捷键：支持常用操作快捷键
- 批量操作：支持批量删除、移动等操作

### 5.3 视觉语言
- **色彩系统**: 主色为科技蓝 (`#2563EB`)。提供完整的语义色板（成功、警告、错误）。支持明暗主题切换。
- **动效**: 仅用于必要的状态过渡和焦点引导，持续时间控制在300毫秒内。
- 现代化设计风格
- 清晰的视觉层次
- 合理的色彩搭配
- 图标和插画使用

## 6. 技术架构

### 6.1 前端技术栈
- React 18 + TypeScript
- Ant Design 5
- Redux Toolkit（状态管理）
- React Router v6（路由）
- Vite（构建工具）
- WebSocket（实时协作）

### 6.2 后端技术栈
- Node.js + Koa
  - **Node.js 版本要求**：必须使用支持最新 TLS 版本的 Node.js LTS 版本
  - **TLS 安全策略**：永远使用最新 TLS 版本的 Node.js，确保使用最新的 TLS 协议和安全补丁
  - **版本管理**：通过 `.nvmrc` 文件锁定 Node.js 版本，并在 CI/CD 和 Docker 构建中强制执行版本检查
  - **安全更新**：定期更新 Node.js 版本以获取最新的安全修复和 TLS 改进
- MongoDB + Mongoose
  - **依赖检测**：服务启动前检测 MongoDB 连接状态
  - **连接验证**：通过 `ping` 命令验证连接可用性
  - **错误诊断**：提供详细的连接失败原因（认证失败、连接被拒绝、超时等）
- Redis（可选，用于速率限制）
  - **依赖检测**：如果配置了 Redis，服务启动前检测连接状态
  - **降级处理**：如果 Redis 未配置或连接失败，自动降级到内存存储
- WebSocket（实时通信）
- JWT（认证）

### 6.3 开发工具
- TypeScript
- ESLint + Prettier
- Vitest（测试）
- Git（版本控制）

### 6.4 代码组织与复用架构

#### 6.4.1 公共代码抽象原则
**核心目标**：通过抽象公共代码和可复用逻辑，简化代码、降低代码量、提高可维护性。

**基本原则**：
- **DRY（Don't Repeat Yourself）**：避免代码重复，将重复逻辑抽象为公共函数
- **单一职责**：每个工具模块只负责一个明确的功能领域
- **高内聚低耦合**：相关功能组织在一起，模块间依赖最小化
- **可测试性**：公共代码必须易于单元测试
- **文档完善**：所有公共工具函数必须有清晰的注释和使用示例

#### 6.4.2 Utils 目录结构设计

**后端 Utils (`Server/Utils/`)**：
```
Server/Utils/
├── config.js              # 配置管理（环境变量、默认值）
├── logger.js              # 日志工具（统一日志格式、级别）
├── validation.js          # 数据验证（参数校验、Schema 验证）
├── security.js            # 安全工具（加密、JWT、密码处理）
├── emailService.js        # 邮件服务（SMTP、模板、发送）
├── envLoader.js           # 环境变量加载器（文件监听、自动刷新）
├── dependencyChecker.js   # 依赖检测（MongoDB、Redis 连接检查）
├── mockScriptExecutor.js  # Mock 脚本执行器（沙箱、安全执行）
├── swagger.js             # Swagger 文档生成
├── version.js             # 版本信息管理
├── response.js            # 统一响应格式（成功/失败响应）
├── errorHandler.js        # 错误处理工具（错误分类、格式化）
├── pagination.js          # 分页工具（MongoDB 分页、参数解析）
├── fileUtils.js           # 文件操作（上传、下载、删除、验证）
├── dateUtils.js           # 日期时间工具（格式化、解析、计算）
├── stringUtils.js         # 字符串工具（截取、格式化、验证）
├── arrayUtils.js          # 数组工具（去重、分组、排序）
├── objectUtils.js         # 对象工具（深度合并、克隆、路径访问）
└── httpUtils.js           # HTTP 工具（请求封装、响应处理）
```

**前端 Utils (`Client/Utils/`)**：
```
Client/Utils/
├── api.ts                 # API 请求封装（axios 配置、拦截器）
├── storage.ts             # 存储工具（localStorage、sessionStorage）
├── format.ts              # 格式化工具（日期、数字、文件大小）
├── validation.ts          # 前端验证（表单验证、数据校验）
├── constants.ts           # 常量定义（状态码、配置常量）
├── helpers.ts             # 辅助函数（通用工具函数）
├── hooks/                 # 自定义 React Hooks
│   ├── useDebounce.ts     # 防抖 Hook
│   ├── useThrottle.ts     # 节流 Hook
│   ├── useRequest.ts      # 请求 Hook（数据获取、加载状态）
│   ├── usePagination.ts   # 分页 Hook
│   └── usePermission.ts   # 权限检查 Hook
└── components/            # 通用组件
    ├── ErrorBoundary.tsx  # 错误边界
    ├── Loading.tsx        # 加载组件
    └── Empty.tsx          # 空状态组件
```

**Core 目录（前后端共享）**：
```
Core/
├── Utils/                 # 核心工具函数（前后端通用）
│   ├── validation.js/ts   # 数据验证（邮箱、密码、URL、手机号、用户名等）
│   ├── stringUtils.js/ts  # 字符串工具（截取、格式化、清理、转义）
│   ├── dateUtils.js/ts    # 日期时间工具（格式化、解析、计算、时区）
│   ├── arrayUtils.js/ts   # 数组工具（去重、分组、排序、过滤、扁平化）
│   ├── objectUtils.js/ts  # 对象工具（深度合并、克隆、路径访问、键值转换）
│   └── index.js/ts        # 统一导出入口
├── Constants/             # 共享常量定义
│   ├── httpStatus.js/ts   # HTTP 状态码常量
│   ├── errorCodes.js/ts   # 业务错误码定义
│   ├── apiResponse.js/ts  # API 响应格式常量
│   ├── userRoles.js/ts    # 用户角色常量
│   ├── permissions.js/ts  # 权限常量
│   └── index.js/ts        # 统一导出入口
├── Formatters/            # 共享格式化函数
│   ├── dateFormatter.js/ts # 日期格式化（统一格式、时区处理）
│   ├── numberFormatter.js/ts # 数字格式化（货币、百分比、文件大小）
│   ├── stringFormatter.js/ts # 字符串格式化（截断、填充、大小写）
│   └── index.js/ts         # 统一导出入口
├── Types/                 # 共享类型定义（TypeScript）
│   ├── api.ts             # API 相关类型（请求、响应、错误）
│   ├── user.ts            # 用户相关类型
│   ├── project.ts         # 项目相关类型
│   ├── interface.ts       # 接口相关类型
│   └── index.ts           # 统一导出入口
├── Schemas/               # 共享数据模式定义
│   ├── validationSchemas.js/ts # JSON Schema 验证规则
│   ├── apiSchemas.js/ts   # API 请求/响应 Schema
│   └── index.js/ts        # 统一导出入口
└── README.md              # Core 目录说明文档
```

**抽象原则**：
- **识别重复逻辑**：通过代码审查识别 Server 和 Client 中的重复代码
- **提取公共功能**：将重复的验证、格式化、工具函数提取到 Core 目录
- **保持平台无关**：Core 目录中的代码不应依赖 Node.js 或浏览器特定 API
- **类型安全**：提供 TypeScript 类型定义，确保类型安全
- **向后兼容**：保持现有 API 不变，通过重新导出实现平滑迁移

#### 6.4.3 Core 目录抽象策略

**核心目标**：将 Server 和 Client 中重复的逻辑和功能抽象到 `Core/` 目录，实现代码复用，降低代码量，提高可维护性。

**抽象范围**：

**1. 数据验证逻辑（Core/Utils/validation.js/ts）**
- **邮箱验证**：`validateEmail()` - Server 和 Client 表单验证都需要
- **密码验证**：`validatePassword()` - 注册、登录、修改密码时使用
- **用户名验证**：`validateUsername()` - 用户注册和更新时使用
- **URL 验证**：`validateUrl()` - 接口路径、头像 URL 等验证
- **手机号验证**：`validatePhone()` - 手机号登录、注册时使用
- **输入清理**：`sanitizeInput()`、`sanitizeString()` - XSS 防护，前后端都需要
- **ObjectId 验证**：`validateObjectId()` - 仅后端使用，但可放在 Core 中

**2. 字符串处理逻辑（Core/Utils/stringUtils.js/ts）**
- **字符串截取**：`truncate()` - 列表显示、摘要生成
- **字符串清理**：`sanitize()` - HTML 标签移除、特殊字符转义
- **字符串格式化**：`format()` - 模板字符串替换、占位符处理
- **大小写转换**：`toCamelCase()`、`toSnakeCase()` - 数据格式转换
- **字符串验证**：`isBlank()`、`isEmpty()` - 空值检查

**3. 日期时间处理（Core/Utils/dateUtils.js/ts）**
- **日期格式化**：`formatDate()` - 统一日期显示格式
- **日期解析**：`parseDate()` - 字符串转日期对象
- **相对时间**：`timeAgo()` - "3 天前"、"刚刚" 等相对时间显示
- **时区处理**：`toTimezone()` - 时区转换
- **日期计算**：`addDays()`、`subtractDays()` - 日期加减运算

**4. 数组操作（Core/Utils/arrayUtils.js/ts）**
- **数组去重**：`unique()` - 去除重复元素
- **数组分组**：`groupBy()` - 按条件分组
- **数组排序**：`sortBy()` - 多字段排序
- **数组过滤**：`filterBy()` - 复杂条件过滤
- **数组扁平化**：`flatten()` - 多维数组扁平化

**5. 对象操作（Core/Utils/objectUtils.js/ts）**
- **深度合并**：`deepMerge()` - 对象深度合并
- **深度克隆**：`deepClone()` - 对象深度克隆
- **路径访问**：`get()`、`set()` - 通过路径访问嵌套属性
- **键值转换**：`pick()`、`omit()` - 选择/排除对象属性
- **对象比较**：`deepEqual()` - 深度比较

**6. 常量定义（Core/Constants/）**
- **HTTP 状态码**：`HTTP_STATUS` - 200, 400, 401, 403, 404, 500 等
- **业务错误码**：`ERROR_CODES` - 统一的错误码定义
- **API 响应格式**：`RESPONSE_FORMAT` - 成功/失败响应结构
- **用户角色**：`USER_ROLES` - super_admin, group_leader, project_leader 等
- **权限常量**：`PERMISSIONS` - 权限标识符定义

**7. 格式化函数（Core/Formatters/）**
- **日期格式化**：统一日期显示格式（YYYY-MM-DD HH:mm:ss）
- **数字格式化**：货币、百分比、文件大小（KB, MB, GB）
- **字符串格式化**：截断、填充、大小写转换

**8. 类型定义（Core/Types/）**
- **API 类型**：请求/响应类型、错误类型
- **业务类型**：用户、项目、接口等业务实体类型
- **工具类型**：通用工具类型（Partial、Required、Pick 等）

**迁移策略**：
1. **第一阶段**：识别重复代码，创建 Core 目录结构
2. **第二阶段**：将验证、格式化、工具函数迁移到 Core
3. **第三阶段**：更新 Server 和 Client 代码，从 Core 导入
4. **第四阶段**：提取常量定义，统一错误码和状态码
5. **第五阶段**：完善类型定义，提供完整的 TypeScript 支持

**使用示例**：
```javascript
// Server/Controllers/User.js
import { validateEmail, validatePassword, sanitizeInput } from '../../Core/Utils/validation.js';

// Client/Containers/Register/index.tsx
import { validateEmail, validatePassword } from '../../Core/Utils/validation';
```

#### 6.4.4 代码复用策略

**1. 控制器层复用**
- **BaseController**：所有控制器继承基础控制器
  - 统一错误处理
  - 统一响应格式
  - 统一参数验证
  - 统一权限检查
  - 统一日志记录

**2. 中间件复用**
- **认证中间件**：统一 JWT 验证逻辑
- **权限中间件**：统一权限检查逻辑
- **错误处理中间件**：统一错误捕获和格式化
- **请求日志中间件**：统一请求日志记录
- **限流中间件**：统一速率限制逻辑

**3. 数据访问层复用**
- **BaseModel**：所有模型继承基础模型
  - 统一 CRUD 操作
  - 统一查询构建器
  - 统一数据验证
  - 统一时间戳处理

**4. 业务逻辑复用**
- **Service 层**：将复杂业务逻辑抽象为 Service
  - 接口管理服务
  - 项目管理服务
  - 用户管理服务
  - Mock 生成服务
  - 测试执行服务

**5. 前端组件复用**
- **通用组件库**：提取可复用的 UI 组件
  - 表单组件（FormInput、FormSelect 等）
  - 列表组件（Table、List 等）
  - 弹窗组件（Modal、Drawer 等）
  - 编辑器组件（CodeEditor、MarkdownEditor 等）

#### 6.4.5 代码简化指导原则

**1. 消除重复代码**
- **识别重复模式**：通过代码审查识别重复逻辑
- **提取公共函数**：将重复代码提取为工具函数
- **使用高阶函数**：通过函数组合减少代码量
- **模板方法模式**：定义算法骨架，子类实现细节

**2. 简化条件判断**
- **使用策略模式**：将复杂的 if-else 替换为策略对象
- **使用映射表**：将 switch-case 替换为对象映射
- **提前返回**：使用 guard clauses 减少嵌套

**3. 简化异步处理**
- **统一 Promise 处理**：使用统一的错误处理包装
- **使用 async/await**：简化异步代码结构
- **统一错误处理**：集中处理异步错误

**4. 简化数据转换**
- **使用工具函数**：将数据转换逻辑提取为工具函数
- **使用函数式编程**：使用 map、filter、reduce 等函数
- **使用转换器模式**：统一数据格式转换

**5. 简化配置管理**
- **统一配置加载**：使用统一的配置管理模块
- **环境变量抽象**：将环境变量访问封装为函数
- **默认值管理**：集中管理默认值配置

#### 6.4.6 代码复用示例

**示例 1：统一响应格式**
```javascript
// Server/Utils/response.js
export const success = (data, message = '操作成功') => ({
  success: true,
  data,
  message,
});

export const error = (message = '操作失败', code = 500) => ({
  success: false,
  message,
  code,
});

// 使用
ctx.body = success(result, '查询成功');
ctx.body = error('参数错误', 400);
```

**示例 2：统一分页处理**
```javascript
// Server/Utils/pagination.js
export const paginate = async (model, query, options = {}) => {
  const { page = 1, pageSize = 10, sort = { createdAt: -1 } } = options;
  const skip = (page - 1) * pageSize;
  
  const [data, total] = await Promise.all([
    model.find(query).sort(sort).skip(skip).limit(pageSize),
    model.countDocuments(query),
  ]);
  
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};
```

**示例 3：统一错误处理**
```javascript
// Server/Utils/errorHandler.js
export const handleError = (error, ctx) => {
  if (error.name === 'ValidationError') {
    ctx.status = 400;
    ctx.body = error('参数验证失败', 400);
  } else if (error.name === 'UnauthorizedError') {
    ctx.status = 401;
    ctx.body = error('未授权', 401);
  } else {
    ctx.status = 500;
    ctx.body = error('服务器错误', 500);
  }
};
```

**示例 4：前端请求 Hook**
```typescript
// Client/Utils/hooks/useRequest.ts
export const useRequest = <T>(url: string, options?: RequestOptions) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<T>(url, options);
      setData(response.data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [url, options]);
  
  useEffect(() => {
    fetch();
  }, [fetch]);
  
  return { data, loading, error, refetch: fetch };
};
```

#### 6.4.7 代码质量指标

**代码复用率目标**：
- **工具函数复用率**：> 80%（80% 以上的工具函数被 2 个以上模块使用）
- **组件复用率**：> 70%（70% 以上的组件被 2 个以上页面使用）
- **代码重复率**：< 5%（通过工具检测，重复代码块不超过 5%）

**代码简化目标**：
- **平均函数长度**：< 50 行
- **平均文件长度**：< 300 行
- **圈复杂度**：< 10（单个函数的复杂度）
- **代码覆盖率**：> 80%（工具函数和公共逻辑的测试覆盖率）

#### 6.4.7 实施步骤

**阶段 1：识别和提取（当前阶段）**
1. 代码审查，识别重复代码模式
2. 提取公共逻辑到 Utils 目录
3. 重构现有代码使用公共工具
4. 编写单元测试

**阶段 2：标准化和优化**
1. 统一工具函数接口
2. 完善工具函数文档
3. 优化工具函数性能
4. 建立代码复用规范

**阶段 3：持续改进**
1. 定期审查代码复用情况
2. 持续优化公共代码
3. 收集使用反馈
4. 迭代改进工具函数

## 7. 开发计划

### 7.1 MVP 版本（最小可行产品）
1. 用户注册登录
2. 分组和项目管理
3. 接口 CRUD
4. 基础 Mock 功能
5. 接口运行/调试

### 7.2 v0.0.1 版本
1. 完整的权限管理
2. 高级 Mock 功能
3. 自动化测试
4. 数据导入导出
5. 插件系统基础

### 7.3 V2.0 版本
1. 完整的插件系统
2. 代码生成
3. 统计分析
4. 性能优化
5. 国际化完善

## 8. 成功指标与路线图

### 8.1 关键成功指标 (KSMs)
1.  **用户采用率**: 目标团队内核心项目迁移率达到80%以上。
2.  **效率提升**: 前端等待后端接口的平均阻塞时间降低50%。
3.  **质量提升**: 线上由接口变更引发的事故数量降低30%。
4.  **活跃度**: 日均用户活跃度（DAU/MAU）> 40%。

### 8.2 产品路线图 (建议)
| 阶段 | 周期 | 核心目标与功能 |
| :--- | :--- | :--- |
| **MVP (基石)** | 8-10周 | 基础项目管理、API设计器、动态Mock服务、基础文档。 |
| **v0.0.1 (协作)** | 12-14周 | 团队权限、一体化测试工厂、数据迁移工具、开放API。 |
| **V1.5 (增强)** | 8-10周 | 性能测试、高级断言、更完善的插件机制。 |
| **V2.0 (智能)** | 后续迭代 | AI辅助设计、接口依赖图谱、全面数据分析看板。 |

### 8.3 用户指标
- 日活跃用户数
- 项目创建数量
- 接口创建数量
- 测试用例执行次数

### 8.4 功能指标
- Mock 调用次数
- 数据导入导出次数
- 插件使用率
- API 调用成功率

### 8.5 质量指标
- 系统稳定性
- 响应时间
- 错误率
- 用户满意度

## 9. 附录

### 9.1 术语表
- **PRD**: 产品需求文档
- **OpenAPI**: 描述RESTful API的行业标准规范
- **JSON Schema**: 用于描述和验证JSON数据结构的标准
- **Mock**: 模拟，此处指模拟API响应数据
- **CI/CD**: 持续集成与持续交付/部署

### 9.2 后续问题与待决策项
1.  技术栈选型：前端（React/Vue）与后端（Node.js/Go/Java）的最终确定。
2.  开源协议选择：决定项目采用何种开源协议（如MIT、Apache 2.0）。
3.  商业化路径：是否以及何时推出云托管版本或企业高级功能。

---

**文档版本**：v0.0.1
**创建日期**：2025-01-27  
**最后更新**：2025-01-27

*本文档将随着产品开发的深入而持续迭代。任何重大的需求变更都应通过正式的评审流程。*

