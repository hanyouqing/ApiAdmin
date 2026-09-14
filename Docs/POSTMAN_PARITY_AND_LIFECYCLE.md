# Postman 核心能力对比与 ApiAdmin 生命周期设计

> 目标：覆盖 Postman 核心能力，并在 **自动化**、**自托管**、**研发全生命周期** 上形成差异化优势。

## 1. 对比矩阵

| Postman 能力 | ApiAdmin 现状 | 目标态 | 阶段 |
|---|---|---|---|
| Collections / Folders | 接口分类 + 测试集合（扁平） | 嵌套分类 + 可导出 Collection | P1 |
| Request Builder (REST) | ✅ 接口编辑 + 调试运行 | 持续增强 | — |
| Environments / Variables | 项目环境 + TestEnvironment 双轨 | 统一作用域：global → project → env → collection → local | P1–P2 |
| Pre-request Scripts | ❌ | `pre_request_script` + `pm`-兼容沙箱 | P1 |
| Tests / Assertions | ✅ assertion_script (node:vm) | 可视化断言 + 脚本并存 | P1–P2 |
| Collection Runner | Test Collection / Test Pipeline | 数据驱动迭代 + CLI | P1 |
| Mock Server | ✅ `/mock/:projectId` | 云端分享可选 | P2 |
| Monitors | Pipeline Cron ≈ Monitor | 外网探活 Monitor + 告警 | P2 |
| Newman / CLI | 文档有、路由未挂 | `apiadmin` CLI + `/api/cicd/*` | P1 |
| Import/Export | ✅ Postman/Swagger/HAR | 保留脚本与环境 | P1–P2 |
| GraphQL / WebSocket / gRPC | ❌ / 未产品化 | 协议扩展 | P3 |
| Flows | ❌ | 可视化流水线（基于 Test Pipeline） | P3 |
| Workspaces | Group/Project | 保留 Group，增强 Workspace 体验 | P2 |
| Spec Hub / Design | 导入导出 + 部分未挂载 | 挂载版本/文档中心 | P2 |
| Real-time collab | yjs 未用 | 可选 | P3 |
| AI | ✅ 生成/分析 | 设计→用例→修复闭环 | P1+ |

## 2. 生命周期融入（优于 Postman 的定位）

```
设计(OpenAPI/接口) → Mock(前后端并行) → 调试(Run)
       ↓
用例/Pipeline(预请求+断言+数据驱动) → CI(CLI/JUnit) → 发布门禁
       ↓
定时监控 + 通知 → AI 失败分析 → 代码仓修复建议 → 回归
```

差异化：
- **自托管**：数据不出境
- **与代码仓/AI 联动**：失败自动分析、修代码建议
- **一套数据**：设计文档即 Mock 即测试
- **CI 原生**：CLI Token + JUnit/Allure，不依赖云端

## 3. 分期交付

### P1（本迭代已落地骨架）
1. 挂载 CICD / Test CRUD 补全 / OpenAPI Token API / SSO 发起与回调
2. 预请求脚本 + 共享脚本沙箱（`pm.environment` / `pm.variables`）
3. 分类 `parent_id` 嵌套
4. 数据驱动：`iteration_data` 跑 Pipeline / Collection
5. 官方 CLI：`npx apiadmin run-collection|run-pipeline`

### P2
- [x] 统一变量作用域与 UI（globals + TestEnvironment + legacy sync）
- [x] Monitor 产品化（独立探活任务 + cron + webhook/email）
- DocumentCenter / InterfaceVersion 挂载
- Postman 导入保留 pre-request/tests

### P3
- GraphQL / WebSocket 客户端
- Flows 可视化
- 实时协作

## 4. 验收标准（P1）

- [x] `POST /api/cicd/run` 可用 CLI Token 跑集合并出 JUnit
- [x] `apiadmin run-collection` / `run-pipeline` CLI 入口
- [x] 用例/接口支持 `pre_request_script` / `test_script`
- [x] 接口分类支持 `parent_id` 父子层级
- [x] `run` / CI 支持 `iteration_data` 数据驱动
- [x] 挂载 Test Collection 更新删除、OpenAPI Token API、SSO 发起/回调
- [x] 统一变量作用域 UI（P2）
- [x] API Monitor CRUD + 定时探活 + 告警（P2）
- [ ] GraphQL / WebSocket（P3）
