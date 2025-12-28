#!/bin/bash

set -e

echo "🐳 构建 Docker 镜像..."

# 获取 Git 信息
BUILD_TIME=$(date +%Y-%m-%d-%H:%M:%S%z)
BUILD_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
BUILD_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")

# 获取应用版本（从 package.json）
APP_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.1")

# 获取 Node 和 npm 版本
NODE_VERSION=$(node --version 2>/dev/null || echo "unknown")
NPM_VERSION=$(npm --version 2>/dev/null || echo "unknown")

echo "📋 构建信息:"
echo "   构建时间: $BUILD_TIME"
echo "   构建分支: $BUILD_BRANCH"
echo "   构建提交: $BUILD_COMMIT"
echo "   应用版本: $APP_VERSION"
echo "   Node 版本: $NODE_VERSION"
echo "   npm 版本: $NPM_VERSION"
echo ""

# 构建 Docker 镜像
docker build \
  --build-arg BUILD_TIME="$BUILD_TIME" \
  --build-arg BUILD_BRANCH="$BUILD_BRANCH" \
  --build-arg BUILD_COMMIT="$BUILD_COMMIT" \
  --build-arg APP_VERSION="$APP_VERSION" \
  --build-arg NODE_VERSION="$NODE_VERSION" \
  --build-arg NPM_VERSION="$NPM_VERSION" \
  -t apiadmin:latest \
  "$@"

echo ""
echo "✅ Docker 镜像构建完成！"
echo "   运行容器后，访问 http://localhost:3000/version 查看版本信息"

