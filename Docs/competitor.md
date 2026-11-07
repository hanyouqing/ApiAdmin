# 竞品功能清单（官方文档整理）

> 整理日期：2026-11-07  
> 复核日期：2026-11-07（对照官方帮助中心 / 产品页 / GitHub README 补全遗漏）  
> ApiAdmin 对标日期：2026-11-07（对照本文件竞品清单 + 仓库实现，补全 §5 列与 §7 缺口）  
> 范围：Apifox、MeterSphere、YApi、Postman、**ApiAdmin 对标缺口**（及少量同类工具对照）  
> 说明：竞品功能以**官方文档 / 产品页**为准；ApiAdmin 以本仓库代码与 `Docs/*PARITY*` 为准。商业版 / X-Pack / 产品边界（🚫）单独标注。

| 产品        | 官方文档 / 产品入口                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| Apifox      | https://docs.apifox.com/ 、https://docs.apifox.com/introduction                                           |
| MeterSphere | https://metersphere.io/docs/v3.x/ 、https://github.com/metersphere/metersphere                            |
| YApi        | https://hellosean1025.github.io/yapi/ 、https://github.com/YMFE/yapi                                      |
| Postman     | https://www.postman.com/product/ 、https://www.postman.com/platform/ 、https://learning.postman.com/docs/ |
| ApiAdmin    | `Docs/QUICKSTART_OSS.md`、`Docs/METERSPHERE_PARITY.md`、`Docs/POSTMAN_PARITY_AND_LIFECYCLE.md`            |

---

## 1. Apifox

**定位（官方）**：API 设计、开发、调试、管理、文档、Mock、自动化测试一体化平台；常见表述为「Postman + Swagger + Mock + JMeter」。  
**统一数据源**：所有角色围绕同一份 API 定义协作（设计 / Mock / 调试 / 测试 / 文档同步）。

### 1.1 发送 / 调试请求

- HTTP 请求调试（类 Postman）
- GraphQL
- gRPC
- Dubbo
- WebSocket
- SOAP / WebService
- SSE（Server-Sent Events；流式响应时间线、主流 AI 模型消息自动合并）
- 快捷调试（临时请求、无需先文档化）；可将快捷请求保存为正式接口文档
- 按接口定义**自动生成请求参数与请求体**
- Cookie / Session 全局共享
- 环境与**服务**（多服务 / 微服务切换测试）
- 环境变量、全局变量；动态值注入
- 认证与授权配置
- 前置 / 后置操作与脚本（官方称 100% 兼容 Postman 语法）
- 多语言脚本 / **调用外部程序**：JavaScript / Java / Python / PHP / BeanShell / Go / Shell / Ruby / Lua 等
- 响应自动校验（对照接口定义 / 契约向校验）
- 可视化断言、可视化提取变量
- 数据库操作（前后置 SQL；结果可提取变量 / 断言）
  - 免费常见：MySQL、SQL Server、Oracle、Db2、PostgreSQL、ClickHouse、MongoDB
  - 付费额外：达梦、Redis；支持 SSH 隧道；连接信息默认本地、不云端共享
- 接口历史记录
- 保存为接口用例（正确 / 错误 / 空数据 / 不同状态等）

### 1.2 API 设计与文档

- 可视化 OpenAPI（OAS）设计
- JSON Schema 支持
- 可复用**数据模型**（嵌套引用、oneOf / allOf 等）
- 智能解析并生成 API 定义
- 接口用例管理；可基于定义自动生成用例
- 在线分享 API 文档（可公开 / 密码）
- 发布文档站、自定义页面布局
- 文档随 API 定义自动同步
- 文档规范性 / 完整性 AI 检测（需自配模型 Key）

### 1.3 Mock

- 智能 Mock（零配置 / 字段名智能规则；按定义自动生成）
- 可返回文档中的响应示例或自定义响应
- 三种 Mock 部署形态：
  - **本地 Mock**（随客户端启动；网页版不支持）
  - **云端 Mock**（可随时开关；可加密访问；URL 可能变更，勿用于生产）
  - **自托管 Runner Mock**（团队自有 Runner / 通用 Runner）
- Mock 期望（按请求条件返回不同数据；多响应 / 多期望可有独立 Mock URL）
- 内置 Mock.js 规则引擎
- 自定义 Mock 规则库（正则 / 通配符匹配字段名）
- 请求参数回填类能力（按请求参数返回相关响应）

### 1.4 自动化测试与性能

- 测试场景可视化编排（官方对标 Postman Flows 式组合）
- 流程控制：`If` / `For` / `Wait` 等
- 步骤间变量提取与传递
- 测试套件 / 测试集合 / 数据驱动测试数据集
- 测试类型表述：集成、端到端、回归、性能、**契约测试**（对照 OpenAPI）
- 定时任务
- **性能测试**（文档标明 Beta）：基于场景；虚拟用户（文档写最高 100）、运行时长、爬坡时间；随机 / 顺序匹配测试数据；实时指标（RPS、响应时间、失败率等）与历史报告
- 测试报告（CLI：HTML / JSON / JUnit 等）
- CI/CD 集成（经 CLI）

### 1.5 协作、分支与权限

- 组织 / 团队 / 项目分层
- 成员权限
- 组织与单点登录（SSO）
- **迭代分支**：新建分支、分支内测试、合并分支
- AI 分支（配合 CLI / Agent，隔离生成变更）

### 1.6 导入 / 导出

- 导入：OpenAPI/Swagger、Postman、HAR、RAML、RAP2、YApi、Eolinker、NEI、DOClever、ApiPost、Apizza、ShowDoc、API Blueprint、I/O Docs、WADL、Google Discovery 等（文档称 30+ 格式）
- 导出：OpenAPI、Markdown、HTML、Apifox 原生等
- 从 Postman 迁移指引
- 定时导入接口文档（可经通用 Runner）

### 1.7 代码生成

- 业务代码（服务端实现）
- 接口请求代码（客户端调用）
- 数据模型代码
- 基于 OpenAPI Generator，官方称 130+ 语言 / 框架
- 自定义代码模板

### 1.8 CLI / Runner / AI / 部署

- Apifox CLI（本地、CI/CD、AI Agent）
- CLI Schema 校验、`agentHints`、Skills（测试用例 / 场景 / 分支 / 导入导出等）
- Apifox CI/CD 集成
- **通用 Runner**（Docker 自托管）：自动化测试定时任务、定时导入文档、返回 Mock；可选通用版（Node/Java/Python/PHP）/ 精简版 / 自定义镜像；团队可部署多个 Runner
- AI：改数据模型、命名字段、生成测试用例与前后置、文档检测等（用户自备模型 API Key）
- 私有化部署
- 开放 API
- Apifox Markdown

---

## 2. MeterSphere（V3）

**定位（官方）**：新一代开源持续测试工具；内置 AI 助手。  
**重要变更**：V3 **不再提供性能测试与 UI 测试**；不支持从 V1/V2 直接升级到 V3。分社区版与企业版（X-Pack）。

文档：https://metersphere.io/docs/v3.x/

### 2.1 接口测试

- 接口调试（服务端执行 / 本地执行；本地需 task_runner）
- 接口定义管理（模块、状态、关注、分享、引用关系、变更历史）
- **接口定义分享**（范围、截止时间、密码访问、是否允许导出）
- 接口用例（等级、标签、环境；执行历史、变更历史、同步更新差异对比）
- 接口 Mock（跟随 API / 自定义响应；复制 Mock 地址；服务端或本地调试）
- 请求参数：Header / Body / Query / REST；内置 Mock 函数
- 前后置：提取（含 JSONPath 快捷提取）、断言（状态码等）、认证
- 场景自动化（多接口 + 测试组件编排）
  - 步骤：导入系统请求（复制 / 引用接口、用例、场景）、自定义请求（可导 cURL）
  - 控制器：次数循环、while、forEach、条件、仅一次
  - 脚本操作、等待时间
  - 场景参数：常量 / 列表 / CSV（文件上传或关联；场景或步骤作用域）
  - Cookie：环境 Cookie / 共享 Cookie；失败规则（忽略继续 / 停止）
  - 场景导入导出（MeterSphere、JMeter）；定时任务
- 接口测试报告（在线、分享、导出；含 PDF）
- 导入：Postman、JMX、HAR、MeterSphere、Swagger 文件 / **Swagger URL**（可 Token / Basic Auth）、cURL（含 Charles / Fiddler 解析）
- **定时导入** Swagger（任务名、频率、覆盖模式）
- 接口用例与 API 变更一键同步
- IDEA 插件：API 本地调试、同步 API 到平台（社区版）
- 资源池、环境、串行 / 并行、失败停止等执行配置（社区版默认单资源池）
- 任务中心（即时任务 / 后台任务、失败重跑、定时任务）
- **协议扩展（插件）**：内置 HTTP；企业版插件含 TCP、SSH、Redis、MongoDB、gRPC、AMQP 等

### 2.2 测试管理（功能测试）

- 测试用例：在线表单、**思维导图**编写（快捷键、模块树操作）
- 用例字段：前置条件、步骤、等级、执行人、标签、附件、备注等
- 用例关联：接口用例 / 场景用例 / 需求（含第三方）/ 缺陷 / 依赖关系
- Excel / XMind 导入导出（覆盖选项；导出默认或单元格拆分）
- 批量：编辑、移动 / 复制模块、关联需求、删除等
- 用例评审（评审计划、多人在线评审、脑图评审）
- 视图与高级搜索（我关注的 / 我创建的 / 自定义视图）
- 评论、变更历史、关注、分享、复制
- 回收站（恢复 / 彻底删除）

### 2.3 测试计划与报告

- 测试计划：关联功能用例、接口用例、场景用例
- 计划组（多计划编排）
- 通过率阈值、允许重复关联、自动更新状态
- 列表 / 脑图模式执行功能用例（快捷键成功 / 失败 / 阻塞）
- 执行中可新建或关联缺陷
- 定时任务；归档视图
- 生成测试报告（自动 / 自定义内容）
- 工作台首页与项目概览（近 3 / 7 天或自定义；卡片布局）

### 2.4 缺陷管理

- 本地缺陷创建 / 编辑 / 复制 / 删除 / 回收站
- 缺陷模板（本地或第三方模板）与工作流（见项目管理模板）
- 与 JIRA、TAPD、禅道等双向同步（自动 / 手动；插件分社区 / 企业）
- 关联用例、评论、变更历史、分享、关注、导出

### 2.5 项目管理与系统

- 「系统 – 组织 – 项目」分层
- 项目与权限、成员、应用设置
- **模板管理**：用例字段 / 模板；缺陷字段 / 模板 / 工作流
- **文件管理**：JAR、脚本、CSV 等；可拉取 Gitea / GitHub / GitLab / Gitee 远程文件
- **消息管理**：机器人、站内信、邮件（缺陷 / 用例 / 测试 / 定时任务等）
- **公共脚本**：测试过程引用
- **项目日志**：操作范围、对象、类型、时间
- **环境管理**：环境变量、HTTP(S) 域名与启用条件（路径 / 模块匹配）、请求头、数据库数据源、HOST 映射、场景 / 请求级前后置（脚本 / SQL）、断言、超时；TCP 等需协议插件
- 插件市场 / 插件体系（协议、平台集成、API 导入、CI、数据库驱动）
- Jenkins 插件：流水线触发并执行测试计划（社区版）
- MeterSphere Skills（AI Agent 技能，较新版本）

### 2.6 AI

- AI 生成功能用例（可配置模板与设计方法；同步到模块）
- AI 生成接口用例（可配置场景与内容；需系统或个人模型设置）

### 2.7 企业版 X-Pack（增强包，非社区默认）

- 多组织管理
- 自定义主题（名称、Logo、风格等）
- SSO：LDAP、OAuth、SAML、OIDC；企业微信 / 钉钉扫码
- 消息模板（企微 / 钉钉 / 飞书 / 邮件）
- 多资源池（水平扩展并发）
- 部分协议插件为企业版授权（见官方插件列表）

### 2.8 技术栈（README）

- 后端 Spring Boot、前端 Vue、MySQL / Kafka / MinIO / Redis、Docker、测试引擎 JMeter

---

## 3. YApi

**定位（官方）**：可本地部署的可视化接口管理平台，打通前后端与 QA；高效、易用、可内网部署。

文档：https://hellosean1025.github.io/yapi/documents/  
仓库：https://github.com/YMFE/yapi

### 3.1 组织与项目

- 分组（超级管理员管理）
- 项目创建 / 修改 / 迁移 / 拷贝
- 扁平化权限（团队 / 项目成员；组长可管成员）
- 公开项目浏览与搜索
- 项目关注、「我的关注」
- 项目动态 / 操作日志
- 环境配置、请求配置、Token 配置
- 全局 Mock 开关
- 个人中心（用户名 / 密码等）
- 注册与登录

### 3.2 接口管理

- 可视化接口列表与分类
- 接口预览 / 编辑 / 运行（类 Postman 调试）
- 基于 WebSocket 的多人协作编辑
- Json5 + 注释 或 JSON Schema 定义返回结构（默认偏 json+注释）
- 接口设置与运行

### 3.3 Mock

- Mock Server（路径：`平台地址/mock/{projectId}{path}`）
- Mock.js 规则（json + 注释；正则需 `|regexp` 写法）
- JSON Schema 生成随机数据（format / `@占位符` 等）
- 高级 Mock：
  - **Mock 期望**：IP 过滤、Query/Body 参数过滤；自定义 HTTP Code、延时、响应头、返回 JSON
  - **自定义 Mock 脚本**（JS；可改 `mockJson` / `httpCode` / `resHeader` / `delay`）
- 项目全局 Mock 脚本
- 优先级：Mock 期望 > 自定义脚本 > 项目全局脚本 > 普通 Mock
- Mock 严格模式（v1.3.22+：必填 query/form；JSON Schema body 校验）
- 请求参数回填（`${query.x}` / `${body.x}`）
- 跨域友好；可用 nginx / ykit 等反向代理到 Mock

### 3.4 自动化测试

- 测试集合（同一接口可多次导入；拖拽调序）
- 编辑测试用例：请求参数 + 断言脚本
- 参数能力：常量、**Mock 参数**（随机）、**变量参数**（依赖前置用例）
  - 变量格式：`$.{key}.{params|body}.{path}`；表达式生成器点选
  - 支持 query / body / header / pathParam
- Response 断言脚本（`assert` / `status` / `params` / `body` / `header` / `records` / `log`）
- 公共变量；**配置通用规则**（统一控制多 case，减少逐条维护）
- 浏览器端运行与测试报告
- **服务端自动化测试**（访问平台 URL 触发；可接 Jenkins）

### 3.5 导入 / 导出

- 导入：Swagger、Postman、HAR、JSON
- 命令行导入接口数据
- 数据导出
- 生态插件：RAP 导入、导出 DOCX 等
- 社区常见：自动同步 Swagger → YApi、IDEA 一键上传等（生态工具）

### 3.6 插件与扩展（生态）

- SSO / CAS / OAuth2 登录插件
- GitLab 集成
- 钉钉机器人推送
- 定时获取鉴权 Token
- 自定义 Swagger 导入
- 二次开发与钩子
- 社区代码生成 / 上传工具（TS / JS / Swift、SpringBoot、IDEA 插件等，非核心内置）

### 3.7 部署

- Node.js + MongoDB
- yapi-cli 可视化部署
- pm2 管理
- 版本升级（`yapi update`）
- 多种非官方 Docker 方案
- 免费开源、内网部署

### 3.8 局限（相对现代竞品，据公开能力）

- 主仓维护活跃度与商业产品有差距（社区项目）
- 无原生完整「测试管理 / 缺陷 / 性能」套件（侧重文档 + Mock + 轻量自动化）
- 协议面以 HTTP(S) 接口管理为主

---

## 4. Postman

**定位（官方）**：统一的 API 平台——设计、构建、测试、文档、分发、监控与治理。

产品页：https://www.postman.com/product/  
平台对比：https://www.postman.com/platform/  
学习文档：https://learning.postman.com/docs/

### 4.1 API Client

- 综合 API Client
- 多协议：HTTP、GraphQL、gRPC、WebSocket、MQTT、AI 模型、MCP Server 等
- 内置认证
- 复杂 Body 格式
- 响应可视化与检查
- 变量、环境
- 请求历史
- Cookie 管理
- 证书管理
- Proxy / **Interceptor**（抓包并落入 Collection；产品页亦列于测试能力）

### 4.2 API 设计

- Spec Hub（API 规范中心）
- 创建 / 导入 API 定义（多格式、多文件）
- 从 Spec 生成 Collection
- Collection 模板
- Schema 文档预览
- Mock Servers
- 第三方集成
- 合同优先治理、规格与代码 / 文档对齐（平台叙事）

### 4.3 文档

- AI 生成文档
- 可定制文档
- 文件夹组织
- 代码示例

### 4.4 协作

- Workspaces：Internal / Partner / Multi-Partner / Public
- API 仓库、文档、**Flows**（可视化工作流）
- API 发现
- 版本控制、行内评论
- Workspace 更新、Changelog、Activity feed
- 角色与权限、团队发现
- 第三方协作集成
- Native Git / **双向 Git 同步**（桌面端本地 Git 与 Cloud）

### 4.5 分发（API Network）

- Public API Network
- Private API Network
- 版本发布、通用搜索
- Team 验证、第三方鉴权集成
- Run in Postman
- 公共 Workspace 指标
- API Gateway 集成

### 4.6 测试

- Collection Runner
- 自动化测试、可复用脚本、动态变量
- AI 生成测试
- 集成 / 回归 / E2E / CI/CD 测试
- **性能测试**
- Postman CLI、CI 集成
- 流水线原生测试（提交时捕获失败等叙事）
- 测试运行摘要

### 4.7 监控

- Monitors
- 监控摘要仪表盘
- API 流量洞察（Insights into API traffic）
- 多区域、静态 IP 白名单
- 性能指标
- Console、第三方集成（可与 Sentry / Datadog / New Relic 等互补）

### 4.8 安全与治理

- Postman Vault（本地密钥；可接第三方 Vault）
- BYOK
- Cloud-first security
- Secret Scanner
- 高级身份管理
- 内置规则库、自定义规则、**自定义治理函数**、Spectral
- 安全与治理报告、审计日志、自定义标签
- 自动化合规扫描（平台叙事）

### 4.9 AI 与自动化

- AI 支持的工作流 / Agent Mode
- Postman MCP Server 与外部 MCP 目录
- CLI + Skills（面向 coding agents：跑 Collection / 测试 / 工作流）
- Context Graph（组织 API / 部署 / Schema 依赖图，可供 Agent 查询）
- 面向人类与 Agent 的可发现、可消费 API（平台叙事）

---

## 5. 横向对比（能力维度）

图例（ApiAdmin 列）：✅ 已覆盖 · ⚠️ 部分 · ❌ 缺失 · 🚫 产品边界外（本 sprint / OSS 定位不做）

| 能力维度       | Apifox                         | MeterSphere V3                           | YApi                            | Postman                    | **ApiAdmin**                                     |
| -------------- | ------------------------------ | ---------------------------------------- | ------------------------------- | -------------------------- | ------------------------------------------------ |
| 接口设计 / OAS | 强（可视化 OAS + 模型）        | 有（定义管理 + 分享）                    | 有（文档编辑）                  | 强（Spec Hub）             | ⚠️ 导入/编辑为主，无可视化 Spec Hub              |
| 调试 Client    | 强（HTTP/gRPC/WS/SOAP/SSE 等） | 强（调试 + 本地/服务端；协议可插件扩展） | 中（类 Postman HTTP）           | 强（多协议含 MQTT/MCP）    | ⚠️ REST 服务端 Run；无本地代理 / 多协议          |
| Mock           | 强（本地/云端/Runner + 期望）  | 有                                       | 强（期望/脚本/严格模式）        | 有（Mock Server）          | ✅ `/mock/:projectId` + 期望 + Gen Mock          |
| 接口自动化     | 强（场景编排 + If/For/Wait）   | 强（场景控制器 + 计划）                  | 中（测试集合 + 服务端 URL）     | 强（Collection/Flows/CLI） | ✅ 集合/流水线 + wait/if/endif + loop            |
| 功能测试管理   | 弱 / 非主线                    | **强**（用例/评审/计划）                 | 无                              | 弱 / 非主线                | 🚫→P3 非主线                                     |
| 缺陷管理       | 无（主线）                     | **强**（含第三方同步）                   | 无                              | 无（主线）                 | ⚠️ 本地 Bug + 外链；无双向同步                   |
| 性能测试       | 有（场景压测，文档标 Beta）    | **V3 已移除**                            | 无                              | 有                         | 🚫                                               |
| 监控           | 有限（Runner/任务向）          | 任务/报告向                              | 无                              | **强**（Monitors）         | ✅ ApiMonitor（探活 + cron + 告警）              |
| 文档发布       | 强（文档站）                   | 有（分享文档）                           | 中（平台内文档）                | 强（Workspace/Network）    | ⚠️ DocumentCenter 生成/发布；门户深度弱于 Apifox |
| 团队权限 / SSO | 有                             | 社区基础 + X-Pack SSO                    | 有（扁平权限；SSO 插件）        | 强（企业能力）             | ⚠️ Group/Project + RBAC；SSO 部分                |
| CLI / CI       | 强（CLI + Runner）             | 有（Jenkins 插件 / 任务）                | 弱（服务端测试 URL / 导入 CLI） | 强                         | ✅ CLI Token + `cicd/run` + JUnit                |
| AI             | 有（自备 Key）                 | 有（内置助手 + 模型配置）                | 无（官方核心）                  | 强（Agent/MCP）            | ✅ Gen Mock / code-fix（规则回退）               |
| 开源可自托管   | 私有化（商业）                 | **开源**（社区/企业）                    | **开源**                        | 云为主（非完整开源平台）   | ✅ Apache-2.0 自托管                             |
| 代码生成       | 强（130+）                     | 非主打                                   | 生态工具                        | SDK/文档示例向             | ❌ 无内置多语言 codegen                          |

---

## 6. 对其它常见同类（简表）

> 「等」类工具，便于对照，非本文主清单。

| 产品                | 一句话            | 典型强项                     |
| ------------------- | ----------------- | ---------------------------- |
| Insomnia            | API Client / 设计 | 本地优先、Git 同步、简洁调试 |
| Hoppscotch          | 开源 API 工具     | 轻量 Web Client、开源自托管  |
| Swagger UI / Editor | 规范可视化        | OAS 编辑与文档展示           |
| Knife4j / springdoc | Java 生态文档     | 与 Spring 集成的文档 UI      |
| JMeter              | 性能 / 协议测试   | 压测与复杂场景脚本           |
| SoapUI / ReadyAPI   | 企业 API 测试     | SOAP/REST、断言与套件        |

---

## 7. ApiAdmin 功能清单（对照竞品后盘点）

> 依据：本仓库 `Server/Router.ts`、`Docs/QUICKSTART_OSS.md`、`Docs/METERSPHERE_PARITY.md`、`Docs/POSTMAN_PARITY_AND_LIFECYCLE.md`（2026-11-07）。  
> 定位：开源自托管 API 生命周期（Import → Interface → Mock → Run → Pipeline/CLI → Monitor）；REST 优先；可选云 AI + 规则回退。

### 7.1 已具备（相对 YApi / Postman 基线）

| 域       | ApiAdmin 能力                                                                                                                                                                       | 对标竞品能力                             |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 组织协作 | Group / Project、成员、关注、动态、迁移/拷贝                                                                                                                                        | YApi 分组项目；MS 组织-项目（简化）      |
| 接口     | CRUD、分类嵌套、批量删除、服务端 Run、搜索                                                                                                                                          | YApi / Postman Request                   |
| Mock     | `/mock/:projectId`；期望（query/body/ip、delay、优先级）；自定义脚本（可关）；AI/规则 Gen Mock                                                                                      | YApi 期望；Apifox 智能 Mock（子集）      |
| 变量环境 | TestEnvironment、项目 globals、legacy sync、`variableResolver` + 脚本沙箱                                                                                                           | Postman env；MS 环境                     |
| 脚本     | `pre_request_script` / `test_script`；`pm.environment` / `pm.variables` / `pm.globals`（`node:vm`）                                                                                 | Postman 脚本（子集）                     |
| 自动化   | TestCollection / TestCase、CASE←接口同步、AutoTestTask 流水线、`wait`/`if`/`endif`、`loop_count`、数据驱动 `iteration_data`、通过阈值、报告导出 HTML/PDF/JUnit/Allure、公开分享链接 | MS 场景/计划（接口向）；Postman Runner   |
| CI/CLI   | CLI Token、`/api/cicd/run` / `run-pipeline` / `sync-swagger`、JUnit                                                                                                                 | Postman CLI；Apifox CLI（子集）          |
| 导入导出 | 导入 Postman / Swagger·OpenAPI（文件或 URL）/ HAR；导出 json / openapi / markdown / html                                                                                            | YApi 导入集；弱于 Apifox 30+             |
| 文档     | DocumentCenter 生成 / 发布 / 版本 / 对比；项目 Docs UI                                                                                                                              | Apifox 文档站（浅）；YApi 文档           |
| 监控     | ApiMonitor CRUD、即时/定时探活、runs、告警路径                                                                                                                                      | Postman Monitors（子集）                 |
| 缺陷     | Bug 本地管理（状态/严重级别/优先级、评论、回收站、`external_url`）；Monitor 失败可一键登记                                                                                          | MeterSphere 缺陷（本地子集；无双向同步） |
| AI       | `generate-mock`、`suggest-code-fix`、设计建议；无 Key 规则回退；密钥不进云提示词                                                                                                    | Apifox/Postman/MS AI（差异化：code-fix） |
| 系统     | SSO 配置框架、第三方登录、邮件、白名单、操作/登录日志、通知、插件框架、项目 Token OpenAPI、代码仓联动                                                                               | 各产品企业能力（部分）                   |

### 7.2 相对竞品仍缺失（需补充 / 明确不做）

按竞品能力维度归纳；**优先级**对齐 OSS sprint（见 `SPRINT_6DAY_CHECKLIST.md`）。

#### P1 — 建议下一迭代补齐（仍在 API 生命周期主线）

| 缺失项                               | 主要对标                    | 说明                                                               |
| ------------------------------------ | --------------------------- | ------------------------------------------------------------------ |
| Mock 条件组 AND/OR、字段名智能规则库 | Apifox / YApi               | 现有期望为简单 filter；缺规则库与组合逻辑                          |
| Mock 严格模式（必填 / Schema 校验）  | YApi                        | 生产 Mock 契约校验                                                 |
| 定时导入 OpenAPI/Swagger             | MeterSphere / Apifox Runner | 已有 `cicd/sync-swagger`；缺项目内 cron 任务 UI                    |
| 测试通用规则（集合级默认断言）       | YApi                        | TestRuleConfig 有雏形，需与集合运行打通并产品化                    |
| 文档门户深度（公开站、密码、布局）   | Apifox / Postman            | DocumentCenter 已发布；缺独立文档站体验                            |
| 可视化断言 / 提取（GUI）             | Apifox / Postman            | 现以脚本为主                                                       |
| 导入保留 Postman pre-request/tests   | Postman                     | 导入格式支持，脚本落库需核对完整性                                 |
| 全局公共脚本库                       | MeterSphere / Postman       | 仅接口/用例级脚本                                                  |
| SSO 认证流闭环（OIDC/SAML 等）       | 全员企业能力                | 配置 UI 有，部分协议仍为部分实现（见 `UNIMPLEMENTED_FEATURES.md`） |

#### P2 — 体验增强

| 缺失项                                    | 主要对标              | 说明                                              |
| ----------------------------------------- | --------------------- | ------------------------------------------------- |
| 本地调试代理 / 浏览器 Interceptor         | Postman / MeterSphere | 仅服务端 Run                                      |
| 场景嵌套引用、CSV 步骤数据集 UI           | MeterSphere / Apifox  | 有 iteration_data；缺 MS 级控制器与 CSV 作用域 UI |
| for / while 循环控制器（非仅 loop_count） | Apifox / MS           | 现有 if/wait/loop_count                           |
| 接口定义分享链接（密码/过期）             | MeterSphere           | 报告可分享；定义分享未产品化                      |
| IDEA / 浏览器插件                         | MeterSphere           | 无                                                |
| 模板管理（用例/缺陷字段）                 | MeterSphere           | 边界偏测试管理，可只做接口模板                    |
| 数据库前后置操作                          | Apifox                | 安全与连接管理成本高                              |
| 多语言代码生成                            | Apifox                | 可接 openapi-generator 外置                       |

#### P3 / 🚫 — 明确延后或不做（本产品边界）

| 缺失项                                           | 主要对标                   | 策略                                           |
| ------------------------------------------------ | -------------------------- | ---------------------------------------------- |
| GraphQL / WebSocket / gRPC / SOAP / SSE / MQTT   | Apifox / Postman           | 🚫 REST-only sprint；插件位预留                |
| 功能用例脑图 / 评审                              | MeterSphere                | 🚫 非 API 生命周期主线                         |
| 缺陷 ↔ Jira/禅道/TAPD 双向同步                   | MeterSphere                | 🚫 现仅 `external_url` 外链；插件同步延后      |
| 性能测试 / 资源池 Runner                         | Apifox / 旧版 MS / Postman | 🚫                                             |
| API Network / Spec Hub / Flows 可视化 / MCP 目录 | Postman                    | P3+                                            |
| 私有化「通用 Runner」独立镜像                    | Apifox                     | 当前单体自托管即可                             |
| 双向 Git Native Sync                             | Postman                    | 已有代码仓 pull / code-fix PR，非完整 Git sync |

### 7.3 与旧「启示」对照（已落地 vs 仍缺）

初版启示中的「优先增量」多数**已落地**，避免重复规划：

| 初版优先项          | 现状                                            |
| ------------------- | ----------------------------------------------- |
| Mock 期望与智能规则 | ✅ 期望 + Gen Mock；⚠️ 规则库 / AND-OR 仍缺     |
| 测试场景编排        | ✅ wait/if/endif + loop；⚠️ 无 for/while/CSV UI |
| CLI                 | ✅                                              |
| 文档门户            | ⚠️ 有 DocumentCenter；深度不足                  |
| 监控告警            | ✅ ApiMonitor                                   |
| 导入生态            | ⚠️ Postman/Swagger/HAR；远少于 Apifox 30+       |

详细 MeterSphere / Postman 逐项矩阵见：

- `Docs/METERSPHERE_PARITY.md`
- `Docs/POSTMAN_PARITY_AND_LIFECYCLE.md`

---

## 8. 复核说明（相对初版补全项）

| 产品        | 本次对照官方后补全的主要缺口                                                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apifox      | SOAP/SSE；环境与服务；自动生成请求；调用外部程序；本地/云端/Runner 三类 Mock；通用 Runner；If/For/Wait；契约测试；性能测试配置细节；数据库类型与 SSH 隧道 |
| MeterSphere | 接口分享与定时导入；场景控制器/CSV/Cookie；项目管理（模板/文件/消息/公共脚本/日志/环境）；协议与 CI 插件清单；工作台；用例回收站与脑图细节                |
| YApi        | Mock 期望字段（IP/延时/状态码）；脚本优先级；变量参数语法；通用规则；Jenkins 向服务端测试；生态工具表述                                                   |
| Postman     | Flows；Interceptor；双向 Git；监控流量洞察；自定义治理函数；Vault 第三方集成；平台对比页能力对齐                                                          |

> MeterSphere 文档站偶发 500；场景 / 项目管理 / 插件等条目以检索到的官方手册页内容为准，并交叉 GitHub README。细粒度 UI 字段以各手册页面为准，本文覆盖产品级能力清单而非逐字段操作手册。

---

## 9. 参考链接

- Apifox 帮助中心：https://docs.apifox.com/
- Apifox 产品介绍：https://docs.apifox.com/introduction
- Apifox Mock：https://docs.apifox.com/mock
- Apifox 自动化测试：https://docs.apifox.com/automated-testing
- Apifox 性能测试：https://docs.apifox.com/performance-testing
- Apifox 数据库操作：https://docs.apifox.com/database
- Apifox 通用 Runner：https://docs.apifox.com/universal-runner
- Apifox SSE：https://docs.apifox.com/sse
- Apifox AI：https://docs.apifox.com/apifox-ai
- Apifox 代码生成：https://docs.apifox.com/generate-code
- MeterSphere V3 文档首页：https://metersphere.io/docs/v3.x/
- MeterSphere 接口定义：https://metersphere.io/docs/v3.x/user_manual/api_test/api_definition/
- MeterSphere 场景管理：https://metersphere.io/docs/v3.x/user_manual/api_test/api_automation/
- MeterSphere 测试用例 / 计划 / 缺陷：`user_manual/test_case/`、`test_plan/`、`defect_management/`
- MeterSphere 项目管理：https://metersphere.io/docs/v3.x/user_manual/project_management/overview/
- MeterSphere 插件列表：https://metersphere.io/docs/v3.x/plugin/
- MeterSphere X-Pack：https://metersphere.io/docs/v3.x/user_manual/x-pack/intro/
- MeterSphere GitHub：https://github.com/metersphere/metersphere
- YApi 文档：https://hellosean1025.github.io/yapi/
- YApi Mock / 高级 Mock / 自动化测试：`documents/mock.html`、`adv_mock.html`、`case.html`
- YApi GitHub：https://github.com/YMFE/yapi
- Postman Product：https://www.postman.com/product/
- Postman Platform：https://www.postman.com/platform/
- Postman Learning Docs：https://learning.postman.com/docs/
- ApiAdmin Quick Start：`Docs/QUICKSTART_OSS.md`
- ApiAdmin × MeterSphere：`Docs/METERSPHERE_PARITY.md`
- ApiAdmin × Postman：`Docs/POSTMAN_PARITY_AND_LIFECYCLE.md`
- ApiAdmin 未实现清单（历史）：`Docs/UNIMPLEMENTED_FEATURES.md`
