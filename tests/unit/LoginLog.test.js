import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import LoginLogController from '../../Server/Controllers/LoginLog.js';
import LoginLog from '../../Server/Models/LoginLog.js';
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

describe('LoginLogController', () => {
  let testUser;
  let superAdmin;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await LoginLog.deleteMany({});
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
    await LoginLog.deleteMany({});
    await User.deleteMany({});
  });

  describe('listLogs', () => {
    it('should return 403 for non-super-admin', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser);
      await LoginLogController.listLogs(ctx);

      expect(ctx.status).toBe(403);
      expect(ctx.body.success).toBe(false);
    });

    it('should list logs for super admin', async () => {
      await LoginLog.create({
        userId: testUser._id,
        status: 'success',
        loginType: 'password',
        ip: '127.0.0.1',
      });

      await LoginLog.create({
        userId: testUser._id,
        status: 'failed',
        loginType: 'password',
        ip: '127.0.0.1',
      });

      const ctx = createMockCtx({}, {}, {}, superAdmin);
      await LoginLogController.listLogs(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by userId', async () => {
      const otherUser = await User.create({
        username: 'other',
        email: 'other@example.com',
        password: 'Other1234',
      });

      await LoginLog.create({
        userId: testUser._id,
        status: 'success',
        loginType: 'password',
        ip: '127.0.0.1',
      });

      await LoginLog.create({
        userId: otherUser._id,
        status: 'success',
        loginType: 'password',
        ip: '127.0.0.1',
      });

      const ctx = createMockCtx({}, { userId: testUser._id.toString() }, {}, superAdmin);
      await LoginLogController.listLogs(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.every(log => log.userId._id.toString() === testUser._id.toString())).toBe(true);
    });

    it('should filter by status', async () => {
      await LoginLog.create({
        userId: testUser._id,
        status: 'success',
        loginType: 'password',
        ip: '127.0.0.1',
      });

      await LoginLog.create({
        userId: testUser._id,
        status: 'failed',
        loginType: 'password',
        ip: '127.0.0.1',
      });

      const ctx = createMockCtx({}, { status: 'success' }, {}, superAdmin);
      await LoginLogController.listLogs(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.every(log => log.status === 'success')).toBe(true);
    });

    it('should filter by loginType', async () => {
      await LoginLog.create({
        userId: testUser._id,
        status: 'success',
        loginType: 'password',
        ip: '127.0.0.1',
      });

      await LoginLog.create({
        userId: testUser._id,
        status: 'success',
        loginType: 'sso',
        ip: '127.0.0.1',
      });

      const ctx = createMockCtx({}, { loginType: 'password' }, {}, superAdmin);
      await LoginLogController.listLogs(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.every(log => log.loginType === 'password')).toBe(true);
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 25; i++) {
        await LoginLog.create({
          userId: testUser._id,
          status: 'success',
          loginType: 'password',
          ip: '127.0.0.1',
        });
      }

      const ctx = createMockCtx({}, { page: 1, pageSize: 10 }, {}, superAdmin);
      await LoginLogController.listLogs(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.length).toBeLessThanOrEqual(10);
      expect(ctx.body.data.pagination.total).toBeGreaterThanOrEqual(25);
    });
  });

  describe('getStatistics', () => {
    it('should return 403 for non-super-admin', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser);
      await LoginLogController.getStatistics(ctx);

      expect(ctx.status).toBe(403);
      expect(ctx.body.success).toBe(false);
    });

    it('should return statistics for super admin', async () => {
      await LoginLog.create({
        userId: testUser._id,
        status: 'success',
        loginType: 'password',
        ip: '127.0.0.1',
      });

      await LoginLog.create({
        userId: testUser._id,
        status: 'success',
        loginType: 'password',
        ip: '127.0.0.1',
      });

      await LoginLog.create({
        userId: testUser._id,
        status: 'failed',
        loginType: 'password',
        ip: '127.0.0.1',
      });

      const ctx = createMockCtx({}, {}, {}, superAdmin);
      await LoginLogController.getStatistics(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('total');
      expect(ctx.body.data).toHaveProperty('success');
      expect(ctx.body.data).toHaveProperty('failed');
      expect(ctx.body.data).toHaveProperty('successRate');
      expect(ctx.body.data).toHaveProperty('loginTypeStats');
      expect(ctx.body.data).toHaveProperty('dailyStats');
    });

    it('should calculate success rate correctly', async () => {
      await LoginLog.create({
        userId: testUser._id,
        status: 'success',
        loginType: 'password',
        ip: '127.0.0.1',
      });

      await LoginLog.create({
        userId: testUser._id,
        status: 'success',
        loginType: 'password',
        ip: '127.0.0.1',
      });

      await LoginLog.create({
        userId: testUser._id,
        status: 'failed',
        loginType: 'password',
        ip: '127.0.0.1',
      });

      const ctx = createMockCtx({}, {}, {}, superAdmin);
      await LoginLogController.getStatistics(ctx);

      expect(ctx.body.data.total).toBe(3);
      expect(ctx.body.data.success).toBe(2);
      expect(ctx.body.data.failed).toBe(1);
      expect(parseFloat(ctx.body.data.successRate)).toBeCloseTo(66.67, 1);
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await LoginLog.create({
        userId: testUser._id,
        status: 'success',
        loginType: 'password',
        ip: '127.0.0.1',
        createdAt: yesterday,
      });

      await LoginLog.create({
        userId: testUser._id,
        status: 'success',
        loginType: 'password',
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
        superAdmin
      );
      await LoginLogController.getStatistics(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });
  });
});

