# Node.js 版本升级指南

## ⚠️ 重要提示

当前项目的依赖需要 **Node.js 18.0.0 或更高版本**，但检测到您当前使用的是 **Node.js 14.21.3**。

## 快速升级

### 方法 1: 使用 nvm (推荐)

如果您已经安装了 nvm：

```bash
# 安装 Node.js 20 LTS
nvm install 20

# 使用 Node.js 20
nvm use 20

# 设置为默认版本
nvm alias default 20

# 验证版本
node -v  # 应该显示 v20.x.x
npm -v   # 应该显示 10.x.x 或更高
```

如果项目根目录有 `.nvmrc` 文件，可以直接运行：

```bash
nvm use
```

### 方法 2: 安装 nvm (如果还没有)

#### macOS/Linux

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载 shell 配置
source ~/.bashrc  # 或 ~/.zshrc

# 安装并使用 Node.js 20
nvm install 20
nvm use 20
nvm alias default 20
```

#### Windows

1. 下载 nvm-windows: https://github.com/coreybutler/nvm-windows/releases
2. 安装后，在命令行运行：

```cmd
nvm install 20
nvm use 20
```

### 方法 3: 直接从官网下载

1. 访问 https://nodejs.org/
2. 下载 Node.js 20.x LTS 版本
3. 按照安装向导完成安装
4. 重启终端/命令行

## 验证安装

升级完成后，请验证版本：

```bash
node -v  # 应该 >= v18.0.0
npm -v   # 应该 >= 9.0.0
```

## 重新安装依赖

Node.js 升级后，需要重新安装依赖：

```bash
# 清理旧的依赖
rm -rf node_modules package-lock.json
rm -rf Client/node_modules Client/package-lock.json
rm -rf Server/node_modules Server/package-lock.json

# 重新安装
npm install
cd Client && npm install
cd ../Server && npm install
```

## 版本要求

- **最低版本**: Node.js 18.0.0
- **推荐版本**: Node.js 20.x LTS
- **npm 版本**: >= 9.0.0

## 为什么需要升级？

项目使用了以下需要 Node.js 18+ 的依赖：

- ESLint 9.x
- TypeScript ESLint 8.x
- Vite 6.x
- Vitest 2.x
- 以及其他现代工具链

这些工具提供了更好的性能、安全性和功能，但需要更新的 Node.js 运行时。

## 常见问题

### Q: 升级 Node.js 会影响其他项目吗？

**A**: 如果使用 nvm，不会。nvm 可以为每个项目使用不同的 Node.js 版本。只需在项目目录运行 `nvm use` 即可。

### Q: 我可以继续使用 Node.js 14 吗？

**A**: 不可以。项目的依赖明确要求 Node.js 18+，使用旧版本会导致安装失败或运行时错误。

### Q: 如何检查当前 Node.js 版本？

**A**: 运行 `node -v` 或 `node --version`

### Q: 升级后 npm 包需要重新安装吗？

**A**: 是的，强烈建议清理并重新安装所有依赖。

## 获取帮助

如果遇到问题，请：

1. 查看项目的 `UPGRADE.md` 文档
2. 检查 Node.js 官网文档: https://nodejs.org/
3. 查看 nvm 文档: https://github.com/nvm-sh/nvm

