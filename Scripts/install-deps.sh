#!/bin/bash

# 安装所有依赖的脚本
# 使用方法: ./scripts/install-deps.sh

set -e

echo "📦 开始安装依赖..."
echo ""

# 检查 Node.js 版本
echo "🔍 检查 Node.js 版本..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ 错误: Node.js 版本过低 (当前: $(node -v))"
    echo "   需要 Node.js >= 18.0.0"
    echo ""
    echo "请先升级 Node.js:"
    echo "  nvm install 20"
    echo "  nvm use 20"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo ""

# 安装根目录依赖
echo "📦 安装根目录依赖..."
npm install

# 安装 Client 依赖
echo ""
echo "📦 安装 Client 依赖..."
cd Client
npm install
cd ..

# 安装 Server 依赖
echo ""
echo "📦 安装 Server 依赖..."
cd Server
npm install
cd ..

echo ""
echo "✅ 所有依赖安装完成！"
echo ""
echo "现在可以运行: npm run dev"

