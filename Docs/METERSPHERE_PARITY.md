# MeterSphere × ApiAdmin 功能对标

**依据**: [定价页](https://metersphere.io/pricing.html) · [产品介绍 PDF 2026](https://fit2cloud.com/metersphere/download/introduce-metersphere_2026.pdf) · [文档 v3.x](https://metersphere.io/docs/v3.x/)  
**产品定位差异**: MeterSphere = 开源**持续测试平台**（测试管理 + 接口 + UI/性能扩展）；ApiAdmin = 开源**API 管理与接口自动化**（YApi/Postman 取向，REST 优先，可选云端 AI）。

> **不宣称「已完整复刻 MeterSphere」**。下表将 MS 社区版能力拆解，标注 ApiAdmin 现状与路线。企业版专属（无容量限制、LDAP/钉钉扫码、多协议插件市场等）单独列出。

图例：✅ 已覆盖 · ⚠️ 部分 · ❌ 未做 · 🚫 明确不做（本产品边界）

---

## 1. MeterSphere 核心能力（归纳）

| 支柱         | 能力要点                                                                    |
| ------------ | --------------------------------------------------------------------------- |
| **AI**       | 生成功能用例 / 接口用例                                                     |
| **测试管理** | 功能用例（Excel/Xmind/脑图）、在线评审、测试计划/计划组、缺陷流程、阈值报告 |
| **接口测试** | 调试（服务端/本地）、定义、CASE、Mock、场景编排（等待/循环/条件）、报告分享 |
| **团队协作** | 系统–组织–项目、权限、模板、文件、消息、公共脚本、环境、操作日志            |
| **插件**     | 浏览器/IDEA/Jenkins；企业版 WebSocket/MQTT/Thrift/gRPC、JIRA 等             |
| **企业版**   | 多组织/多用户/高并发资源池、SSO、主题、插件市场                             |

---

## 2. 对照矩阵

### 2.1 接口测试（对标主战场）

| MeterSphere                 | ApiAdmin                                      | 状态  | 说明 / 补齐计划                                                                  |
| --------------------------- | --------------------------------------------- | ----- | -------------------------------------------------------------------------------- |
| 接口定义（可视化 CRUD）     | Interface + Cat + OpenAPI 导入                | ✅    |                                                                                  |
| 接口调试 · 服务端执行       | `POST /api/interface/run`                     | ✅    |                                                                                  |
| 接口调试 · 本地执行（代理） | —                                             | ❌    | P2：浏览器扩展 / 本地 agent                                                      |
| 接口 Mock（条件响应）       | MockExpectation + Gen Mock                    | ✅    | MS AND/OR 规则 → 后续增强 filter 运算                                            |
| 单接口用例                  | TestCase                                      | ✅    |                                                                                  |
| CASE 随接口变更一键同步     | `POST /api/test/case/:id/sync-from-interface` | ✅    | 测试集合 CASE「同步接口」                                                        |
| 场景自动化 · 多步骤编排     | TestCollection / AutoTestTask 顺序步骤        | ⚠️    | 流水线支持 wait/if/endif 控制步骤                                                |
| 场景 · 等待 / 循环 / 条件   | wait / if / endif + `loop_count`              | ✅    | 条件可用 `last.status_code`；loop 为请求重复次数                                 |
| 场景嵌套引用                | —                                             | ❌    | P2                                                                               |
| 接口报告 · 导出             | HTML/PDF/JUnit/Allure                         | ✅    |                                                                                  |
| 接口报告 · **一键分享**     | 公开分享链接                                  | ✅    | `POST /api/auto-test/results/:id/share` → `/api/public/auto-test/reports/:token` |
| 多协议（WS/MQTT/gRPC…）     | REST only                                     | 🚫→P3 | OSS sprint 明确 REST；插件位预留                                                 |
| 资源池 / 高并发执行节点     | 单进程调度                                    | 🚫    | 非 ApiAdmin 定位；可用外部 runner                                                |

### 2.2 测试管理

| MeterSphere                  | ApiAdmin                                          | 状态 | 说明                                             |
| ---------------------------- | ------------------------------------------------- | ---- | ------------------------------------------------ |
| 功能用例（Excel/Xmind/脑图） | —                                                 | ❌   | P3 独立「用例库」模块或对接外部 TM               |
| AI 生成功能用例              | AI 偏 Mock / code-fix                             | ⚠️   | 可扩展 prompt；非脑图用例                        |
| 用例在线评审                 | —                                                 | ❌   | P3                                               |
| 测试计划 / 计划组            | AutoTestTask + schedule/webhook                   | ⚠️   | 覆盖「接口计划」；无跨类型计划组                 |
| 缺陷管理 / 第三方同步        | Bug（本地 CRUD + 评论 + 回收站 + `external_url`） | ⚠️   | ✅ 本地缺陷；外链 Jira/禅道/TAPD；无双向同步插件 |
| 阈值判定 + 报告总结          | `pass_threshold.min_pass_rate` + AI 分析          | ⚠️   | 阈值已落地；总结仍靠可选 AI                      |

### 2.3 团队协作与系统

| MeterSphere        | ApiAdmin                     | 状态                                   |
| ------------------ | ---------------------------- | -------------------------------------- |
| 组织 / 多租户      | Group + Project              | ⚠️ 单层组织感，非 MS「系统-组织-项目」 |
| 用户 / 权限        | RBAC + 项目成员              | ✅                                     |
| 环境管理           | TestEnvironment + 项目变量   | ✅                                     |
| 操作日志           | OperationLog                 | ✅                                     |
| 消息 / 通知        | Notification + webhook/email | ⚠️                                     |
| 公共脚本           | 前后置脚本（沙箱）           | ⚠️ 无全局脚本库                        |
| 模板管理           | —                            | ❌ P2                                  |
| 文件管理           | Upload                       | ⚠️                                     |
| 插件体系           | Plugin 框架                  | ⚠️                                     |
| SSO / LDAP / 扫码  | SSO/OIDC 等部分              | ⚠️ 见 UNIMPLEMENTED                    |
| CI/CD              | CLI token + Jenkins 可用 API | ✅                                     |
| 浏览器 / IDEA 插件 | —                            | ❌ P2                                  |

### 2.4 明确不在近期范围

| 能力                      | 原因                                         |
| ------------------------- | -------------------------------------------- |
| UI 自动化（Selenium）     | 产品边界：API 平台，非 MS 全栈 TM            |
| 性能测试（JMeter 资源池） | 边界外；可用外部压测工具 + ApiAdmin 导出用例 |
| 企业版容量/主题/插件市场  | 商业能力；开源侧不承诺 1:1                   |

---

## 3. 补齐优先级（ApiAdmin）

### P0（本迭代）

1. ~~**测试报告一键分享**（对标 MS 接口报告分享）~~ ✅
2. 本文档 + README 入口，避免「虚假全覆盖」表述

### P1（下一迭代）

1. ~~场景步骤：`wait` / `if` / `loop`（AutoTestTask + runner）~~ ✅
2. ~~CASE ← 接口定义一键同步（method/path/headers 模板）~~ ✅
3. ~~测试计划通过阈值（summary 配置 + 报告状态）~~ ✅（`pass_threshold`）

### P2

1. 本地调试代理 / 浏览器录制导入
2. Mock AND/OR 条件组
3. 全局公共脚本库、用例模板

### P3 / 可选产品线

1. 功能用例库 + 评审
2. 缺陷轻量模型或外链
3. GraphQL / 多协议（独立 sprint）

---

## 4. 结论

- **接口生命周期（定义 · Mock · 调试 · 用例 · 流水线 · CI · AI Mock/修码）**：ApiAdmin 已接近 MS「接口测试」主干，差距集中在**场景控制器、报告分享、本地执行、CASE 同步**。
- **测试管理全链路（功能用例/评审/缺陷/计划组）**与 **UI/性能**：与 ApiAdmin 定位不同，**不作为「全覆盖」验收项**；若业务需要，应单独立项，而非 silently 膨胀本仓库。

验收建议：以 §2.1「接口测试」P0–P1 全绿为「MS 接口测试主干对标完成」；不以 MS 整站功能清单为 DoD。
