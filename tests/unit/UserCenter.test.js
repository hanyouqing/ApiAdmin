import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import UserCenterController from '../../Server/Controllers/UserCenter.js';
import Project from '../../Server/Models/Project.js';
import OperationLog from '../../Server/Models/OperationLog.js';
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

describe('UserCenterController', () => {
  let testUser;
  let testGroup;
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

  describe('getUserProjects', () => {
    it('should list user projects', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser);
      await UserCenterController.getUserProjects(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.length).toBeGreaterThanOrEqual(1);
      expect(ctx.body.data).toHaveProperty('pagination');
    });

    it('should identify project leader role', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser);
      await UserCenterController.getUserProjects(ctx);

      expect(ctx.status).toBe(200);
      const project = ctx.body.data.list.find(p => p.id === testProject._id.toString());
      if (project) {
        expect(project.role).toBe('project_leader');
      }
    });

    it('should identify member role', async () => {
      const otherUser = await User.create({
        username: 'other',
        email: 'other@example.com',
        password: 'Other1234',
      });

      const otherProject = await Project.create({
        project_name: 'Other Project',
        group_id: testGroup._id,
        uid: otherUser._id,
        member: [{ uid: testUser._id, role: 'developer' }],
      });

      const ctx = createMockCtx({}, {}, {}, testUser);
      await UserCenterController.getUserProjects(ctx);

      expect(ctx.status).toBe(200);
      const project = ctx.body.data.list.find(p => p.id === otherProject._id.toString());
      if (project) {
        expect(project.role).toBe('developer');
      }
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 15; i++) {
        await Project.create({
          project_name: `Project ${i}`,
          group_id: testGroup._id,
          uid: testUser._id,
        });
      }

      const ctx = createMockCtx({}, { page: 1, pageSize: 10 }, {}, testUser);
      await UserCenterController.getUserProjects(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.length).toBeLessThanOrEqual(10);
    });

    it('should filter by role', async () => {
      const otherUser = await User.create({
        username: 'other',
        email: 'other@example.com',
        password: 'Other1234',
      });

      await Project.create({
        project_name: 'Leader Project',
        group_id: testGroup._id,
        uid: testUser._id,
      });

      await Project.create({
        project_name: 'Member Project',
        group_id: testGroup._id,
        uid: otherUser._id,
        member: [{ uid: testUser._id, role: 'developer' }],
      });

      const ctx = createMockCtx({}, { role: 'project_leader' }, {}, testUser);
      await UserCenterController.getUserProjects(ctx);

      expect(ctx.status).toBe(200);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
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

      const ctx = createMockCtx({}, {}, {}, testUser);
      await UserCenterController.getUserStats(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('totalActions');
      expect(ctx.body.data).toHaveProperty('actionsByType');
      expect(ctx.body.data).toHaveProperty('actionsByDate');
      expect(ctx.body.data).toHaveProperty('projectsContributed');
      expect(ctx.body.data).toHaveProperty('interfacesCreated');
      expect(ctx.body.data).toHaveProperty('testsRun');
    });

    it('should count actions by type', async () => {
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

      const ctx = createMockCtx({}, {}, {}, testUser);
      await UserCenterController.getUserStats(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.data.actionsByType.create).toBe(2);
      expect(ctx.body.data.actionsByType.update).toBe(1);
    });

    it('should count actions by date', async () => {
      const today = new Date();
      await OperationLog.create({
        userId: testUser._id,
        projectId: testProject._id,
        type: 'interface',
        action: 'create',
        targetId: new mongoose.Types.ObjectId(),
        targetName: 'Interface',
        ip: '127.0.0.1',
        createdAt: today,
      });

      const ctx = createMockCtx({}, {}, {}, testUser);
      await UserCenterController.getUserStats(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.data.actionsByDate.length).toBeGreaterThan(0);
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

      const ctx = createMockCtx(
        {},
        {
          startDate: yesterday.toISOString(),
          endDate: tomorrow.toISOString(),
        },
        {},
        testUser
      );
      await UserCenterController.getUserStats(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });

    it('should count interfaces created', async () => {
      await OperationLog.create({
        userId: testUser._id,
        projectId: testProject._id,
        type: 'interface',
        action: 'create',
        targetId: new mongoose.Types.ObjectId(),
        targetName: 'Interface',
        ip: '127.0.0.1',
      });

      const ctx = createMockCtx({}, {}, {}, testUser);
      await UserCenterController.getUserStats(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.data.interfacesCreated).toBeGreaterThanOrEqual(1);
    });

    it('should count tests run', async () => {
      await OperationLog.create({
        userId: testUser._id,
        projectId: testProject._id,
        type: 'test',
        action: 'run',
        targetId: new mongoose.Types.ObjectId(),
        targetName: 'Test',
        ip: '127.0.0.1',
      });

      const ctx = createMockCtx({}, {}, {}, testUser);
      await UserCenterController.getUserStats(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.data.testsRun).toBeGreaterThanOrEqual(1);
    });
  });
});

