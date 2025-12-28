# 阶段1: 构建前端
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# 复制 Scripts 目录（preinstall 脚本需要）
COPY Scripts/ ./Scripts/

# 创建符号链接以兼容 package.json 中的 scripts/ 路径（macOS 不区分大小写，Linux 区分）
RUN ln -s Scripts scripts || true

# 复制 package 文件
COPY package*.json ./

# 安装根目录依赖（跳过 preinstall 脚本，因为 Docker 镜像已使用正确的 Node 版本）
RUN SKIP_PREINSTALL=true npm ci || npm ci

# 复制前端源码和配置文件
COPY Client/ ./Client/
COPY tsconfig.json tsconfig.node.json ./

# 安装前端依赖
WORKDIR /app/Client
RUN npm ci

# 构建前端（在 Client 目录中直接运行构建）
RUN npm run build

# 阶段2: 构建后端
FROM node:20-alpine AS backend-builder

WORKDIR /app

# 复制 Scripts 目录（preinstall 脚本需要）
COPY Scripts/ ./Scripts/

# 创建符号链接以兼容 package.json 中的 scripts/ 路径（macOS 不区分大小写，Linux 区分）
RUN ln -s Scripts scripts || true

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制后端源码
COPY Server/ ./Server/
COPY Plugins/ ./Plugins/

# 阶段3: 生产镜像
FROM node:20-alpine

WORKDIR /app

# 复制 Scripts 目录（preinstall 脚本需要）
COPY Scripts/ ./Scripts/

# 创建符号链接以兼容 package.json 中的 scripts/ 路径（macOS 不区分大小写，Linux 区分）
RUN ln -s Scripts scripts || true

# 安装生产依赖
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# 从构建阶段复制构建产物（检查可能的输出目录）
COPY --from=frontend-builder /app/Client/dist ./Static
COPY --from=backend-builder /app/Server ./Server
COPY --from=backend-builder /app/Plugins ./Plugins

# 创建版本信息文件
# 使用 ARG 传递构建参数（在 docker build 时通过 --build-arg 传递）
ARG BUILD_TIME
ARG BUILD_BRANCH
ARG BUILD_COMMIT
ARG APP_VERSION=0.0.1
ARG NODE_VERSION
ARG NPM_VERSION

# 获取 Node 和 npm 版本（如果未通过 ARG 传递）
RUN NODE_VER="${NODE_VERSION:-$(node --version)}" && \
    NPM_VER="${NPM_VERSION:-$(npm --version)}" && \
    if [ -z "$BUILD_TIME" ]; then \
      BUILD_TIME_VAL=$(date +%Y-%m-%d-%H:%M:%S%z 2>/dev/null || date -u +%Y-%m-%d-%H:%M:%S+0000); \
    else \
      BUILD_TIME_VAL="$BUILD_TIME"; \
    fi && \
    BUILD_BRANCH_VAL="${BUILD_BRANCH:-unknown}" && \
    BUILD_COMMIT_VAL="${BUILD_COMMIT:-unknown}" && \
    APP_VER="${APP_VERSION:-0.0.1}" && \
    echo "build_time=${BUILD_TIME_VAL}" > /app/version && \
    echo "build_branch=${BUILD_BRANCH_VAL}" >> /app/version && \
    echo "build_commit=${BUILD_COMMIT_VAL}" >> /app/version && \
    echo "node_version=${NODE_VER}" >> /app/version && \
    echo "npm_version=${NPM_VER}" >> /app/version && \
    echo "app_version=${APP_VER}" >> /app/version && \
    chmod 644 /app/version

# 创建必要的目录
RUN mkdir -p logs uploads && \
    chmod -R 755 logs uploads

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# 切换到非 root 用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health',function(r){process.exit(r.statusCode===200?0:1)})"

# 启动应用
CMD ["node", "Server/App.js"]

