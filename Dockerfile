# 阶段1: 构建前端
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY Scripts/ ./Scripts/
RUN ln -s Scripts scripts || true

COPY package*.json ./
RUN SKIP_PREINSTALL=true npm ci

COPY Client/ ./Client/
COPY tsconfig.json tsconfig.node.json vite.config.ts ./

WORKDIR /app/Client
RUN npm ci && npm run build

# 阶段2: 构建后端
FROM node:20-alpine AS backend-builder

WORKDIR /app

COPY Scripts/ ./Scripts/
RUN ln -s Scripts scripts || true

COPY Server/package*.json ./Server/
WORKDIR /app/Server
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci

COPY Server/ ./
COPY Utils/ /app/Utils/
COPY Plugins/ /app/Plugins/
COPY tsconfig.json /app/tsconfig.json

RUN npm run build

# 阶段3: 生产镜像
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production \
    APP_ROOT=/app \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PORT=3000

COPY Scripts/ ./Scripts/
RUN ln -s Scripts scripts || true

COPY Server/package*.json ./Server/
WORKDIR /app/Server
RUN npm ci --omit=dev && npm cache clean --force

WORKDIR /app
COPY --from=frontend-builder /app/Client/dist ./Static
COPY --from=backend-builder /app/Server/dist ./Server/dist
COPY --from=backend-builder /app/Plugins ./Plugins
COPY package.json ./

ARG BUILD_TIME
ARG BUILD_BRANCH
ARG BUILD_COMMIT
ARG APP_VERSION=0.0.1
ARG NODE_VERSION
ARG NPM_VERSION

RUN NODE_VER="${NODE_VERSION:-$(node --version)}" && \
    NPM_VER="${NPM_VERSION:-$(npm --version)}" && \
    if [ -z "$BUILD_TIME" ]; then \
      BUILD_TIME_VAL=$(date +%Y-%m-%d-%H:%M:%S%z 2>/dev/null || date -u +%Y-%m-%d-%H:%M:%S+0000); \
    else \
      BUILD_TIME_VAL="$BUILD_TIME"; \
    fi && \
    echo "build_time=${BUILD_TIME_VAL}" > /app/version && \
    echo "build_branch=${BUILD_BRANCH:-unknown}" >> /app/version && \
    echo "build_commit=${BUILD_COMMIT:-unknown}" >> /app/version && \
    echo "node_version=${NODE_VER}" >> /app/version && \
    echo "npm_version=${NPM_VER}" >> /app/version && \
    echo "app_version=${APP_VERSION:-0.0.1}" >> /app/version && \
    mkdir -p /app/logs /app/uploads && \
    chmod 644 /app/version && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/health',function(r){process.exit(r.statusCode===200?0:1)}).on('error',function(){process.exit(1)})"

WORKDIR /app/Server
CMD ["node", "dist/Server/App.js"]
