#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 修复 npm audit 错误...\n');

const rootDir = path.resolve(__dirname, '..');
const packageLockPath = path.join(rootDir, 'package-lock.json');

try {
  if (fs.existsSync(packageLockPath)) {
    console.log('📦 备份 package-lock.json...');
    const backupPath = `${packageLockPath}.backup.${Date.now()}`;
    fs.copyFileSync(packageLockPath, backupPath);
    console.log(`✅ 已备份到: ${backupPath}\n`);
  }

  console.log('🗑️  删除 package-lock.json...');
  if (fs.existsSync(packageLockPath)) {
    fs.unlinkSync(packageLockPath);
  }
  console.log('✅ 已删除\n');

  console.log('🧹 清理 npm 缓存...');
  try {
    execSync('npm cache clean --force', { stdio: 'inherit', cwd: rootDir });
    console.log('✅ 缓存已清理\n');
  } catch (err) {
    console.log('⚠️  清理缓存时出现警告（可忽略）\n');
  }

  console.log('📦 重新生成 package-lock.json...');
  console.log('   注意: 如果 Node.js 版本低于 18，请先升级 Node.js\n');
  
  try {
    execSync('npm install --package-lock-only --legacy-peer-deps', {
      stdio: 'inherit',
      cwd: rootDir,
      env: { ...process.env, SKIP_PREINSTALL: 'true' }
    });
    console.log('\n✅ package-lock.json 已重新生成\n');
  } catch (err) {
    console.log('\n⚠️  生成 package-lock.json 失败');
    console.log('   可能原因: Node.js 版本过低（需要 >= 18.0.0）\n');
    console.log('   建议: 使用 nvm 升级 Node.js\n');
    process.exit(1);
  }

  console.log('✅ npm audit 修复完成！');
  console.log('   现在可以运行: npm audit\n');
} catch (error) {
  console.error('❌ 修复失败:', error.message);
  process.exit(1);
}

