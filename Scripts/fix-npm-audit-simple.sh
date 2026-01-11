#!/bin/bash

echo "🔧 修复 npm audit 错误..."
echo ""

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "📦 备份 package-lock.json（如果存在）..."
if [ -f "package-lock.json" ]; then
    cp package-lock.json "package-lock.json.backup.$(date +%s)"
    echo "✅ 已备份"
fi

echo ""
echo "🗑️  删除 package-lock.json..."
rm -f package-lock.json
echo "✅ 已删除"

echo ""
echo "🧹 清理 npm 缓存..."
npm cache clean --force 2>/dev/null || true
echo "✅ 缓存已清理"

echo ""
echo "📋 当前环境信息:"
echo "   Node.js: $(node --version 2>/dev/null || echo '未安装')"
echo "   npm: $(npm --version 2>/dev/null || echo '未安装')"

echo ""
echo "⚠️  注意:"
echo "   项目要求 Node.js >= 18.0.0 和 npm >= 9.0.0"
echo "   如果版本不符合要求，请先升级:"
echo "   nvm install 20 && nvm use 20"
echo ""

echo "📦 重新生成 package-lock.json..."
echo "   如果 Node.js 版本符合要求，将自动生成"
echo ""

# 尝试重新生成 package-lock.json
if npm install --package-lock-only --legacy-peer-deps 2>/dev/null; then
    echo ""
    echo "✅ package-lock.json 已重新生成"
    echo "   现在可以运行: npm audit"
else
    echo ""
    echo "❌ 生成失败"
    echo "   可能原因:"
    echo "   1. Node.js 版本过低（需要 >= 18.0.0）"
    echo "   2. npm 版本过低（需要 >= 9.0.0）"
    echo ""
    echo "   解决方案:"
    echo "   使用 nvm 升级: nvm install 20 && nvm use 20"
fi



