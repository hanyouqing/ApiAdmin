import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import Plugin from '../../Server/Models/Plugin.js';
import User from '../../Server/Models/User.js';

describe('Plugin Model', () => {
  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await Plugin.deleteMany({});
    await User.deleteMany({});
  });

  afterEach(async () => {
    await Plugin.deleteMany({});
    await User.deleteMany({});
  });

  it('should create plugin with valid data', async () => {
    const user = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Test1234',
    });

    const pluginData = {
      name: 'test-plugin',
      displayName: 'Test Plugin',
      version: '1.0.0',
      description: 'Test plugin description',
      author: 'Test Author',
      license: 'MIT',
      category: 'export',
      enabled: true,
      installed: true,
      dependencies: {},
      routes: [],
      hooks: [],
      permissions: [],
      config: {},
      installedBy: user._id,
    };

    const plugin = new Plugin(pluginData);
    await plugin.save();

    expect(plugin._id).toBeDefined();
    expect(plugin.name).toBe(pluginData.name);
    expect(plugin.version).toBe(pluginData.version);
    expect(plugin.enabled).toBe(true);
  });

  it('should validate plugin category', async () => {
    const user = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Test1234',
    });

    const plugin = new Plugin({
      name: 'test-plugin',
      displayName: 'Test Plugin',
      version: '1.0.0',
      category: 'invalid_category',
      installedBy: user._id,
    });

    await expect(plugin.save()).rejects.toThrow();
  });
});

describe('Plugin Controller', () => {
  let testUser;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await Plugin.deleteMany({});
    await User.deleteMany({});

    testUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Test1234',
      role: 'super_admin',
    });
  });

  afterEach(async () => {
    await Plugin.deleteMany({});
    await User.deleteMany({});
  });

  describe('GET /api/plugins', () => {
    it('should return plugin list', async () => {
      // TODO: 实现测试
      await Plugin.create({
        name: 'test-plugin',
        displayName: 'Test Plugin',
        version: '1.0.0',
        category: 'export',
        enabled: true,
        installed: true,
        installedBy: testUser._id,
      });

      const plugins = await Plugin.find({});
      expect(plugins.length).toBe(1);
      expect(plugins[0].name).toBe('test-plugin');
    });
  });

  describe('POST /api/plugins/install/local', () => {
    it('should install local plugin', async () => {
      // TODO: 实现测试
      // 需要准备插件目录和 manifest.json
      // 验证插件安装成功
    });
  });
});

