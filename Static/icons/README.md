# ApiAdmin 图标文件

本目录包含 ApiAdmin 项目的各种尺寸图标文件。

## 颜色方案

基于 hanyouqing.com 的设计风格：
- **主色调（绿色）**: #16a34a
- **主题色（深蓝）**: #1a365d
- **科技蓝**: #2563eb

## 图标文件

### Favicon
- `favicon.ico` - 浏览器标签页图标（ICO 格式，包含 16x16、32x32、48x48 多个尺寸）
- `favicon.svg` - 浏览器标签页图标（SVG 格式，现代浏览器支持）
- `favicon-16x16.svg` - 16x16 像素
- `favicon-32x32.svg` - 32x32 像素

### Apple Touch Icons
- `apple-touch-icon-152x152.svg` - iOS 152x152
- `apple-touch-icon-180x180.svg` - iOS 180x180

### PWA Icons
- `icon-192x192.svg` - PWA 192x192
- `icon-512x512.svg` - PWA 512x512

### 其他尺寸
- `icon-48x48.svg` - 48x48 像素
- `icon-64x64.svg` - 64x64 像素
- `icon-64x64.png` - 64x64 像素 PNG（用户默认头像）
- `icon-96x96.svg` - 96x96 像素
- `icon-128x128.svg` - 128x128 像素
- `icon-144x144.svg` - 144x144 像素
- `icon-256x256.svg` - 256x256 像素
- `icon-384x384.svg` - 384x384 像素
- `icon-1024x1024.svg` - 1024x1024 像素

## 使用方法

在 `Client/index.html` 中添加：

```html
<link rel="icon" type="image/x-icon" href="/icons/favicon.ico">
<link rel="icon" type="image/svg+xml" href="/icons/favicon.svg">
<link rel="icon" type="image/svg+xml" sizes="32x32" href="/icons/favicon-32x32.svg">
<link rel="icon" type="image/svg+xml" sizes="16x16" href="/icons/favicon-16x16.svg">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon-180x180.svg">
```

## 转换为 PNG

如果需要 PNG 格式的图标，可以使用以下方法：

1. **使用在线工具**：将 SVG 文件上传到 [CloudConvert](https://cloudconvert.com/svg-to-png) 等在线转换工具
2. **使用 Node.js 脚本**：安装 sharp 库后运行 `node Scripts/generate-icons.js`
3. **使用 ImageMagick**：`convert icon.svg icon.png`

## 重新生成

运行以下命令重新生成所有图标：

```bash
node Scripts/generate-icons-svg.js
```
