import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import MonitorController from '../../Server/Controllers/Monitor.js';
import User from '../../Server/Models/User.js';
import Group from '../../Server/Models/Group.js';
import Project from '../../Server/Models/Project.js';
import Interface from '../../Server/Models/Interface.js';

function createMockCtx(params = {}, query = {}, body = {}, user = null) {
  return {
    params,
    query,
    request: { body },
    state: { user: user || { _id: new mongoose.Types.ObjectId(), role: 'guest' } },
    status: 200,
    body: null,
    set: vi.fn(),
  };
}

describe('MonitorController', () => {
  let testUser;
  let superAdmin;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
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

    superAdmin = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Admin1234',
      role: 'super_admin',
    });
  });

  afterEach(async () => {
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  describe('getStats', () => {
    it('should return 403 for non-super-admin', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser);
      await MonitorController.getStats(ctx);

      expect(ctx.status).toBe(403);
      expect(ctx.body.success).toBe(false);
    });

    it('should return stats for super admin', async () => {
      await Group.create({
        group_name: 'Test Group',
        uid: testUser._id,
      });

      await Project.create({
        project_name: 'Test Project',
        group_id: null,
        uid: testUser._id,
      });

      const ctx = createMockCtx({}, {}, {}, superAdmin);
      await MonitorController.getStats(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('users');
      expect(ctx.body.data).toHaveProperty('groups');
      expect(ctx.body.data).toHaveProperty('projects');
      expect(ctx.body.data).toHaveProperty('interfaces');
      expect(ctx.body.data).toHaveProperty('database');
      expect(ctx.body.data).toHaveProperty('system');
    });

    it('should include system information', async () => {
      const ctx = createMockCtx({}, {}, {}, superAdmin);
      await MonitorController.getStats(ctx);

      expect(ctx.body.data.system).toHaveProperty('uptime');
      expect(ctx.body.data.system).toHaveProperty('cpu');
      expect(ctx.body.data.system).toHaveProperty('memory');
      expect(ctx.body.data.system).toHaveProperty('disk');
      expect(ctx.body.data.system).toHaveProperty('memoryDetail');
      expect(ctx.body.data.system).toHaveProperty('nodeVersion');
      expect(ctx.body.data.system).toHaveProperty('platform');
    });

    it('should include database status', async () => {
      const ctx = createMockCtx({}, {}, {}, superAdmin);
      await MonitorController.getStats(ctx);

      expect(ctx.body.data.database).toHaveProperty('status');
      expect(ctx.body.data.database).toHaveProperty('name');
    });

    it('should count entities correctly', async () => {
      await Group.create({
        group_name: 'Group 1',
        uid: testUser._id,
      });

      await Group.create({
        group_name: 'Group 2',
        uid: testUser._id,
      });

      const group = await Group.create({
        group_name: 'Group 3',
        uid: testUser._id,
      });

      await Project.create({
        project_name: 'Project 1',
        group_id: group._id,
        uid: testUser._id,
      });

      const ctx = createMockCtx({}, {}, {}, superAdmin);
      await MonitorController.getStats(ctx);

      expect(ctx.body.data.users).toBeGreaterThanOrEqual(2);
      expect(ctx.body.data.groups).toBe(3);
      expect(ctx.body.data.projects).toBe(1);
    });

    it('should handle errors gracefully', async () => {
      const ctx = createMockCtx({}, {}, {}, superAdmin);
      vi.spyOn(User, 'countDocuments').mockRejectedValueOnce(new Error('Database error'));

      await MonitorController.getStats(ctx);

      expect(ctx.status).toBe(500);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('getMetrics', () => {
    it('should return metrics', async () => {
      const ctx = createMockCtx({}, {}, {}, superAdmin);
      await MonitorController.getMetrics(ctx);

      expect(ctx.set).toHaveBeenCalled();
    });

    it('should handle prom-client import error', async () => {
      const ctx = createMockCtx({}, {}, {}, superAdmin);
      const originalImport = global.import;
      global.import = vi.fn().mockRejectedValueOnce(new Error('Module not found'));

      await MonitorController.getMetrics(ctx);

      expect(ctx.status).toBe(500);
      expect(ctx.body.success).toBe(false);

      global.import = originalImport;
    });
  });
});

