# 代码生成插件 (Code Generator)

## 简介

代码生成插件为 ApiAdmin 平台提供接口代码生成功能，支持将接口定义转换为多种编程语言的请求代码，帮助开发者快速集成接口。

## 功能特性

- ✅ 支持 8 种编程语言：cURL、JavaScript、Python、Java、Go、PHP、Ruby、Swift
- ✅ 自动处理请求参数（Query、Body、Headers）
- ✅ 支持环境变量替换
- ✅ 代码格式化输出
- ✅ 一键复制和下载
- ✅ 支持注释生成

## 支持的语言

| 语言 | 标识 | 文件扩展名 |
|------|------|-----------|
| cURL | `curl` | `.sh` |
| JavaScript | `javascript` | `.js` |
| Python | `python` | `.py` |
| Java | `java` | `.java` |
| Go | `go` | `.go` |
| PHP | `php` | `.php` |
| Ruby | `ruby` | `.rb` |
| Swift | `swift` | `.swift` |

## 使用方法

### 在接口详情页使用

1. 打开接口详情页
2. 点击"代码生成"标签页
3. 选择目标编程语言
4. 选择环境（可选）
5. 复制或下载生成的代码

### API 调用

```javascript
POST /api/plugin/code-generator/generate

{
  "interfaceData": {
    "name": "获取用户信息",
    "method": "GET",
    "path": "/api/user/{id}",
    "basePath": "https://api.example.com",
    "query": [
      { "name": "page", "value": "1" }
    ],
    "headers": [
      { "name": "Authorization", "value": "Bearer token" }
    ],
    "body": {
      "type": "json",
      "content": {
        "name": "test"
      }
    }
  },
  "language": "javascript",
  "environment": {
    "baseUrl": "https://api.example.com"
  },
  "includeComments": true
}
```

## 插件配置

在插件设置中可以配置：

- **defaultLanguage**: 默认代码生成语言（默认：javascript）
- **includeComments**: 是否包含注释（默认：true）

## 代码示例

### JavaScript

```javascript
// 获取用户信息

const url = 'https://api.example.com/api/user/123?page=1';

const headers = {
  'Authorization': 'Bearer token'
};

fetch(url, {
  method: 'GET',
  headers: headers
})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### Python

```python
# 获取用户信息

import requests

url = 'https://api.example.com/api/user/123?page=1'

headers = {
  'Authorization': 'Bearer token'
}

response = requests.get(url, headers=headers)
print(response.json())
```

### cURL

```bash
curl -X GET 'https://api.example.com/api/user/123?page=1' \
  -H 'Authorization: Bearer token'
```

## 开发说明

### 目录结构

```
CodeGenerator/
├── manifest.json          # 插件清单
├── Server/                # 服务端代码
│   ├── index.js          # 插件入口
│   ├── Controller.js     # 控制器
│   └── Service.js         # 业务逻辑
├── Client/                # 前端代码
│   ├── index.tsx         # 主组件
│   ├── Components/       # 子组件
│   └── Utils/            # 工具函数
└── README.md             # 文档
```

### 扩展新语言

要添加新的编程语言支持，需要在 `Service.js` 中：

1. 在 `generators` 对象中添加新的生成器方法
2. 实现对应的 `generate{Language}` 方法
3. 在 `manifest.json` 的配置中添加新语言选项

示例：

```javascript
// Service.js
this.generators = {
  // ... 现有语言
  rust: this.generateRust.bind(this)
};

generateRust(interfaceData, options) {
  // 实现 Rust 代码生成逻辑
  return rustCode;
}
```

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

