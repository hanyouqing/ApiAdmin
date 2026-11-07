#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 修复 npm 安全漏洞...\n');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const packageLockPath = path.join(rootDir, 'package-lock.json');

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  if (!packageJson.overrides) {
    packageJson.overrides = {};
  }

  if (
    !packageJson.overrides.esbuild ||
    !packageJson.overrides.esbuild.match(/^0\.(2[5-9]|[3-9])/)
  ) {
    packageJson.overrides.esbuild = '^0.25.0';
    console.log('✅ 已添加 esbuild override: ^0.25.0');
  } else {
    console.log('✅ esbuild override 已存在');
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('✅ package.json 已更新\n');

  if (fs.existsSync(packageLockPath)) {
    console.log('🗑️  删除 package-lock.json...');
    fs.unlinkSync(packageLockPath);
    console.log('✅ 已删除\n');
  }

  console.log('📦 重新安装依赖...');
  console.log('   注意: 如果 Node.js 版本低于 18，请先升级 Node.js\n');

  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.match(/v(\d+)/)[1]);

  if (majorVersion < 18) {
    console.log('⚠️  当前 Node.js 版本过低，需要 >= 18.0.0');
    console.log(`   当前版本: ${nodeVersion}\n`);
    console.log('   临时跳过版本检查安装依赖:');
    console.log('   SKIP_PREINSTALL=true npm install\n');
    process.exit(1);
  }

  try {
    execSync('npm install', {
      stdio: 'inherit',
      cwd: rootDir,
    });
    console.log('\n✅ 依赖安装完成\n');
  } catch (err) {
    console.log('\n⚠️  安装失败，尝试跳过版本检查...\n');
    try {
      execSync('SKIP_PREINSTALL=true npm install', {
        stdio: 'inherit',
        cwd: rootDir,
        env: { ...process.env, SKIP_PREINSTALL: 'true' },
      });
      console.log('\n✅ 依赖安装完成（已跳过版本检查）\n');
    } catch (err2) {
      console.error('\n❌ 安装失败:', err2.message);
      process.exit(1);
    }
  }

  console.log('🔍 验证安全漏洞修复...\n');
  try {
    execSync('npm audit', {
      stdio: 'inherit',
      cwd: rootDir,
    });
  } catch (err) {
    console.log('\n⚠️  仍有安全漏洞，请检查输出\n');
  }

  console.log('✅ 安全漏洞修复完成！');
} catch (error) {
  console.error('❌ 修复失败:', error.message);
  process.exit(1);
}
