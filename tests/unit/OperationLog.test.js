import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import OperationLogController from '../../Server/Controllers/OperationLog.js';
import OperationLog from '../../Server/Models/OperationLog.js';
import User from '../../Server/Models/User.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';

function createMockCtx(params = {}, query = {}, body = {}, user = null) {
  return {
    params,
    query,
    request: { body },
    state: { user: user || { _id: new mongoose.Types.ObjectId(), role: 'guest' } },
    status: 200,
    body: null,
    set: (key, value) => {},
  };
}

describe('OperationLogController', () => {
  let testUser;
  let testGroup;
  let testProject;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await OperationLog.deleteMany({});
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
  });

  afterEach(async () => {
    await OperationLog.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  describe('listLogs', () => {
    it('should list logs', async () => {
      await OperationLog.create({
        userId: testUser._id,
        projectId: testProject._id,
        type: 'interface',
        action: 'create',
        targetId: new mongoose.Types.ObjectId(),
        targetName: 'Test Interface',
        ip: '127.0.0.1',
      });

      const ctx = createMockCtx({}, {}, {}, testUser);
      await OperationLogController.listLogs(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.length).toBeGreaterThanOrEqual(1);
      expect(ctx.body.data).toHaveProperty('pagination');
    });

    it('should filter by type', async () => {
      await OperationLog.create({
        userId: testUser._id,
        projectId: testProject._id,
        type: 'interface',
        action: 'create',
        targetId: new mongoose.Types.ObjectId(),
        targetName: 'Interface',
        ip: '127.0.0.1',
      });

      await OperationLog.create({
        userId: testUser._id,
        projectId: testProject._id,
        type: 'project',
        action: 'update',
        targetId: testProject._id,
        targetName: 'Project',
        ip: '127.0.0.1',
      });

      const ctx = createMockCtx({}, { type: 'interface' }, {}, testUser);
      await OperationLogController.listLogs(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.every(log => log.type === 'interface')).toBe(true);
    });

    it('should filter by projectId', async () => {
      const otherProject = await Project.create({
        project_name: 'Other Project',
        group_id: testGroup._id,
        uid: testUser._id,
      });

      await OperationLog.create({
        userId: testUser._id,
        projectId: testProject._id,
        type: 'interface',
        action: 'create',
        targetId: new mongoose.Types.ObjectId(),
        targetName: 'Interface 1',
        ip: '127.0.0.1',
      });

      await OperationLog.create({
        userId: testUser._id,
        projectId: otherProject._id,
        type: 'interface',
        action: 'create',
        targetId: new mongoose.Types.ObjectId(),
        targetName: 'Interface 2',
        ip: '127.0.0.1',
      });

      const ctx = createMockCtx({}, { projectId: testProject._id.toString() }, {}, testUser);
      await OperationLogController.listLogs(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.every(log => log.projectId._id.toString() === testProject._id.toString())).toBe(true);
    });

    it('should filter by userId', async () => {
      const otherUser = await User.create({
        username: 'other',
        email: 'other@example.com',
        password: 'Other1234',
      });

      await OperationLog.create({
        userId: testUser._id,
        projectId: testProject._id,
        type: 'interface',
        action: 'create',
        targetId: new mongoose.Types.ObjectId(),
        targetName: 'Interface 1',
        ip: '127.0.0.1',
      });

      await OperationLog.create({
        userId: otherUser._id,
        projectId: testProject._id,
        type: 'interface',
        action: 'create',
        targetId: new mongoose.Types.ObjectId(),
        targetName: 'Interface 2',
        ip: '127.0.0.1',
      });

      const ctx = createMockCtx({}, { userId: testUser._id.toString() }, {}, testUser);
      await OperationLogController.listLogs(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.every(log => log.userId._id.toString() === testUser._id.toString())).toBe(true);
    });

    it('should filter by action', async () => {
      await OperationLog.create({
        userId: testUser._id,
        projectId: testProject._id,
        type: 'interface',
        action: 'create',
        targetId: new mongoose.Types.ObjectId(),
        targetName: 'Interface',
        ip: '127.0.0.1',
      });

      await OperationLog.create({
        userId: testUser._id,
        projectId: testProject._id,
        type: 'interface',
        action: 'update',
        targetId: new mongoose.Types.ObjectId(),
        targetName: 'Interface',
        ip: '127.0.0.1',
      });

      const ctx = createMockCtx({}, { action: 'create' }, {}, testUser);
      await OperationLogController.listLogs(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.every(log => log.action === 'create')).toBe(true);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await OperationLog.create({
        userId: testUser._id,
        projectId: testProject._id,
        type: 'interface',
        action: 'create',
        targetId: new mongoose.Types.ObjectId(),
        targetName: 'Interface',
        ip: '127.0.0.1',
        createdAt: yesterday,
      });

      await OperationLog.create({
        userId: testUser._id,
        projectId: testProject._id,
        type: 'interface',
        action: 'create',
        targetId: new mongoose.Types.ObjectId(),
        targetName: 'Interface',
        ip: '127.0.0.1',
        createdAt: now,
      });

      const ctx = createMockCtx(
        {},
        {
          startDate: yesterday.toISOString(),
          endDate: tomorrow.toISOString(),
        },
        {},
        testUser
      );
      await OperationLogController.listLogs(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 15; i++) {
        await OperationLog.create({
          userId: testUser._id,
          projectId: testProject._id,
          type: 'interface',
          action: 'create',
          targetId: new mongoose.Types.ObjectId(),
          targetName: `Interface ${i}`,
          ip: '127.0.0.1',
        });
      }

      const ctx = createMockCtx({}, { page: 1, pageSize: 10 }, {}, testUser);
      await OperationLogController.listLogs(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.length).toBeLessThanOrEqual(10);
    });
  });

  describe('exportLogs', () => {
    it('should export logs as CSV', async () => {
      await OperationLog.create({
        userId: testUser._id,
        projectId: testProject._id,
        type: 'interface',
        action: 'create',
        targetId: new mongoose.Types.ObjectId(),
        targetName: 'Test Interface',
        ip: '127.0.0.1',
      });

      const ctx = createMockCtx({}, { format: 'csv' }, {}, testUser);
      await OperationLogController.exportLogs(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toContain('时间');
      expect(ctx.body).toContain('类型');
    });

    it('should export logs as JSON', async () => {
      await OperationLog.create({
        userId: testUser._id,
        projectId: testProject._id,
        type: 'interface',
        action: 'create',
        targetId: new mongoose.Types.ObjectId(),
        targetName: 'Test Interface',
        ip: '127.0.0.1',
      });

      const ctx = createMockCtx({}, { format: 'json' }, {}, testUser);
      await OperationLogController.exportLogs(ctx);

      expect(ctx.status).toBe(200);
      const data = JSON.parse(ctx.body);
      expect(Array.isArray(data)).toBe(true);
    });

    it('should filter by type when exporting', async () => {
      await OperationLog.create({
        userId: testUser._id,
        projectId: testProject._id,
        type: 'interface',
        action: 'create',
        targetId: new mongoose.Types.ObjectId(),
        targetName: 'Interface',
        ip: '127.0.0.1',
      });

      await OperationLog.create({
        userId: testUser._id,
        projectId: testProject._id,
        type: 'project',
        action: 'update',
        targetId: testProject._id,
        targetName: 'Project',
        ip: '127.0.0.1',
      });

      const ctx = createMockCtx({}, { format: 'json', type: 'interface' }, {}, testUser);
      await OperationLogController.exportLogs(ctx);

      expect(ctx.status).toBe(200);
      const data = JSON.parse(ctx.body);
      expect(data.every(log => log.type === 'interface')).toBe(true);
    });

    it('should limit export to 10000 records', async () => {
      for (let i = 0; i < 10001; i++) {
        await OperationLog.create({
          userId: testUser._id,
          projectId: testProject._id,
          type: 'interface',
          action: 'create',
          targetId: new mongoose.Types.ObjectId(),
          targetName: `Interface ${i}`,
          ip: '127.0.0.1',
        });
      }

      const ctx = createMockCtx({}, { format: 'json' }, {}, testUser);
      await OperationLogController.exportLogs(ctx);

      expect(ctx.status).toBe(200);
      const data = JSON.parse(ctx.body);
      expect(data.length).toBeLessThanOrEqual(10000);
    });
  });
});

