import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import CLIToken from '../../Server/Models/CLIToken.js';
import ProjectToken from '../../Server/Models/ProjectToken.js';
import User from '../../Server/Models/User.js';
import Project from '../../Server/Models/Project.js';

describe('CLIToken Model', () => {
  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test', {
        serverSelectionTimeoutMS: 5000,
      });
    }
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection failed');
    }
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await CLIToken.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
  });

  afterEach(async () => {
    await CLIToken.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
  });

  it('should generate unique token', async () => {
    const token1 = CLIToken.generateToken();
    const token2 = CLIToken.generateToken();

    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThan(20);
  });

  it('should check token expiration', async () => {
    const user = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Test1234',
    });

    const token = new CLIToken({
      token: CLIToken.generateToken(),
      name: 'Test Token',
      expiresAt: new Date(Date.now() - 1000), // 已过期
      createdBy: user._id,
    });

    expect(token.isExpired()).toBe(true);
  });
});

describe('ProjectToken Model', () => {
  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test', {
        serverSelectionTimeoutMS: 5000,
      });
    }
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection failed');
    }
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await ProjectToken.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
  });

  afterEach(async () => {
    await ProjectToken.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
  });

  it('should generate unique token', async () => {
    const token1 = ProjectToken.generateToken();
    const token2 = ProjectToken.generateToken();

    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
    expect(token1).not.toBe(token2);
  });
});

describe('CI/CD Controller', () => {
  let testUser;
  let testProject;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test', {
        serverSelectionTimeoutMS: 5000,
      });
    }
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection failed');
    }
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await CLIToken.deleteMany({});
    await ProjectToken.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});

    testUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Test1234',
    });

    testProject = await Project.create({
      project_name: 'Test Project',
      uid: testUser._id,
      group_id: null,
    });
  });

  afterEach(async () => {
    await CLIToken.deleteMany({});
    await ProjectToken.deleteMany({});
    await User.deleteMany({});
    await Project.deleteMany({});
  });

  describe('POST /api/cicd/tokens', () => {
    it('should generate CLI token', async () => {
      // TODO: 实现测试
      const token = CLIToken.generateToken();
      const cliToken = await CLIToken.create({
        token,
        name: 'Test Token',
        createdBy: testUser._id,
      });

      expect(cliToken._id).toBeDefined();
      expect(cliToken.token).toBe(token);
      expect(cliToken.name).toBe('Test Token');
    });
  });
});

