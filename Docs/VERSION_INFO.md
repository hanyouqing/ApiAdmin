# 版本信息功能

## 功能概述

应用在 Docker 构建时会自动生成版本信息文件，并提供 API 端点查询版本信息，方便确认当前部署版本。

## 版本信息内容

版本信息文件 (`/app/version`) 包含以下信息：

- `build_time`: 构建时间（格式：`YYYY-MM-DD-HH:MM:SS+TZ`）
- `build_branch`: Git 分支名称
- `build_commit`: Git commit ID（完整 SHA）
- `node_version`: Node.js 版本
- `npm_version`: npm 版本

## API 端点

### GET /version
### GET /api/version

返回 JSON 格式的版本信息，无需认证。

**响应示例**：
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

## Docker 构建

### 方法 1: 使用构建脚本（推荐）

```bash
npm run build:docker
```

或直接运行：

```bash
bash scripts/build-docker.sh
```

脚本会自动获取 Git 信息并传递给 Docker 构建。

### 方法 2: 手动构建

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

### 方法 3: 使用默认值

如果不传递构建参数，Dockerfile 会使用默认值：

```bash
docker build -t apiadmin:latest .
```

默认值：
- `BUILD_TIME`: 当前时间
- `BUILD_BRANCH`: `unknown`
- `BUILD_COMMIT`: `unknown`

## CI/CD 集成

### GitHub Actions

```yaml
- name: Build Docker image
  run: |
    BUILD_TIME=$(date +%Y-%m-%d-%H:%M:%S%z)
    BUILD_BRANCH=${GITHUB_REF#refs/heads/}
    BUILD_COMMIT=${{ github.sha }}
    
    docker build \
      --build-arg BUILD_TIME="$BUILD_TIME" \
      --build-arg BUILD_BRANCH="$BUILD_BRANCH" \
      --build-arg BUILD_COMMIT="$BUILD_COMMIT" \
      -t apiadmin:${{ github.sha }} .
```

### GitLab CI

```yaml
build:
  script:
    - |
      BUILD_TIME=$(date +%Y-%m-%d-%H:%M:%S%z)
      BUILD_BRANCH=${CI_COMMIT_REF_NAME}
      BUILD_COMMIT=${CI_COMMIT_SHA}
      
      docker build \
        --build-arg BUILD_TIME="$BUILD_TIME" \
        --build-arg BUILD_BRANCH="$BUILD_BRANCH" \
        --build-arg BUILD_COMMIT="$BUILD_COMMIT" \
        -t apiadmin:${CI_COMMIT_SHA} .
```

## 使用场景

1. **部署验证**：部署后访问 `/version` 确认版本是否正确
2. **故障排查**：确认运行的是哪个版本的代码
3. **监控集成**：在监控系统中记录版本信息
4. **日志记录**：在日志中包含版本信息便于追踪

## 注意事项

1. 版本文件在 Docker 构建时创建，包含构建时的信息
2. 如果不在 Git 仓库中构建，分支和提交信息会显示为 `unknown`
3. 版本信息文件位于 `/app/version`，应用启动时读取
4. 版本信息在应用启动时缓存，重启后更新

