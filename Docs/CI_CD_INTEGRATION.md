# CI/CD 集成指南

本文档介绍如何在 CI/CD 流程中集成 ApiAdmin 的 API 测试功能。

## 目录

- [GitHub Actions 集成](#github-actions-集成)
- [GitLab CI 集成](#gitlab-ci-集成)
- [Jenkins 集成](#jenkins-集成)
- [报告格式](#报告格式)
- [通用规则配置](#通用规则配置)

---

## GitHub Actions 集成

### 1. 使用模板

项目已提供 GitHub Actions 工作流模板：`.github/workflows/api-test.yml`

### 2. 配置 Secrets

在 GitHub 仓库设置中添加以下 Secrets：

- `APIADMIN_URL`: ApiAdmin 服务器地址（如：`https://apiadmin.example.com`）
- `APIADMIN_TOKEN`: CLI Token（在 ApiAdmin 中生成）
- `TEST_COLLECTION_ID`: 测试集合 ID
- `SLACK_WEBHOOK_URL`（可选）: Slack 通知 Webhook URL

### 3. 配置 Variables

在 GitHub 仓库设置中添加以下 Variables：

- `ENVIRONMENT`: 测试环境（如：`production`、`staging`）

### 4. 使用方式

工作流会在以下情况自动触发：
- 推送到 `main` 或 `develop` 分支
- 创建 Pull Request
- 每天凌晨 2 点（定时任务）
- 手动触发（workflow_dispatch）

---

## GitLab CI 集成

### 1. 使用模板

1. 复制 `.gitlab-ci.yml.template` 为 `.gitlab-ci.yml`
2. 根据项目需求修改配置

### 2. 配置 CI/CD Variables

在 GitLab 项目的 CI/CD Settings 中添加以下 Variables：

- `APIADMIN_URL`: ApiAdmin 服务器地址
- `APIADMIN_TOKEN`: CLI Token
- `TEST_COLLECTION_ID`: 测试集合 ID
- `ENVIRONMENT`: 测试环境（默认：`production`）
- `SWAGGER_URL`（可选）: Swagger 文档 URL
- `PROJECT_ID`（可选）: 项目 ID（用于 Swagger 同步）

### 3. 使用方式

- 推送到 `main` 或 `develop` 分支时自动执行
- 在 Merge Request 中执行
- 可以手动触发 Swagger 同步任务

---

## Jenkins 集成

### 1. 使用模板

1. 复制 `Jenkinsfile.template` 为 `Jenkinsfile`
2. 根据项目需求修改配置

### 2. 配置 Credentials

在 Jenkins 中配置以下 Credentials：

- `apiadmin-url`: ApiAdmin 服务器地址
- `apiadmin-token`: CLI Token
- `test-collection-id`: 测试集合 ID

### 3. 配置 Pipeline

1. 在 Jenkins 中创建新的 Pipeline 任务
2. 选择 "Pipeline script from SCM"
3. 配置 Git 仓库和分支
4. 脚本路径设置为 `Jenkinsfile`

### 4. 可选参数

- `ENVIRONMENT`: 测试环境（默认：`production`）
- `SYNC_SWAGGER`: 是否同步 Swagger（布尔值）
- `SWAGGER_URL`: Swagger 文档 URL
- `PROJECT_ID`: 项目 ID

---

## 报告格式

ApiAdmin 支持多种测试报告格式：

### 1. JSON 格式（默认）

```bash
curl -X POST "$APIADMIN_URL/api/cicd/test/run" \
  -H "Authorization: Bearer $APIADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collectionId": "collection-id",
    "environment": "production",
    "format": "json"
  }'
```

### 2. JUnit XML 格式

```bash
curl -X POST "$APIADMIN_URL/api/cicd/test/run" \
  -H "Authorization: Bearer $APIADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collectionId": "collection-id",
    "environment": "production",
    "format": "junit"
  }' \
  -o test-results.xml
```

JUnit XML 格式兼容：
- Jenkins JUnit Plugin
- GitLab CI Test Reports
- GitHub Actions Test Results
- 其他支持 JUnit 格式的工具

### 3. Allure 格式

```bash
curl -X POST "$APIADMIN_URL/api/cicd/test/run" \
  -H "Authorization: Bearer $APIADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "collectionId": "collection-id",
    "environment": "production",
    "format": "allure"
  }'
```

Allure 格式返回 JSON 数组，每个元素是一个测试用例的 Allure 结果。

---

## 通用规则配置

通用规则配置允许您为项目定义可重用的测试规则，包括断言规则、请求配置和响应配置。

### API 端点

#### 获取规则列表

```bash
GET /api/test/rules?projectId={projectId}&type={type}
```

参数：
- `projectId`（必需）: 项目 ID
- `type`（可选）: 规则类型（`assertion`、`request`、`response`）

#### 创建规则

```bash
POST /api/test/rules
Content-Type: application/json

{
  "projectId": "project-id",
  "name": "默认断言规则",
  "type": "assertion",
  "enabled": true,
  "assertion_rules": {
    "status_code_check": true,
    "response_time_check": true,
    "max_response_time": 5000,
    "response_format_check": true,
    "custom_assertions": [
      {
        "name": "检查响应包含 data 字段",
        "script": "assert.ok(body.data, 'Response should contain data field')",
        "description": "验证响应体包含 data 字段"
      }
    ]
  },
  "description": "默认的断言规则配置"
}
```

#### 更新规则

```bash
PUT /api/test/rules/{id}
Content-Type: application/json

{
  "enabled": false,
  "assertion_rules": {
    "max_response_time": 3000
  }
}
```

#### 删除规则

```bash
DELETE /api/test/rules/{id}
```

### 规则类型

#### 1. 断言规则（assertion）

用于定义通用的断言逻辑：

- `status_code_check`: 是否检查状态码
- `response_time_check`: 是否检查响应时间
- `max_response_time`: 最大响应时间（毫秒）
- `response_format_check`: 是否检查响应格式
- `custom_assertions`: 自定义断言脚本数组

#### 2. 请求配置（request）

用于定义通用的请求配置：

- `timeout`: 请求超时时间（毫秒）
- `retry_count`: 重试次数
- `retry_delay`: 重试延迟（毫秒）
- `follow_redirects`: 是否跟随重定向
- `verify_ssl`: 是否验证 SSL 证书
- `default_headers`: 默认请求头

#### 3. 响应配置（response）

用于定义通用的响应处理：

- `validate_schema`: 是否验证响应 Schema
- `extract_variables`: 变量提取配置数组

---

## CLI 工具（待实现）

未来将提供 `@apiadmin/cli` npm 包，支持以下命令：

```bash
# 安装
npm install -g @apiadmin/cli

# 配置
apiadmin config set url https://apiadmin.example.com
apiadmin config set token your-token

# 运行测试
apiadmin test --collection collection-id --env production --output junit --file test-results.xml

# Swagger 同步
apiadmin sync --url https://api.example.com/swagger.json --project project-id --mode smart

# 导出数据
apiadmin export --project project-id --format json --file export.json

# 导入数据
apiadmin import --file import.json --project project-id
```

---

## 最佳实践

1. **使用环境变量**: 不要在代码中硬编码敏感信息
2. **分离测试环境**: 为不同环境使用不同的测试集合
3. **定期同步**: 设置定时任务自动同步 Swagger 文档
4. **报告归档**: 保留测试报告用于趋势分析
5. **失败通知**: 配置失败时的通知机制（邮件、Slack 等）

---

## 故障排查

### 问题：测试执行失败

1. 检查 `APIADMIN_URL` 和 `APIADMIN_TOKEN` 是否正确
2. 检查网络连接是否正常
3. 查看 ApiAdmin 服务器日志

### 问题：报告格式不正确

1. 确认 `format` 参数值正确（`json`、`junit`、`allure`）
2. 检查测试集合是否存在且包含测试用例

### 问题：Swagger 同步失败

1. 检查 Swagger URL 是否可访问
2. 确认项目 ID 正确
3. 查看同步模式是否合适（`normal`、`smart`、`overwrite`）

---

**最后更新**: 2025-01-27


