#!/usr/bin/env node

/**
 * 生成 ApiAdmin 项目图标
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

// 图标尺寸配置
const iconSizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 48, name: 'icon-48x48.png' },
  { size: 64, name: 'icon-64x64.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 180, name: 'apple-touch-icon-180x180.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 256, name: 'icon-256x256.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 1024, name: 'icon-1024x1024.png' },
];

// 颜色定义
const colors = {
  primary: '#16a34a',      // 绿色
  theme: '#1a365d',        // 深蓝
  tech: '#2563eb',         // 科技蓝
  white: '#ffffff',
  dark: '#1e293b',
};

// SVG 模板 - 创建带渐变背景和 "AA" 文字的图标
function createIconSVG(size) {
  const fontSize = Math.floor(size * 0.4);
  const letterSpacing = Math.floor(size * 0.05);
  
  return `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1a365d;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.2)}" fill="url(#grad)"/>
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
    filter="url(#shadow)"
  >AA</text>
</svg>`;
}

// 生成单个图标
async function generateIcon(size, filename) {
  const svg = createIconSVG(size);
  const outputPath = path.join(__dirname, '..', 'Static', 'icons', filename);
  
  try {
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    
    console.log(`✓ 生成 ${filename} (${size}x${size})`);
    return true;
  } catch (error) {
    console.error(`✗ 生成 ${filename} 失败:`, error.message);
    return false;
  }
}

// 生成 favicon.ico（需要特殊处理）
async function generateFavicon() {
  const svg = createIconSVG(32);
  const outputPath = path.join(__dirname, '..', 'Static', 'icons', 'favicon.ico');
  
  try {
    // 先生成 PNG，然后转换为 ICO
    const pngBuffer = await sharp(Buffer.from(svg))
      .png()
      .resize(32, 32)
      .toBuffer();
    
    // 对于 ICO 格式，我们使用多个尺寸
    const sizes = [16, 32];
    const icoImages = await Promise.all(
      sizes.map(async (size) => {
        const resized = await sharp(Buffer.from(svg))
          .png()
          .resize(size, size)
          .toBuffer();
        return { size, buffer: resized };
      })
    );
    
    // 简单的 ICO 文件格式（只包含 32x32）
    // 注意：这是一个简化版本，完整的 ICO 格式更复杂
    // 实际项目中建议使用专门的库如 to-ico
    await sharp(pngBuffer).toFile(outputPath.replace('.ico', '.png'));
    
    // 创建 ICO 文件（使用 PNG 作为后备）
    fs.writeFileSync(outputPath, pngBuffer);
    console.log(`✓ 生成 favicon.ico`);
    return true;
  } catch (error) {
    console.error(`✗ 生成 favicon.ico 失败:`, error.message);
    return false;
  }
}

// 生成 manifest.json 中使用的图标
async function generateManifestIcons() {
  const manifestIcons = [
    { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
  ];
  return manifestIcons;
}

// 主函数
async function main() {
  console.log('开始生成 ApiAdmin 图标...\n');
  
  // 确保目录存在
  const imagesDir = path.join(__dirname, '..', 'Static', 'icons');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  
  // 生成所有尺寸的图标
  const results = await Promise.all(
    iconSizes.map(({ size, name }) => generateIcon(size, name))
  );
  
  // 生成 favicon
  await generateFavicon();
  
  // 统计
  const successCount = results.filter(r => r).length;
  console.log(`\n完成！成功生成 ${successCount + 1}/${iconSizes.length + 1} 个图标文件`);
  console.log(`图标文件保存在: ${imagesDir}`);
  
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
- \`favicon.ico\` - 浏览器标签页图标
- \`favicon-16x16.png\` - 16x16 像素
- \`favicon-32x32.png\` - 32x32 像素

### Apple Touch Icons
- \`apple-touch-icon-152x152.png\` - iOS 152x152
- \`apple-touch-icon-180x180.png\` - iOS 180x180

### PWA Icons
- \`icon-192x192.png\` - PWA 192x192
- \`icon-512x512.png\` - PWA 512x512

### 其他尺寸
- \`icon-48x48.png\` - 48x48 像素
- \`icon-64x64.png\` - 64x64 像素
- \`icon-96x96.png\` - 96x96 像素
- \`icon-128x128.png\` - 128x128 像素
- \`icon-144x144.png\` - 144x144 像素
- \`icon-256x256.png\` - 256x256 像素
- \`icon-384x384.png\` - 384x384 像素
- \`icon-1024x1024.png\` - 1024x1024 像素

## 使用方法

在 \`Client/index.html\` 中添加：

\`\`\`html
<link rel="icon" type="image/x-icon" href="/icons/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.png">
\`\`\`

## 重新生成

运行以下命令重新生成所有图标：

\`\`\`bash
node Scripts/generate-icons.js
\`\`\`
`;

  fs.writeFileSync(path.join(imagesDir, 'README.md'), readmeContent);
  console.log(`\n已生成 README.md 说明文件`);
}

// 运行
main().catch(console.error);

