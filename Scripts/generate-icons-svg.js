#!/usr/bin/env node

/**
 * 生成 ApiAdmin 项目图标（SVG 格式）
 * 基于 hanyouqing.com 的颜色方案
 * 
 * 颜色方案：
 * - 主色调（绿色）：#16a34a
 * - 主题色（深蓝）：#1a365d
 * - 科技蓝：#2563eb
 * - 背景渐变：从 #1a365d 到 #16a34a
 */

const fs = require('fs');
const path = require('path');

// 图标尺寸配置
const iconSizes = [
  { size: 16, name: 'favicon-16x16.svg' },
  { size: 32, name: 'favicon-32x32.svg' },
  { size: 48, name: 'icon-48x48.svg' },
  { size: 64, name: 'icon-64x64.svg' },
  { size: 96, name: 'icon-96x96.svg' },
  { size: 128, name: 'icon-128x128.svg' },
  { size: 144, name: 'icon-144x144.svg' },
  { size: 152, name: 'apple-touch-icon-152x152.svg' },
  { size: 180, name: 'apple-touch-icon-180x180.svg' },
  { size: 192, name: 'icon-192x192.svg' },
  { size: 256, name: 'icon-256x256.svg' },
  { size: 384, name: 'icon-384x384.svg' },
  { size: 512, name: 'icon-512x512.svg' },
  { size: 1024, name: 'icon-1024x1024.svg' },
];

// SVG 模板 - 创建带渐变背景和 "AA" 文字的图标
function createIconSVG(size) {
  const fontSize = Math.floor(size * 0.35);
  const letterSpacing = Math.floor(size * 0.03);
  const borderRadius = Math.floor(size * 0.15);
  const gradientId = `grad${size}`;
  const filterId = `shadow${size}`;
  
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1a365d;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1" />
    </linearGradient>
    <filter id="${filterId}">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" rx="${borderRadius}" fill="url(#${gradientId})"/>
  <text 
    x="50%" 
    y="50%" 
    font-family="Inter, system-ui, sans-serif" 
    font-size="${fontSize}" 
    font-weight="700" 
    fill="#ffffff" 
    text-anchor="middle" 
    dominant-baseline="central"
    letter-spacing="${letterSpacing}"
    filter="url(#${filterId})"
  >AA</text>
</svg>`;
}

// 生成单个图标
function generateIcon(size, filename) {
  const svg = createIconSVG(size);
  const outputPath = path.join(__dirname, '..', 'Static', 'icons', filename);
  
  try {
    fs.writeFileSync(outputPath, svg, 'utf8');
    console.log(`✓ 生成 ${filename} (${size}x${size})`);
    return true;
  } catch (error) {
    console.error(`✗ 生成 ${filename} 失败:`, error.message);
    return false;
  }
}

// 生成 favicon.ico（使用 SVG）
function generateFavicon() {
  const svg = createIconSVG(32);
  const outputPath = path.join(__dirname, '..', 'Static', 'icons', 'favicon.svg');
  
  try {
    fs.writeFileSync(outputPath, svg, 'utf8');
    console.log(`✓ 生成 favicon.svg`);
    return true;
  } catch (error) {
    console.error(`✗ 生成 favicon.svg 失败:`, error.message);
    return false;
  }
}

// 主函数
function main() {
  console.log('开始生成 ApiAdmin 图标（SVG 格式）...\n');
  
  // 确保目录存在
  const imagesDir = path.join(__dirname, '..', 'Static', 'icons');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  // 生成所有尺寸的图标
  const results = iconSizes.map(({ size, name }) => generateIcon(size, name));
  
  // 生成 favicon
  generateFavicon();
  
  // 统计
  const successCount = results.filter(r => r).length;
  console.log(`\n完成！成功生成 ${successCount + 1}/${iconSizes.length + 1} 个图标文件`);
  console.log(`图标文件保存在: ${imagesDir}`);
  console.log(`\n注意：生成的是 SVG 格式，如需 PNG 格式，请使用在线工具转换或安装 sharp 库后运行 generate-icons.js`);
  
  // 生成 README
  const readmeContent = `# ApiAdmin 图标文件

本目录包含 ApiAdmin 项目的各种尺寸图标文件。

## 颜色方案

基于 hanyouqing.com 的设计风格：
- **主色调（绿色）**: #16a34a
- **主题色（深蓝）**: #1a365d
- **科技蓝**: #2563eb

## 图标文件

### Favicon
- \`favicon.svg\` - 浏览器标签页图标（SVG 格式，现代浏览器支持）
- \`favicon-16x16.svg\` - 16x16 像素
- \`favicon-32x32.svg\` - 32x32 像素

### Apple Touch Icons
- \`apple-touch-icon-152x152.svg\` - iOS 152x152
- \`apple-touch-icon-180x180.svg\` - iOS 180x180

### PWA Icons
- \`icon-192x192.svg\` - PWA 192x192
- \`icon-512x512.svg\` - PWA 512x512

### 其他尺寸
- \`icon-48x48.svg\` - 48x48 像素
- \`icon-64x64.svg\` - 64x64 像素
- \`icon-96x96.svg\` - 96x96 像素
- \`icon-128x128.svg\` - 128x128 像素
- \`icon-144x144.svg\` - 144x144 像素
- \`icon-256x256.svg\` - 256x256 像素
- \`icon-384x384.svg\` - 384x384 像素
- \`icon-1024x1024.svg\` - 1024x1024 像素

## 使用方法

在 \`Client/index.html\` 中添加：

\`\`\`html
<link rel="icon" type="image/x-icon" href="/icons/favicon.ico">
<link rel="icon" type="image/svg+xml" href="/icons/favicon.svg">
<link rel="icon" type="image/svg+xml" sizes="32x32" href="/icons/favicon-32x32.svg">
<link rel="icon" type="image/svg+xml" sizes="16x16" href="/icons/favicon-16x16.svg">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.svg">
\`\`\`

## 转换为 PNG

如果需要 PNG 格式的图标，可以使用以下方法：

1. **使用在线工具**：将 SVG 文件上传到 [CloudConvert](https://cloudconvert.com/svg-to-png) 等在线转换工具
2. **使用 Node.js 脚本**：安装 sharp 库后运行 \`node Scripts/generate-icons.js\`
3. **使用 ImageMagick**：\`convert icon.svg icon.png\`

## 重新生成

运行以下命令重新生成所有图标：

\`\`\`bash
node Scripts/generate-icons-svg.js
\`\`\`
`;

  fs.writeFileSync(path.join(imagesDir, 'README.md'), readmeContent);
  console.log(`\n已生成 README.md 说明文件`);
}

// 运行
main();

