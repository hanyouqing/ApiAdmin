# ApiAdmin - 测试指南与覆盖率目标

**文档版本**: 1.0  
**创建日期**: 2025-01-27  
**目标覆盖率**: 接近 100%

---

## 📋 目录

1. [测试策略](#1-测试策略)
2. [覆盖率目标](#2-覆盖率目标)
3. [测试框架](#3-测试框架)
4. [测试类型](#4-测试类型)
5. [编写测试指南](#5-编写测试指南)
6. [运行测试](#6-运行测试)
7. [覆盖率报告](#7-覆盖率报告)
8. [最佳实践](#8-最佳实践)

---

## 1. 测试策略

### 1.1 测试金字塔

```
        /\
       /  \      E2E Tests (少量)
      /____\
     /      \    Integration Tests (适量)
    /________\
   /          \  Unit Tests (大量)
  /____________\
```

### 1.2 测试原则

- **单元测试优先**：确保每个函数、类、组件都有对应的单元测试
- **关键路径全覆盖**：所有业务逻辑、错误处理、边界条件都要测试
- **集成测试补充**：测试模块间的交互和集成
- **E2E 测试验证**：验证关键用户流程

---

## 2. 覆盖率目标

### 2.1 总体目标

- **目标覆盖率**: **接近 100%**
- **当前阶段**: 逐步提升，优先覆盖核心功能

### 2.2 分模块目标

| 模块 | 目标覆盖率 | 优先级 | 状态 |
|------|----------|--------|------|
| **Controllers** | 95%+ | 🔴 高 | 进行中 |
| **Models** | 90%+ | 🔴 高 | 进行中 |
| **Utils** | 95%+ | 🔴 高 | 进行中 |
| **Middleware** | 90%+ | 🟡 中 | 进行中 |
| **Services** | 95%+ | 🔴 高 | 进行中 |
| **Frontend Components** | 85%+ | 🟡 中 | 待开始 |
| **Frontend Utils** | 90%+ | 🟡 中 | 待开始 |

### 2.3 关键路径覆盖率

以下关键路径必须达到 **100% 覆盖率**：

- ✅ 用户认证流程（注册、登录、登出）
- ✅ 权限验证中间件
- ✅ 项目 CRUD 操作
- ✅ 接口 CRUD 操作
- ✅ 测试流水线执行
- ✅ AI 分析服务
- ✅ 代码仓库操作
- ✅ 数据导入导出
- ✅ Mock 服务核心逻辑
- ✅ 错误处理机制

---

## 3. 测试框架

### 3.1 后端测试

- **框架**: [Vitest](https://vitest.dev/)
- **断言库**: Vitest 内置（基于 Chai）
- **Mock 库**: Vitest 内置（基于 Sinon）
- **覆盖率工具**: `@vitest/coverage-v8` (基于 c8/v8)

### 3.2 前端测试

- **框架**: [Vitest](https://vitest.dev/)
- **组件测试**: [@testing-library/react](https://testing-library.com/react)
- **渲染器**: [@testing-library/react](https://testing-library.com/react)

### 3.3 配置文件

- **后端测试配置**: `vitest.config.js` (根目录)
- **前端测试配置**: `Client/vitest.config.ts` (待创建)

---

## 4. 测试类型

### 4.1 单元测试 (Unit Tests)

**位置**: `tests/unit/`

**目标**: 测试单个函数、类、组件的功能

**示例**:
```javascript
// tests/unit/User.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import User from '../../Server/Models/User.js';

describe('User Model', () => {
  it('should create a user with valid data', () => {
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    expect(user.username).toBe('testuser');
  });
});
```

### 4.2 集成测试 (Integration Tests)

**位置**: `tests/integration/`

**目标**: 测试多个模块的交互

**示例**:
```javascript
// tests/integration/Auth.test.js
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../Server/App.js';

describe('Authentication Flow', () => {
  it('should register and login a user', async () => {
    // Register
    const registerRes = await request(app)
      .post('/api/user/register')
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
    expect(registerRes.status).toBe(200);

    // Login
    const loginRes = await request(app)
      .post('/api/user/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.token).toBeDefined();
  });
});
```

### 4.3 E2E 测试 (End-to-End Tests)

**位置**: `tests/e2e/`

**目标**: 测试完整的用户流程

**工具**: Playwright / Cypress (待实现)

---

## 5. 编写测试指南

### 5.1 测试文件命名

- 单元测试: `*.test.js` 或 `*.spec.js`
- 集成测试: `*.integration.test.js`
- E2E 测试: `*.e2e.test.js`

### 5.2 测试结构

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Module Name', () => {
  // Setup
  beforeEach(() => {
    // 每个测试前的准备工作
  });

  // Cleanup
  afterEach(() => {
    // 每个测试后的清理工作
  });

  describe('Feature A', () => {
    it('should do something', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = functionToTest(input);
      
      // Assert
      expect(result).toBe('expected');
    });

    it('should handle error cases', () => {
      // Test error handling
    });
  });
});
```

### 5.3 测试 Controller

```javascript
// tests/unit/Controllers/UserController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserController from '../../../Server/Controllers/User.js';
import User from '../../../Server/Models/User.js';

describe('UserController', () => {
  describe('register', () => {
    it('should register a new user successfully', async () => {
      const ctx = {
        request: {
          body: {
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123'
          }
        },
        body: {}
      };

      await UserController.register(ctx);

      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.user).toBeDefined();
    });

    it('should reject duplicate email', async () => {
      // Test duplicate email handling
    });
  });
});
```

### 5.4 测试 Model

```javascript
// tests/unit/Models/User.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import User from '../../../Server/Models/User.js';

describe('User Model', () => {
  beforeEach(async () => {
    // 清理数据库
    await User.deleteMany({});
  });

  it('should hash password before saving', async () => {
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    await user.save();

    expect(user.password).not.toBe('password123');
    expect(user.password.length).toBeGreaterThan(20);
  });

  it('should validate email format', async () => {
    const user = new User({
      username: 'testuser',
      email: 'invalid-email',
      password: 'password123'
    });

    await expect(user.save()).rejects.toThrow();
  });
});
```

### 5.5 测试 Utils

```javascript
// tests/unit/Utils/validation.test.js
import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword } from '../../../Server/Utils/validation.js';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('invalid-email')).toBe(false);
    });
  });
});
```

---

## 6. 运行测试

### 6.1 运行所有测试

```bash
# 运行所有测试
npm test

# 运行测试（监听模式）
npm test -- --watch

# 运行测试（UI 模式）
npm run test:ui
```

### 6.2 运行特定测试

```bash
# 运行特定文件
npm test -- tests/unit/User.test.js

# 运行匹配模式
npm test -- --grep "User"

# 运行特定目录
npm test -- tests/unit/Controllers/
```

### 6.3 运行覆盖率测试

```bash
# 生成覆盖率报告
npm run test:coverage

# 查看覆盖率报告（HTML）
npm run test:coverage -- --reporter=html
```

---

## 7. 覆盖率报告

### 7.1 查看覆盖率

运行 `npm run test:coverage` 后，会在 `coverage/` 目录生成报告：

```
coverage/
├── index.html          # HTML 报告（浏览器打开）
├── lcov.info           # LCOV 格式（CI/CD 使用）
└── coverage-summary.json # JSON 格式
```

### 7.2 覆盖率指标

- **Statements**: 语句覆盖率
- **Branches**: 分支覆盖率
- **Functions**: 函数覆盖率
- **Lines**: 行覆盖率

### 7.3 CI/CD 集成

在 CI/CD 流程中检查覆盖率：

```yaml
# .github/workflows/test.yml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

---

## 8. 最佳实践

### 8.1 测试编写原则

1. **AAA 模式**: Arrange（准备）、Act（执行）、Assert（断言）
2. **单一职责**: 每个测试只测试一个功能点
3. **独立性**: 测试之间不应该相互依赖
4. **可读性**: 测试名称应该清晰描述测试内容
5. **边界测试**: 测试边界条件和异常情况

### 8.2 测试命名规范

```javascript
// ✅ 好的命名
describe('UserController', () => {
  it('should return user info when valid token is provided', () => {});
  it('should return 401 when token is invalid', () => {});
  it('should return 404 when user does not exist', () => {});
});

// ❌ 不好的命名
describe('UserController', () => {
  it('test1', () => {});
  it('works', () => {});
});
```

### 8.3 Mock 使用

```javascript
// Mock 外部依赖
vi.mock('../../../Server/Utils/email.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(true)
}));

// Mock 数据库操作
vi.spyOn(User, 'findOne').mockResolvedValue(mockUser);
```

### 8.4 测试数据管理

```javascript
// 使用工厂函数创建测试数据
const createTestUser = (overrides = {}) => ({
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  ...overrides
});

// 使用 fixtures
import { testUser, testProject } from '../fixtures';
```

### 8.5 异步测试

```javascript
// ✅ 正确处理异步
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// ✅ 测试 Promise rejection
it('should reject on error', async () => {
  await expect(asyncFunction()).rejects.toThrow();
});
```

---

## 9. 测试检查清单

在提交代码前，确保：

- [ ] 所有新增功能都有对应的测试
- [ ] 所有修改的功能都有更新测试
- [ ] 测试覆盖率没有下降
- [ ] 所有测试都能通过
- [ ] 测试名称清晰描述测试内容
- [ ] 测试代码遵循 AAA 模式
- [ ] 边界条件和异常情况都有测试
- [ ] Mock 使用合理，不依赖外部服务

---

## 10. 持续改进

### 10.1 覆盖率提升计划

1. **第一阶段**（当前）: 核心功能达到 80%+
2. **第二阶段**: 所有功能达到 90%+
3. **第三阶段**: 接近 100%，重点提升分支覆盖率

### 10.2 工具和资源

- [Vitest 文档](https://vitest.dev/)
- [Testing Library 文档](https://testing-library.com/)
- [测试最佳实践](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**最后更新**: 2025-01-27  
**维护者**: ApiAdmin 开发团队


