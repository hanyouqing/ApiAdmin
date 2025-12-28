#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIN_NODE_VERSION = 18;
const RECOMMENDED_NODE_VERSION = 20;

function getNodeVersion() {
  try {
    const version = process.version;
    const match = version.match(/v(\d+)\./);
    return match ? parseInt(match[1], 10) : null;
  } catch (error) {
    return null;
  }
}

function checkNvm() {
  try {
    execSync('command -v nvm', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkNvmWindows() {
  try {
    execSync('where nvm', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (process.env.SKIP_PREINSTALL === 'true') {
    console.log('⚠️  跳过 Node.js 版本检查 (SKIP_PREINSTALL=true)');
    return;
  }

  const currentNodeVersion = getNodeVersion();
  
  console.log('\n🔍 检查 Node.js 版本...\n');
  console.log(`当前 Node.js 版本: ${process.version}`);
  
  if (!currentNodeVersion) {
    console.error('❌ 无法检测 Node.js 版本');
    process.exit(1);
  }
  
  if (currentNodeVersion < MIN_NODE_VERSION) {
    console.error(`\n❌ Node.js 版本过低！`);
    console.error(`   当前版本: ${currentNodeVersion}.x`);
    console.error(`   最低要求: ${MIN_NODE_VERSION}.0.0`);
    console.error(`   推荐版本: ${RECOMMENDED_NODE_VERSION}.x LTS\n`);
    
    console.log('📋 升级指南:\n');
    
    // 检查是否有 .nvmrc 文件
    const nvmrcPath = path.join(process.cwd(), '.nvmrc');
    if (fs.existsSync(nvmrcPath)) {
      const nvmrcVersion = fs.readFileSync(nvmrcPath, 'utf8').trim();
      console.log(`   项目推荐使用 Node.js ${nvmrcVersion}\n`);
    }
    
    // 检查是否安装了 nvm
    const hasNvm = checkNvm() || checkNvmWindows();
    
    if (hasNvm) {
      console.log('   检测到已安装 nvm，可以使用以下命令升级：\n');
      console.log('   # macOS/Linux:');
      console.log(`   nvm install ${RECOMMENDED_NODE_VERSION}`);
      console.log(`   nvm use ${RECOMMENDED_NODE_VERSION}`);
      console.log(`   nvm alias default ${RECOMMENDED_NODE_VERSION}\n`);
      console.log('   # 或者如果项目有 .nvmrc 文件：');
      console.log('   nvm use\n');
    } else {
      console.log('   方法 1: 使用 nvm (推荐)\n');
      console.log('   # 安装 nvm');
      console.log('   # macOS/Linux:');
      console.log('   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash');
      console.log('   # 或访问: https://github.com/nvm-sh/nvm\n');
      console.log('   # Windows:');
      console.log('   # 下载: https://github.com/coreybutler/nvm-windows/releases\n');
      console.log(`   # 然后安装 Node.js ${RECOMMENDED_NODE_VERSION}:`);
      console.log(`   nvm install ${RECOMMENDED_NODE_VERSION}`);
      console.log(`   nvm use ${RECOMMENDED_NODE_VERSION}\n`);
      
      console.log('   方法 2: 直接从官网下载\n');
      console.log(`   访问 https://nodejs.org/ 下载 Node.js ${RECOMMENDED_NODE_VERSION} LTS\n`);
    }
    
    console.log('   升级完成后，请重新运行: npm install\n');
    
    process.exit(1);
  } else if (currentNodeVersion < RECOMMENDED_NODE_VERSION) {
    console.warn(`\n⚠️  建议升级到 Node.js ${RECOMMENDED_NODE_VERSION}.x LTS`);
    console.warn(`   当前版本: ${currentNodeVersion}.x`);
    console.warn(`   推荐版本: ${RECOMMENDED_NODE_VERSION}.x LTS\n`);
  } else {
    console.log(`✅ Node.js 版本符合要求 (${currentNodeVersion}.x >= ${MIN_NODE_VERSION}.0.0)\n`);
  }
  
  // 检查 npm 版本
  try {
    const npmVersion = execSync('npm -v', { encoding: 'utf8' }).trim();
    const npmMajor = parseInt(npmVersion.split('.')[0], 10);
    console.log(`当前 npm 版本: ${npmVersion}`);
    
    if (npmMajor < 9) {
      console.warn(`\n⚠️  建议升级 npm 到 9.x 或更高版本`);
      console.warn(`   运行: npm install -g npm@latest\n`);
    } else {
      console.log(`✅ npm 版本符合要求\n`);
    }
  } catch (error) {
    console.warn('⚠️  无法检测 npm 版本\n');
  }
}

main();

