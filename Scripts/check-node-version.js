#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIN_NODE_VERSION = 18;
const RECOMMENDED_NODE_VERSION = 20;

function getNodeVersion() {
  try {
    const version = process.version;
    const match = version.match(/v(\d+)\./);
    return match ? parseInt(match[1], 10) : null;
  } catch {
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

    const nvmrcPath = path.join(process.cwd(), '.nvmrc');
    if (fs.existsSync(nvmrcPath)) {
      const nvmrcVersion = fs.readFileSync(nvmrcPath, 'utf8').trim();
      console.log(`   项目推荐使用 Node.js ${nvmrcVersion}\n`);
    }

    const hasNvm = checkNvm() || checkNvmWindows();
    if (hasNvm) {
      console.log(`   nvm install ${RECOMMENDED_NODE_VERSION} && nvm use ${RECOMMENDED_NODE_VERSION}\n`);
    } else {
      console.log(`   请安装 Node.js ${RECOMMENDED_NODE_VERSION}+：https://nodejs.org/\n`);
    }
    process.exit(1);
  }

  if (currentNodeVersion < RECOMMENDED_NODE_VERSION) {
    console.warn(`\n⚠️  建议升级到 Node.js ${RECOMMENDED_NODE_VERSION}.x LTS\n`);
  } else {
    console.log(`✅ Node.js 版本符合要求 (${currentNodeVersion}.x)\n`);
  }

  try {
    const npmVersion = execSync('npm -v', { encoding: 'utf8' }).trim();
    const npmMajor = parseInt(npmVersion.split('.')[0], 10);
    console.log(`当前 npm 版本: ${npmVersion}`);
    if (npmMajor < 9) {
      console.warn(`\n⚠️  建议升级 npm 到 9.x 或更高版本\n`);
    } else {
      console.log(`✅ npm 版本符合要求\n`);
    }
  } catch {
    console.warn('⚠️  无法检测 npm 版本\n');
  }
}

main();
