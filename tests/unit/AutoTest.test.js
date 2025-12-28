import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import AutoTestController from '../../Server/Controllers/AutoTest.js';
import Interface from '../../Server/Models/Interface.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';
import User from '../../Server/Models/User.js';

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
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});

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
    });
  });

  afterEach(async () => {
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
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
      vi.spyOn(Interface, 'find').mockRejectedValueOnce(new Error('Database error'));

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
      vi.spyOn(Interface, 'find').mockRejectedValueOnce(new Error('Database error'));

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

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('generatedCount');
      expect(ctx.body.data).toHaveProperty('testCases');
      expect(ctx.body.data.generatedCount).toBeGreaterThan(0);
    });

    it('should generate test cases for POST interface', async () => {
      const postInterface = await Interface.create({
        title: 'POST Interface',
        path: '/api/post',
        method: 'POST',
        project_id: testProject._id,
        req_body: { name: 'test' },
      });

      const ctx = createMockCtx(
        {},
        {},
        {
          interfaceIds: [postInterface._id.toString()],
          projectId: testProject._id.toString(),
        },
        testUser
      );
      await AutoTestController.generateTestCases(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.generatedCount).toBeGreaterThan(0);
    });

    it('should generate test cases for PUT interface', async () => {
      const putInterface = await Interface.create({
        title: 'PUT Interface',
        path: '/api/put',
        method: 'PUT',
        project_id: testProject._id,
      });

      const ctx = createMockCtx(
        {},
        {},
        {
          interfaceIds: [putInterface._id.toString()],
          projectId: testProject._id.toString(),
        },
        testUser
      );
      await AutoTestController.generateTestCases(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });

    it('should generate test cases for DELETE interface', async () => {
      const deleteInterface = await Interface.create({
        title: 'DELETE Interface',
        path: '/api/delete',
        method: 'DELETE',
        project_id: testProject._id,
      });

      const ctx = createMockCtx(
        {},
        {},
        {
          interfaceIds: [deleteInterface._id.toString()],
          projectId: testProject._id.toString(),
        },
        testUser
      );
      await AutoTestController.generateTestCases(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });

    it('should generate test cases for all interfaces in project', async () => {
      await Interface.create({
        title: 'Another Interface',
        path: '/api/another',
        method: 'GET',
        project_id: testProject._id,
      });

      const ctx = createMockCtx(
        {},
        {},
        {
          projectId: testProject._id.toString(),
        },
        testUser
      );
      await AutoTestController.generateTestCases(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.generatedCount).toBeGreaterThan(0);
    });

    it('should filter invalid interface IDs', async () => {
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

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
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
    it('should run auto test successfully', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          interfaceIds: [testInterface._id.toString()],
          projectId: testProject._id.toString(),
        },
        testUser
      );
      await AutoTestController.runAutoTest(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('report');
      expect(ctx.body.data).toHaveProperty('qualityReport');
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

      await AutoTestController.runAutoTest(ctx);

      expect(ctx.status).toBe(500);
      expect(ctx.body.success).toBe(false);
    });
  });
});

