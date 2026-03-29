# ApiAdmin - 实施计划

## 1. 项目概述

本文档基于 [PRD.md](./PRD.md) 和 [ARCHITECTURE.md](./ARCHITECTURE.md) 制定详细的实施计划，指导 ApiAdmin 项目的开发工作。

## 2. 开发阶段规划

### 2.1 第一阶段：基础架构搭建

- [x] 项目初始化和依赖配置
- [x] TypeScript 配置
- [x] Vite 构建配置
- [x] Redux Toolkit 状态管理
- [x] React Router v6 路由配置
- [x] Ant Design 5 集成
- [x] 基础目录结构

### 2.2 第二阶段：核心功能开发

#### 2.2.1 用户与权限模块
- [ ] 用户注册/登录功能
- [ ] JWT 认证机制
- [ ] 权限中间件
- [ ] 用户信息管理
- [ ] 密码重置功能

#### 2.2.2 分组管理模块
- [ ] 分组 CRUD
- [ ] 分组成员管理
- [ ] 分组权限控制
- [ ] 分组列表和搜索

#### 2.2.3 项目管理模块
- [ ] 项目 CRUD
- [ ] 项目设置（环境、Token、全局 Mock）
- [ ] 项目成员管理
- [ ] 项目迁移和拷贝
- [ ] 项目动态日志

#### 2.2.4 接口管理模块
- [ ] 接口分类管理
- [ ] 接口 CRUD
- [ ] 接口编辑（请求参数、返回数据）
- [ ] 接口预览
- [ ] 接口运行/调试
- [ ] 接口搜索和筛选

### 2.3 第三阶段：Mock 服务开发

- [ ] 基础 Mock 引擎（Mockjs）
- [ ] JSON Schema Mock
- [ ] Mock 期望功能
- [ ] 自定义 Mock 脚本
- [ ] Mock 严格模式
- [ ] Mock 服务中间件

### 2.4 第四阶段：自动化测试

- [ ] 测试集合管理
- [ ] 测试用例编辑
- [ ] 变量参数解析
- [ ] 断言脚本执行
- [ ] 测试运行引擎
- [ ] 测试报告生成
- [ ] 服务端测试支持

### 2.5 第五阶段：数据导入导出

- [ ] Postman 导入
- [ ] Swagger 导入（支持 URL 和文件）
- [ ] HAR 导入
- [ ] ApiAdmin JSON 导入
- [ ] JSON 导出
- [ ] Swagger 导出
- [ ] Markdown 导出
- [ ] HTML 导出

### 2.6 第六阶段：插件系统

- [ ] 插件系统架构
- [ ] 插件 Hook 机制
- [ ] 内置插件迁移
- [ ] 插件管理界面
- [ ] 插件开发文档

### 2.7 第七阶段：系统功能完善

- [ ] 项目关注功能
- [ ] 消息通知系统
- [ ] 操作日志
- [ ] 国际化完善
- [ ] 搜索功能优化
- [ ] 用户中心
- [ ] OpenAPI 接口

### 2.8 第八阶段：优化与测试

- [ ] 性能优化
- [ ] 安全加固
- [ ] 单元测试
- [ ] 集成测试
- [ ] E2E 测试
- [ ] 文档完善

## 3. 详细实施步骤

### 3.1 用户与权限模块实施

#### 3.1.1 后端实现

**文件**: `Server/Controllers/User.js`
```javascript
// 用户注册
router.post('/api/user/register', async (ctx) => {
  // 1. 验证邮箱格式
  // 2. 检查邮箱是否已存在
  // 3. 密码加密
  // 4. 创建用户
  // 5. 返回用户信息
});

// 用户登录
router.post('/api/user/login', async (ctx) => {
  // 1. 验证邮箱和密码
  // 2. 生成 JWT Token
  // 3. 设置 Cookie
  // 4. 返回用户信息和 Token
});
```

**文件**: `Server/Middleware/Auth.js` (新建)
```javascript
// 权限验证中间件
async function checkAuth(ctx, next) {
  // 1. 从 Cookie 或 Header 获取 Token
  // 2. 验证 Token
  // 3. 获取用户信息
  // 4. 检查权限
  // 5. 继续执行
}
```

#### 3.1.2 前端实现

**文件**: `Client/Containers/Login/Login.tsx`
```typescript
// 登录页面组件
const Login: React.FC = () => {
  // 1. 表单处理
  // 2. 登录 API 调用
  // 3. Token 存储
  // 4. 路由跳转
};
```

**文件**: `Client/Components/AuthenticatedComponent.tsx`
```typescript
// 路由守卫组件
const AuthenticatedComponent: React.FC = ({ children }) => {
  // 1. 检查登录状态
  // 2. 未登录跳转到登录页
  // 3. 已登录显示内容
};
```

### 3.2 接口管理模块实施

#### 3.2.1 后端实现

**文件**: `Server/Controllers/Interface.js`
```javascript
// 创建接口
router.post('/api/interface/add', async (ctx) => {
  // 1. 验证项目权限
  // 2. 验证接口名称唯一性
  // 3. 创建接口
  // 4. 记录操作日志
  // 5. 返回接口信息
});

// 更新接口
router.put('/api/interface/up', async (ctx) => {
  // 1. 验证权限
  // 2. 更新接口信息
  // 3. WebSocket 通知其他用户
  // 4. 记录操作日志
});
```

#### 3.2.2 前端实现

**文件**: `Client/Containers/Project/Interface/InterfaceList/InterfaceEditForm.tsx`
```typescript
// 接口编辑表单
const InterfaceEditForm: React.FC = () => {
  // 1. 表单字段（路径、方法、参数等）
  // 2. 请求参数编辑器
  // 3. 返回数据编辑器（支持 Mockjs 和 JSON Schema）
  // 4. 保存功能
  // 5. WebSocket 实时协作
};
```

**文件**: `Client/Containers/Project/Interface/InterfaceList/Run/Run.tsx`
```typescript
// 接口运行组件
const Run: React.FC = () => {
  // 1. 环境选择
  // 2. 参数编辑
  // 3. 发送请求
  // 4. 响应展示
  // 5. 保存到测试集合
};
```

### 3.3 Mock 服务实施

#### 3.3.1 Mock 引擎实现

**文件**: `Server/Middleware/mockServer.js`
```javascript
// Mock 服务中间件
async function mockServer(ctx, next) {
  // 1. 解析请求路径，获取项目 ID 和接口路径
  // 2. 查找接口定义
  // 3. 检查 Mock 期望（优先级最高）
  // 4. 执行自定义 Mock 脚本
  // 5. 执行全局 Mock 脚本
  // 6. 生成普通 Mock 数据
  // 7. 返回 Mock 响应
}
```

**文件**: `Core/mockExtra.js`
```javascript
// Mock 数据生成器
class MockGenerator {
  // 基于 Mockjs 生成
  generateFromMockjs(template) { }
  
  // 基于 JSON Schema 生成
  generateFromSchema(schema) { }
  
  // 处理变量替换
  replaceVariables(data, request) { }
}
```

### 3.4 自动化测试实施

#### 3.4.1 测试引擎实现

**文件**: `Server/Controllers/Test.js`
```javascript
// 运行测试
router.post('/api/test/run', async (ctx) => {
  // 1. 获取测试集合
  // 2. 按顺序执行测试用例
  // 3. 解析变量参数
  // 4. 发送请求
  // 5. 执行断言脚本
  // 6. 生成测试报告
  // 7. 返回结果
});
```

**文件**: `Core/testRunner.js` (新建)
```javascript
// 测试运行器
class TestRunner {
  // 执行测试用例
  async runTestCase(testCase, context) {
    // 1. 解析变量参数
    // 2. 构建请求
    // 3. 发送请求
    // 4. 执行断言
    // 5. 返回结果
  }
  
  // 解析变量表达式
  resolveVariable(expression, context) {
    // 支持 $.key.params.path 和 $.key.body.path
  }
  
  // 执行断言脚本
  executeAssertions(script, response, context) {
    // 使用 vm2 安全执行脚本
  }
}
```

## 4. 开发规范

### 4.1 代码规范
- 使用 TypeScript（前端）
- 遵循 ESLint 规则
- 使用 Prettier 格式化
- 组件使用函数式组件 + Hooks
- 使用 Redux Toolkit 进行状态管理

### 4.2 命名规范
- 组件：PascalCase（如 `InterfaceEditForm.tsx`）
- 文件：kebab-case 或 PascalCase（与组件名一致）
- 变量/函数：camelCase
- 常量：UPPER_SNAKE_CASE
- API 路由：kebab-case（如 `/api/user/login`）

### 4.3 Git 提交规范
```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具相关
```

### 4.4 组件开发规范
- 每个组件一个文件
- 使用 TypeScript 定义 Props 类型
- 使用 React.memo 优化性能（如需要）
- 提取公共逻辑到 Hooks
- 样式使用 SCSS 模块化

## 5. 测试策略

### 5.1 单元测试

#### 5.1.1 前端单元测试

**工具**: Vitest + React Testing Library

**测试范围**:
- 工具函数测试
- Redux Reducer 测试
- 组件渲染测试
- Hooks 测试

**示例配置** (vitest.config.ts):
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
      ],
    },
  },
});
```

**测试示例**:
```typescript
// tests/utils/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from '@/utils/format';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2025-01-27');
    expect(formatDate(date)).toBe('2025-01-27');
  });
});

// tests/components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/Button';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

#### 5.1.2 后端单元测试

**工具**: Vitest + Supertest

**测试范围**:
- 工具函数测试
- 控制器测试
- 模型测试
- 中间件测试

**测试示例**:
```javascript
// tests/utils/commons.test.js
import { describe, it, expect } from 'vitest';
import { formatResponse } from '../../Server/Utils/Commons';

describe('formatResponse', () => {
  it('should format success response', () => {
    const result = formatResponse({ data: 'test' });
    expect(result).toEqual({
      errcode: 0,
      errmsg: 'success',
      data: 'test',
    });
  });
});
```

### 5.2 集成测试

#### 5.2.1 API 接口测试

**工具**: Supertest + Jest/Vitest

**测试范围**:
- API 端点测试
- 认证授权测试
- 数据流测试
- 错误处理测试

**测试示例**:
```javascript
// tests/api/user.test.js
import request from 'supertest';
import app from '../../Server/app';

describe('User API', () => {
  let authToken;

  beforeAll(async () => {
    // 登录获取 token
    const res = await request(app)
      .post('/api/user/login')
      .send({ email: 'test@example.com', password: 'password' });
    authToken = res.body.data.token;
  });

  it('should get user info', async () => {
    const res = await request(app)
      .get('/api/user/info')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.data).toHaveProperty('username');
  });
});
```

#### 5.2.2 数据库集成测试

**工具**: MongoDB Memory Server (测试环境)

**测试范围**:
- 数据模型测试
- 数据库操作测试
- 事务测试

**测试示例**:
```javascript
// tests/models/user.test.js
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../../Server/Models/User';

describe('User Model', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('should create a user', async () => {
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword',
    });

    expect(user.username).toBe('testuser');
  });
});
```

### 5.3 E2E 测试

#### 5.3.1 Playwright E2E 测试

**工具**: Playwright

**测试范围**:
- 用户注册登录流程
- 接口创建编辑流程
- Mock 数据生成流程
- 自动化测试流程
- 权限管理流程

**配置文件** (playwright.config.ts):
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**测试示例**:
```typescript
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('user login flow', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/home');
  await expect(page.locator('.user-name')).toContainText('test');
});
```

#### 5.3.2 API E2E 测试

**工具**: Newman (Postman CLI) 或自定义测试脚本

**测试范围**:
- 完整 API 流程测试
- 跨服务集成测试
- 性能测试

### 5.4 CI/CD 自动化测试

#### 5.4.1 GitHub Actions 配置

**.github/workflows/test.yml**:
```yaml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:6.0
        ports:
          - 27017:27017
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          MONGODB_URL: mongodb://localhost:27017/apiadmin_test
          REDIS_URL: redis://localhost:6379
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-results
          path: test-results/
```

#### 5.4.2 GitLab CI 配置

**.gitlab-ci.yml**:
```yaml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"

unit_test:
  stage: test
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run test:unit
    - npm run test:coverage
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

integration_test:
  stage: test
  image: node:${NODE_VERSION}
  services:
    - mongo:6.0
    - redis:7-alpine
  script:
    - npm ci
    - npm run test:integration
  variables:
    MONGODB_URL: "mongodb://mongo:27017/apiadmin_test"
    REDIS_URL: "redis://redis:6379"

e2e_test:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.0-focal
  script:
    - npm ci
    - npm run test:e2e
  artifacts:
    when: always
    paths:
      - test-results/
      - playwright-report/
```

### 5.5 测试覆盖率目标

- **单元测试覆盖率**: ≥ 80%
- **集成测试覆盖率**: ≥ 70%
- **E2E 测试覆盖率**: 核心流程 100%

### 5.6 测试工具和命令

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行 E2E 测试
npm run test:e2e

# 生成覆盖率报告
npm run test:coverage

# 监听模式运行测试
npm run test:watch

# 在 CI 中运行测试
npm run test:ci
```

### 5.7 性能测试

#### 5.7.1 负载测试

**工具**: k6 或 Artillery

**测试场景**:
- API 接口并发测试
- Mock 服务压力测试
- 数据库查询性能测试

**示例配置** (k6-load-test.js):
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  const res = http.get('http://localhost:3000/api/project/list');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

#### 5.7.2 基准测试

**工具**: Autocannon 或 wrk

**测试指标**:
- 请求吞吐量 (QPS)
- 响应时间 (P50, P95, P99)
- 错误率
- 资源使用率

## 6. 部署流程

### 6.1 开发环境
```bash
# 1. 安装依赖
npm install

# 2. 配置数据库
cp config_example.json config.json
# 编辑 config.json

# 3. 初始化数据库
npm run install-server

# 4. 启动开发服务器
npm run dev
```

### 6.2 生产环境
```bash
# 1. 构建前端
npm run build

# 2. 启动服务
npm start

# 或使用 PM2
pm2 start Server/app.js --name api-admin
```

## 7. 里程碑

### 里程碑 1：MVP 版本（4 周）
- 用户注册登录
- 分组和项目管理
- 接口 CRUD
- 基础 Mock 功能
- 接口运行/调试

### 里程碑 2：v0.0.1 版本（8 周）
- 完整权限管理
- 高级 Mock 功能
- 自动化测试
- 数据导入导出
- 插件系统基础

### 里程碑 3：V2.0 版本（12 周）
- 完整插件系统
- 代码生成
- 统计分析
- 性能优化
- 国际化完善

## 8. 风险与应对

### 8.1 技术风险
- **风险**：WebSocket 实时协作稳定性
- **应对**：使用成熟的 WebSocket 库，添加重连机制

### 8.2 性能风险
- **风险**：大量接口数据加载慢
- **应对**：分页加载、虚拟滚动、缓存策略

### 8.3 安全风险
- **风险**：Mock 脚本执行安全
- **应对**：使用 vm2 沙箱环境，限制脚本权限

## 9. 后续优化方向

1. **性能优化**
   - 前端代码分割
   - 后端缓存机制
   - 数据库查询优化

2. **功能增强**
   - 接口版本管理
   - 接口变更通知
   - 团队协作增强

3. **用户体验**
   - 暗色主题
   - 快捷键支持
   - 移动端适配

4. **集成能力**
   - CI/CD 集成
   - 第三方工具集成
   - API 网关集成

---

**文档版本**：v0.0.1
**创建日期**：2025-01-27  
**最后更新**：2025-01-27

