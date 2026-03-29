# ApiAdmin - API 实现指南

**文档版本**: 1.0  
**创建日期**: 2025-01-27  
**目标**: 指导如何实现未实现功能的 API

---

## 概述

本文档提供了未实现功能的完整 API 定义、单元测试伪代码和 Swagger 文档。所有内容已准备就绪，可以直接用于功能实现。

---

## 文件结构

### 1. API 定义文档
**文件**: `Docs/API_DEFINITIONS.md`

包含所有未实现功能的完整 API 端点定义，包括：
- 请求方法（GET、POST、PUT、DELETE 等）
- 请求路径
- 请求参数
- 请求体结构
- 响应格式
- 状态码

**使用方式**:
- 参考此文档实现控制器方法
- 参考请求/响应格式实现数据验证
- 参考状态码实现错误处理

### 2. 单元测试伪代码
**文件**: `tests/unit/UnimplementedFeatures.test.js`

包含所有未实现功能的单元测试伪代码，包括：
- 测试用例结构
- 测试场景描述
- 测试数据准备
- 断言验证点

**使用方式**:
- 在实现功能后，将伪代码转换为真实测试
- 参考测试用例确保功能完整性
- 使用测试驱动开发（TDD）方法

### 3. Swagger 定义文件
**文件**: `Server/Utils/swaggerUnimplemented.js`

包含所有未实现功能的 Swagger/OpenAPI 定义，包括：
- 路径定义（paths）
- 组件定义（schemas）
- 响应定义（responses）

**使用方式**:
- 已自动合并到主 Swagger 文档
- 访问 `/swagger` 或 `/swagger.json` 查看完整 API 文档
- 使用 Swagger UI 测试 API

### 4. 主 Swagger 文件
**文件**: `Server/Utils/swagger.js`

已更新，包含：
- 未实现功能的路径定义
- 未实现功能的组件定义
- 新增的标签定义

---

## 实现步骤

### 步骤 1: 创建控制器

根据 `Docs/API_DEFINITIONS.md` 中的 API 定义，创建对应的控制器文件。

**示例**: 实现 SSO 控制器

```javascript
// Server/Controllers/SSO.js
import { BaseController } from './Base.js';

class SSOController extends BaseController {
  static get ControllerName() { return 'SSOController'; }

  static async listProviders(ctx) {
    // TODO: 实现获取 SSO 提供者列表
    // 参考: Docs/API_DEFINITIONS.md - GET /api/sso/providers
  }

  static async createProvider(ctx) {
    // TODO: 实现创建 SSO 提供者
    // 参考: Docs/API_DEFINITIONS.md - POST /api/sso/providers
  }

  // ... 其他方法
}

export default SSOController;
```

### 步骤 2: 创建路由

在 `Server/Router.js` 中添加路由定义。

**示例**: 添加 SSO 路由

```javascript
import SSOController from './Controllers/SSO.js';

// SSO 路由
router.get('/api/sso/providers', apiRateLimiter, authMiddleware, SSOController.listProviders);
router.post('/api/sso/providers', apiRateLimiter, authMiddleware, SSOController.createProvider);
// ... 其他路由
```

### 步骤 3: 创建数据模型

根据 API 定义创建对应的 Mongoose 模型。

**示例**: 创建 SSO 提供者模型

```javascript
// Server/Models/SSOProvider.js
import mongoose from 'mongoose';

const SSOProviderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['saml', 'oauth2', 'oidc', 'ldap', 'cas'],
    required: true
  },
  enabled: { type: Boolean, default: true },
  config: { type: mongoose.Schema.Types.Mixed, required: true },
  roleMapping: { type: mongoose.Schema.Types.Mixed, default: {} },
  autoCreateUser: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model('SSOProvider', SSOProviderSchema);
```

### 步骤 4: 实现单元测试

将 `tests/unit/UnimplementedFeatures.test.js` 中的伪代码转换为真实测试。

**示例**: 实现 SSO 测试

```javascript
// tests/unit/SSO.test.js
import { describe, it, expect, beforeEach } from '@jest/globals';
import SSOProvider from '../../Server/Models/SSOProvider.js';
import User from '../../Server/Models/User.js';

describe('SSO Controller', () => {
  beforeEach(async () => {
    // 清理测试数据
    await SSOProvider.deleteMany({});
  });

  describe('GET /api/sso/providers', () => {
    it('should return list of SSO providers', async () => {
      // 1. 创建测试用户和 SSO 配置
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const provider = await SSOProvider.create({
        name: 'Test SAML',
        type: 'saml',
        enabled: true,
        config: {
          entryPoint: 'https://idp.example.com/sso',
          issuer: 'apiadmin',
          callbackUrl: 'https://apiadmin.example.com/sso/callback',
          cert: '...'
        },
        createdBy: user._id
      });

      // 2. 发送 GET 请求
      const response = await request(app)
        .get('/api/sso/providers')
        .set('Authorization', `Bearer ${token}`);

      // 3. 验证响应状态码为 200
      expect(response.status).toBe(200);

      // 4. 验证响应包含 providers 数组
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // 5. 验证每个 provider 包含必要字段
      const providerData = response.body.data[0];
      expect(providerData).toHaveProperty('id');
      expect(providerData).toHaveProperty('name');
      expect(providerData).toHaveProperty('type');
      expect(providerData).toHaveProperty('enabled');
    });
  });
});
```

### 步骤 5: 验证 Swagger 文档

启动服务器后，访问 `/swagger` 查看 API 文档，确保：
- 所有新 API 端点都显示在文档中
- 请求/响应格式正确
- 参数说明完整

---

## 功能模块实现优先级

### 高优先级（第一阶段）

1. **SSO 单点登录**
   - 控制器: `Server/Controllers/SSO.js`
   - 模型: `Server/Models/SSOProvider.js`
   - 路由: 添加到 `Server/Router.js`
   - 测试: `tests/unit/SSO.test.js`

2. **第三方登录**
   - 控制器: `Server/Controllers/Auth.js` (扩展)
   - 路由: 添加到 `Server/Router.js`
   - 测试: `tests/unit/Auth.test.js` (扩展)

3. **白名单管理**
   - 控制器: `Server/Controllers/Whitelist.js`
   - 模型: `Server/Models/Whitelist.js`
   - 路由: 添加到 `Server/Router.js`
   - 测试: `tests/unit/Whitelist.test.js`

4. **插件系统**
   - 控制器: `Server/Controllers/Plugin.js`
   - 模型: `Server/Models/Plugin.js`
   - 路由: 添加到 `Server/Router.js`
   - 测试: `tests/unit/Plugin.test.js`

### 中优先级（第二阶段）

5. **邮件服务**
6. **CI/CD 集成**
7. **已导入接口自动化测试**
8. **消息通知**
9. **搜索功能**

### 低优先级（第三阶段）

10. **项目关注**
11. **操作日志增强**
12. **用户中心增强**

---

## 注意事项

### 1. 认证和权限

- 所有需要认证的 API 都应使用 `authMiddleware`
- 管理员操作应检查用户角色（`super_admin`）
- 项目相关操作应检查项目权限

### 2. 数据验证

- 使用 `Server/Utils/validation.js` 中的验证函数
- 验证请求参数格式和类型
- 验证业务逻辑（如白名单检查）

### 3. 错误处理

- 使用 `BaseController` 的统一错误处理
- 返回适当的 HTTP 状态码
- 提供清晰的错误消息

### 4. 日志记录

- 使用 `Server/Utils/logger.js` 记录操作日志
- 记录关键操作（创建、更新、删除）
- 记录错误信息

### 5. 测试覆盖

- 为每个 API 端点编写测试用例
- 测试正常流程和异常流程
- 测试权限验证
- 测试数据验证

---

## 参考文档

- **API 定义**: `Docs/API_DEFINITIONS.md`
- **单元测试伪代码**: `tests/unit/UnimplementedFeatures.test.js`
- **Swagger 定义**: `Server/Utils/swaggerUnimplemented.js`
- **PRD 文档**: `Docs/PRD.md`
- **未实现功能列表**: `Docs/UNIMPLEMENTED_FEATURES.md`

---

## 快速开始示例

### 实现 SSO 提供者列表 API

1. **创建模型**:
```javascript
// Server/Models/SSOProvider.js
// 参考上面的示例
```

2. **创建控制器**:
```javascript
// Server/Controllers/SSO.js
import { BaseController } from './Base.js';
import SSOProvider from '../Models/SSOProvider.js';

class SSOController extends BaseController {
  static get ControllerName() { return 'SSOController'; }

  static async listProviders(ctx) {
    try {
      const providers = await SSOProvider.find({})
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 });

      ctx.body = SSOController.success(providers);
    } catch (error) {
      ctx.status = 500;
      ctx.body = SSOController.error('获取 SSO 提供者列表失败');
    }
  }
}

export default SSOController;
```

3. **添加路由**:
```javascript
// Server/Router.js
import SSOController from './Controllers/SSO.js';

router.get('/api/sso/providers', apiRateLimiter, authMiddleware, SSOController.listProviders);
```

4. **编写测试**:
```javascript
// tests/unit/SSO.test.js
// 参考上面的示例
```

5. **验证**:
- 运行测试: `npm test`
- 访问 Swagger: `http://localhost:3000/swagger`
- 测试 API: 使用 Postman 或 Swagger UI

---

**文档版本**：v0.0.1
**创建日期**：2025-01-27  
**最后更新**：2025-01-27

*本文档将随着功能实现而持续更新。*



