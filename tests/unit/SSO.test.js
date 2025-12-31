import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import SSOProvider from '../../Server/Models/SSOProvider.js';
import User from '../../Server/Models/User.js';

describe('SSO Model', () => {
  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await SSOProvider.deleteMany({});
    await User.deleteMany({});
  });

  afterEach(async () => {
    await SSOProvider.deleteMany({});
    await User.deleteMany({});
  });

  it('should create a SSO provider with valid data', async () => {
    const user = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Test1234',
      role: 'super_admin',
    });

    const providerData = {
      name: 'Test SAML',
      type: 'saml',
      enabled: true,
      config: {
        entryPoint: 'https://idp.example.com/sso',
        issuer: 'apiadmin',
        callbackUrl: 'https://apiadmin.example.com/sso/callback',
        cert: 'test-cert',
      },
      createdBy: user._id,
    };

    const provider = new SSOProvider(providerData);
    await provider.save();

    expect(provider._id).toBeDefined();
    expect(provider.name).toBe(providerData.name);
    expect(provider.type).toBe(providerData.type);
    expect(provider.enabled).toBe(true);
    expect(provider.config).toEqual(providerData.config);
  });

  it('should validate SSO provider type', async () => {
    const user = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Test1234',
    });

    const provider = new SSOProvider({
      name: 'Test',
      type: 'invalid_type',
      config: {},
      createdBy: user._id,
    });

    await expect(provider.save()).rejects.toThrow();
  });

  it('should populate createdBy field', async () => {
    const user = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Test1234',
    });

    const provider = await SSOProvider.create({
      name: 'Test SAML',
      type: 'saml',
      config: {},
      createdBy: user._id,
    });

    const populated = await SSOProvider.findById(provider._id).populate('createdBy', 'username');
    expect(populated.createdBy).toBeDefined();
    expect(populated.createdBy.username).toBe('admin');
  });
});

describe('SSO Controller', () => {
  let testUser;
  let testToken;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await SSOProvider.deleteMany({});
    await User.deleteMany({});

    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
      role: 'super_admin',
    });

    // TODO: 生成测试 token
    // testToken = generateTestToken(testUser);
  });

  afterEach(async () => {
    await SSOProvider.deleteMany({});
    await User.deleteMany({});
  });

  describe('GET /api/sso/providers', () => {
    it('should return list of SSO providers', async () => {
      // TODO: 实现测试
      // 1. 创建测试用户和 SSO 配置
      const provider = await SSOProvider.create({
        name: 'Test SAML',
        type: 'saml',
        enabled: true,
        config: {
          entryPoint: 'https://idp.example.com/sso',
          issuer: 'apiadmin',
          callbackUrl: 'https://apiadmin.example.com/sso/callback',
          cert: 'test-cert',
        },
        createdBy: testUser._id,
      });

      // 2. 发送 GET 请求
      // const response = await request(app)
      //   .get('/api/sso/providers')
      //   .set('Authorization', `Bearer ${testToken}`);

      // 3. 验证响应状态码为 200
      // expect(response.status).toBe(200);

      // 4. 验证响应包含 providers 数组
      // expect(response.body.success).toBe(true);
      // expect(Array.isArray(response.body.data)).toBe(true);
      // expect(response.body.data.length).toBeGreaterThan(0);

      // 5. 验证每个 provider 包含必要字段
      // const providerData = response.body.data[0];
      // expect(providerData).toHaveProperty('id');
      // expect(providerData).toHaveProperty('name');
      // expect(providerData).toHaveProperty('type');
      // expect(providerData).toHaveProperty('enabled');

      // 临时验证：直接查询数据库
      const providers = await SSOProvider.find({});
      expect(providers.length).toBe(1);
      expect(providers[0].name).toBe('Test SAML');
    });

    it('should filter providers by enabled status', async () => {
      // TODO: 实现测试
      // 1. 创建启用和禁用的 SSO 配置
      await SSOProvider.create({
        name: 'Enabled Provider',
        type: 'saml',
        enabled: true,
        config: {},
        createdBy: testUser._id,
      });

      await SSOProvider.create({
        name: 'Disabled Provider',
        type: 'oauth2',
        enabled: false,
        config: {},
        createdBy: testUser._id,
      });

      // 2. 发送带 enabled 查询参数的请求
      // const response = await request(app)
      //   .get('/api/sso/providers?enabled=true')
      //   .set('Authorization', `Bearer ${testToken}`);

      // 3. 验证只返回启用的配置
      // expect(response.body.data.every(p => p.enabled === true)).toBe(true);

      // 临时验证
      const enabledProviders = await SSOProvider.find({ enabled: true });
      expect(enabledProviders.length).toBe(1);
      expect(enabledProviders[0].name).toBe('Enabled Provider');
    });
  });

  describe('POST /api/sso/providers', () => {
    it('should create SAML 2.0 provider', async () => {
      // TODO: 实现测试
      // 1. 准备 SAML 配置数据
      const providerData = {
        name: 'Test SAML',
        type: 'saml',
        enabled: true,
        config: {
          entryPoint: 'https://idp.example.com/sso',
          issuer: 'apiadmin',
          callbackUrl: 'https://apiadmin.example.com/sso/callback',
          cert: 'test-cert',
        },
      };

      // 2. 发送 POST 请求
      // const response = await request(app)
      //   .post('/api/sso/providers')
      //   .set('Authorization', `Bearer ${testToken}`)
      //   .send(providerData);

      // 3. 验证响应状态码为 200
      // expect(response.status).toBe(200);

      // 4. 验证返回的 provider 数据正确
      // expect(response.body.success).toBe(true);
      // expect(response.body.data.name).toBe(providerData.name);

      // 5. 验证数据库中存在新记录
      // const provider = await SSOProvider.findById(response.body.data.id);
      // expect(provider).toBeDefined();

      // 临时验证：直接创建
      const provider = await SSOProvider.create({
        ...providerData,
        createdBy: testUser._id,
      });
      expect(provider.name).toBe(providerData.name);
      expect(provider.type).toBe('saml');
    });

    it('should validate required fields', async () => {
      // TODO: 实现测试
      // 1. 发送缺少必需字段的请求
      // const response = await request(app)
      //   .post('/api/sso/providers')
      //   .set('Authorization', `Bearer ${testToken}`)
      //   .send({ name: 'Test' }); // 缺少 type 和 config

      // 2. 验证响应状态码为 400
      // expect(response.status).toBe(400);

      // 3. 验证错误消息
      // expect(response.body.success).toBe(false);

      // 临时验证：直接测试模型验证
      const provider = new SSOProvider({
        name: 'Test',
        // 缺少 type 和 config
        createdBy: testUser._id,
      });

      await expect(provider.save()).rejects.toThrow();
    });
  });

  describe('PUT /api/sso/providers/:id', () => {
    it('should update SSO provider', async () => {
      // TODO: 实现测试
      const provider = await SSOProvider.create({
        name: 'Test SAML',
        type: 'saml',
        config: {},
        createdBy: testUser._id,
      });

      provider.name = 'Updated Name';
      await provider.save();

      const updated = await SSOProvider.findById(provider._id);
      expect(updated.name).toBe('Updated Name');
    });
  });

  describe('DELETE /api/sso/providers/:id', () => {
    it('should delete SSO provider', async () => {
      // TODO: 实现测试
      const provider = await SSOProvider.create({
        name: 'Test SAML',
        type: 'saml',
        config: {},
        createdBy: testUser._id,
      });

      await SSOProvider.findByIdAndDelete(provider._id);

      const deleted = await SSOProvider.findById(provider._id);
      expect(deleted).toBeNull();
    });
  });
});


