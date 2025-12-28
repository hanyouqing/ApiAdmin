import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import Whitelist from '../../Server/Models/Whitelist.js';
import WhitelistConfig from '../../Server/Models/WhitelistConfig.js';
import User from '../../Server/Models/User.js';

describe('Whitelist Model', () => {
  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await Whitelist.deleteMany({});
    await WhitelistConfig.deleteMany({});
    await User.deleteMany({});
  });

  afterEach(async () => {
    await Whitelist.deleteMany({});
    await WhitelistConfig.deleteMany({});
    await User.deleteMany({});
  });

  it('should create a whitelist entry with valid data', async () => {
    const user = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Test1234',
    });

    const entryData = {
      platform: 'github',
      value: 'octocat',
      description: 'GitHub user',
      enabled: true,
      createdBy: user._id,
    };

    const entry = new Whitelist(entryData);
    await entry.save();

    expect(entry._id).toBeDefined();
    expect(entry.platform).toBe(entryData.platform);
    expect(entry.value).toBe(entryData.value);
    expect(entry.enabled).toBe(true);
  });

  it('should validate platform type', async () => {
    const user = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Test1234',
    });

    const entry = new Whitelist({
      platform: 'invalid_platform',
      value: 'test',
      createdBy: user._id,
    });

    await expect(entry.save()).rejects.toThrow();
  });

  it('should enforce unique constraint on platform and value', async () => {
    const user = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Test1234',
    });

    await Whitelist.create({
      platform: 'github',
      value: 'octocat',
      createdBy: user._id,
    });

    const duplicate = new Whitelist({
      platform: 'github',
      value: 'octocat',
      createdBy: user._id,
    });

    await expect(duplicate.save()).rejects.toThrow();
  });
});

describe('WhitelistConfig Model', () => {
  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await WhitelistConfig.deleteMany({});
  });

  afterEach(async () => {
    await WhitelistConfig.deleteMany({});
  });

  it('should get or create config', async () => {
    const config = await WhitelistConfig.getConfig();
    expect(config).toBeDefined();
    expect(config.enabled).toBe(false);
    expect(Array.isArray(config.platforms)).toBe(true);
  });

  it('should update config', async () => {
    const config = await WhitelistConfig.updateConfig({
      enabled: true,
      platforms: ['github', 'gitlab'],
    });

    expect(config.enabled).toBe(true);
    expect(config.platforms).toContain('github');
    expect(config.platforms).toContain('gitlab');
  });
});

describe('Whitelist Controller', () => {
  let testUser;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await Whitelist.deleteMany({});
    await WhitelistConfig.deleteMany({});
    await User.deleteMany({});

    testUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Test1234',
      role: 'super_admin',
    });
  });

  afterEach(async () => {
    await Whitelist.deleteMany({});
    await WhitelistConfig.deleteMany({});
    await User.deleteMany({});
  });

  describe('GET /api/whitelist/config', () => {
    it('should return whitelist configuration', async () => {
      // TODO: 实现测试
      const config = await WhitelistConfig.getConfig();
      expect(config).toBeDefined();
      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('platforms');
    });
  });

  describe('POST /api/whitelist/entries', () => {
    it('should add whitelist entry', async () => {
      // TODO: 实现测试
      const entry = await Whitelist.create({
        platform: 'github',
        value: 'octocat',
        description: 'GitHub user',
        enabled: true,
        createdBy: testUser._id,
      });

      expect(entry._id).toBeDefined();
      expect(entry.platform).toBe('github');
      expect(entry.value).toBe('octocat');
    });

    it('should validate platform type', async () => {
      // TODO: 实现测试
      const entry = new Whitelist({
        platform: 'invalid_platform',
        value: 'test',
        createdBy: testUser._id,
      });

      await expect(entry.save()).rejects.toThrow();
    });
  });

  describe('POST /api/whitelist/entries/check', () => {
    it('should check if value in whitelist', async () => {
      // TODO: 实现测试
      // 1. 创建白名单条目
      await Whitelist.create({
        platform: 'github',
        value: 'octocat',
        enabled: true,
        createdBy: testUser._id,
      });

      // 2. 检查存在的值
      const entry1 = await Whitelist.findOne({
        platform: 'github',
        value: 'octocat',
        enabled: true,
      });
      expect(entry1).toBeDefined();

      // 3. 检查不存在的值
      const entry2 = await Whitelist.findOne({
        platform: 'github',
        value: 'nonexistent',
        enabled: true,
      });
      expect(entry2).toBeNull();
    });
  });
});

