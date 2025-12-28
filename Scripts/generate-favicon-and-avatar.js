#!/usr/bin/env node

/**
 * 从 icon-1024x1024.svg 生成 favicon.ico 和 icon-64x64.png
 */

const fs = require('fs');
const path = require('path');

// 检查是否安装了 sharp
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('需要安装 sharp 库来生成图标');
  console.error('运行: npm install --save-dev sharp');
  console.error('错误:', e.message);
  process.exit(1);
}

// 检查是否安装了 to-ico
let toIco;
try {
  toIco = require('to-ico');
} catch (e) {
  console.error('需要安装 to-ico 库来生成 favicon.ico');
  console.error('运行: npm install --save-dev to-ico');
  console.error('错误:', e.message);
  process.exit(1);
}

async function generateFaviconAndAvatar() {
  console.log('开始生成 favicon.ico 和 icon-64x64.png...\n');
  
  const sourceSvg = path.join(__dirname, '..', 'Static', 'icons', 'icon-1024x1024.svg');
  const iconsDir = path.join(__dirname, '..', 'Static', 'icons');
  
  // 检查源文件是否存在
  if (!fs.existsSync(sourceSvg)) {
    console.error(`错误: 源文件不存在: ${sourceSvg}`);
    process.exit(1);
  }
  
  // 确保目录存在
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  try {
    // 读取 SVG 文件
    const svgBuffer = fs.readFileSync(sourceSvg);
    
    // 生成 64x64 PNG (用户默认头像)
    console.log('生成 icon-64x64.png...');
    const png64Path = path.join(iconsDir, 'icon-64x64.png');
    await sharp(svgBuffer)
      .resize(64, 64)
      .png()
      .toFile(png64Path);
    console.log(`✓ 生成 icon-64x64.png`);
    
    // 生成 favicon.ico (包含多个尺寸)
    console.log('生成 favicon.ico...');
    const sizes = [16, 32, 48];
    const pngBuffers = await Promise.all(
      sizes.map(async (size) => {
        const buffer = await sharp(svgBuffer)
          .resize(size, size)
          .png()
          .toBuffer();
        return buffer;
      })
    );
    
    const icoBuffer = await toIco(pngBuffers);
    const icoPath = path.join(iconsDir, 'favicon.ico');
    fs.writeFileSync(icoPath, icoBuffer);
    console.log(`✓ 生成 favicon.ico`);
    
    console.log('\n完成！');
    console.log(`文件保存在: ${iconsDir}`);
  } catch (error) {
    console.error('生成失败:', error.message);
    process.exit(1);
  }
}

// 运行
generateFaviconAndAvatar().catch(console.error);

