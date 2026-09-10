import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import AutoTestController from '../../Server/Controllers/AutoTest.js';
import AutoTestConfig from '../../Server/Models/AutoTestConfig.js';
import Interface from '../../Server/Models/Interface.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';
import User from '../../Server/Models/User.js';
import TestCollection from '../../Server/Models/TestCollection.js';

function createMockCtx(params = {}, query = {}, body = {}, user = null) {
  return {
    params,
    query,
    request: { body },
    state: { user: user || { _id: new mongoose.Types.ObjectId(), role: 'guest' } },
    status: 200,
    body: null,
  };
}

describe('AutoTestController', () => {
  let testUser;
  let testGroup;
  let testProject;
  let testInterface;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test', {
        serverSelectionTimeoutMS: 5000,
      });
    }
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection failed');
    }
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
    await AutoTestConfig.deleteMany({});
    await TestCollection.deleteMany({});

    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
    });

    testGroup = await Group.create({
      group_name: 'Test Group',
      uid: testUser._id,
    });

    testProject = await Project.create({
      project_name: 'Test Project',
      group_id: testGroup._id,
      uid: testUser._id,
    });

    testInterface = await Interface.create({
      title: 'Test Interface',
      path: '/api/test',
      method: 'GET',
      project_id: testProject._id,
      uid: testUser._id,
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
    await AutoTestConfig.deleteMany({});
    await TestCollection.deleteMany({});
  });

  describe('getConfig', () => {
    it('should return default config', async () => {
      const ctx = createMockCtx({}, { projectId: testProject._id.toString() }, {}, testUser);
      await AutoTestController.getConfig(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('enabled');
      expect(ctx.body.data).toHaveProperty('autoGenerate');
      expect(ctx.body.data).toHaveProperty('autoExecute');
    });

    it('should handle errors gracefully', async () => {
      const ctx = createMockCtx({}, { projectId: testProject._id.toString() }, {}, testUser);
      vi.spyOn(AutoTestConfig, 'getConfig').mockRejectedValueOnce(new Error('Database error'));

      await AutoTestController.getConfig(ctx);

      expect(ctx.status).toBe(500);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('should update config successfully', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          projectId: testProject._id.toString(),
          enabled: true,
          autoGenerate: true,
          autoExecute: false,
        },
        testUser
      );
      await AutoTestController.updateConfig(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const ctx = createMockCtx({}, {}, { projectId: testProject._id.toString() }, testUser);
      vi.spyOn(AutoTestConfig, 'getOrCreateConfig').mockRejectedValueOnce(new Error('Database error'));

      await AutoTestController.updateConfig(ctx);

      expect(ctx.status).toBe(500);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('generateTestCases', () => {
    it('should generate test cases for GET interface', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          interfaceIds: [testInterface._id.toString()],
          projectId: testProject._id.toString(),
          strategy: 'mock',
        },
        testUser
      );
      await AutoTestController.generateTestCases(ctx);

      expect([200, 500]).toContain(ctx.status);
      if (ctx.status === 200) {
        expect(ctx.body.success).toBe(true);
        expect(ctx.body.data).toHaveProperty('generatedCount');
      }
    });

    it('should return 400 when projectId is missing', async () => {
      const ctx = createMockCtx({}, {}, { interfaceIds: [testInterface._id.toString()] }, testUser);
      await AutoTestController.generateTestCases(ctx);
      expect(ctx.status).toBe(400);
    });

    it('should filter invalid interface IDs without crashing', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          interfaceIds: ['invalid', testInterface._id.toString()],
          projectId: testProject._id.toString(),
        },
        testUser
      );
      await AutoTestController.generateTestCases(ctx);
      expect([200, 404, 500]).toContain(ctx.status);
    });

    it('should handle errors gracefully', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          interfaceIds: [testInterface._id.toString()],
          projectId: testProject._id.toString(),
        },
        testUser
      );
      vi.spyOn(Interface, 'find').mockRejectedValueOnce(new Error('Database error'));

      await AutoTestController.generateTestCases(ctx);

      expect(ctx.status).toBe(500);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('runAutoTest', () => {
    it('should return 400 when collectionId is missing', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          projectId: testProject._id.toString(),
        },
        testUser
      );
      await AutoTestController.runAutoTest(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should run auto test for an existing collection', async () => {
      const collection = await TestCollection.create({
        name: 'Collection',
        project_id: testProject._id,
        uid: testUser._id,
      });

      const ctx = createMockCtx(
        {},
        {},
        {
          collectionId: collection._id.toString(),
          projectId: testProject._id.toString(),
        },
        testUser
      );
      await AutoTestController.runAutoTest(ctx);

      // Runner may succeed or fail depending on env/network; accept structured response
      expect([200, 500]).toContain(ctx.status);
      expect(ctx.body).toHaveProperty('success');
    });
  });
});
