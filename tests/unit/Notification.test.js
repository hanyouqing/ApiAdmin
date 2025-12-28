import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import NotificationController from '../../Server/Controllers/Notification.js';
import Notification from '../../Server/Models/Notification.js';
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

describe('NotificationController', () => {
  let testUser;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await Notification.deleteMany({});
    await User.deleteMany({});

    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
    });
  });

  afterEach(async () => {
    await Notification.deleteMany({});
    await User.deleteMany({});
  });

  describe('listNotifications', () => {
    it('should list notifications for user', async () => {
      await Notification.create({
        userId: testUser._id,
        type: 'interface_change',
        title: 'Test Notification',
        content: 'Test content',
        read: false,
      });

      const ctx = createMockCtx({}, {}, {}, testUser);
      await NotificationController.listNotifications(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.length).toBeGreaterThanOrEqual(1);
      expect(ctx.body.data).toHaveProperty('pagination');
      expect(ctx.body.data).toHaveProperty('unreadCount');
    });

    it('should filter unread notifications', async () => {
      await Notification.create({
        userId: testUser._id,
        type: 'interface_change',
        title: 'Unread',
        content: 'Test',
        read: false,
      });

      await Notification.create({
        userId: testUser._id,
        type: 'interface_change',
        title: 'Read',
        content: 'Test',
        read: true,
      });

      const ctx = createMockCtx({}, { unreadOnly: 'true' }, {}, testUser);
      await NotificationController.listNotifications(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.every(n => n.read === false)).toBe(true);
    });

    it('should filter by type', async () => {
      await Notification.create({
        userId: testUser._id,
        type: 'interface_change',
        title: 'Interface Change',
        content: 'Test',
        read: false,
      });

      await Notification.create({
        userId: testUser._id,
        type: 'test_failed',
        title: 'Test Failed',
        content: 'Test',
        read: false,
      });

      const ctx = createMockCtx({}, { type: 'interface_change' }, {}, testUser);
      await NotificationController.listNotifications(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.every(n => n.type === 'interface_change')).toBe(true);
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 15; i++) {
        await Notification.create({
          userId: testUser._id,
          type: 'interface_change',
          title: `Notification ${i}`,
          content: 'Test',
          read: false,
        });
      }

      const ctx = createMockCtx({}, { page: 1, pageSize: 10 }, {}, testUser);
      await NotificationController.listNotifications(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.length).toBeLessThanOrEqual(10);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = await Notification.create({
        userId: testUser._id,
        type: 'interface_change',
        title: 'Test',
        content: 'Test',
        read: false,
      });

      const ctx = createMockCtx({ id: notification._id.toString() }, {}, {}, testUser);
      await NotificationController.markAsRead(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);

      const updated = await Notification.findById(notification._id);
      expect(updated.read).toBe(true);
      expect(updated.readAt).toBeDefined();
    });

    it('should return 400 for invalid id', async () => {
      const ctx = createMockCtx({ id: 'invalid' }, {}, {}, testUser);
      await NotificationController.markAsRead(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({ id: fakeId.toString() }, {}, {}, testUser);
      await NotificationController.markAsRead(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });

    it('should only mark own notifications', async () => {
      const otherUser = await User.create({
        username: 'other',
        email: 'other@example.com',
        password: 'Other1234',
      });

      const notification = await Notification.create({
        userId: otherUser._id,
        type: 'interface_change',
        title: 'Test',
        content: 'Test',
        read: false,
      });

      const ctx = createMockCtx({ id: notification._id.toString() }, {}, {}, testUser);
      await NotificationController.markAsRead(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      await Notification.create({
        userId: testUser._id,
        type: 'interface_change',
        title: 'Unread 1',
        content: 'Test',
        read: false,
      });

      await Notification.create({
        userId: testUser._id,
        type: 'interface_change',
        title: 'Unread 2',
        content: 'Test',
        read: false,
      });

      const ctx = createMockCtx({}, {}, {}, testUser);
      await NotificationController.markAllAsRead(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.updatedCount).toBe(2);

      const notifications = await Notification.find({ userId: testUser._id });
      expect(notifications.every(n => n.read === true)).toBe(true);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      const notification = await Notification.create({
        userId: testUser._id,
        type: 'interface_change',
        title: 'Test',
        content: 'Test',
        read: false,
      });

      const ctx = createMockCtx({ id: notification._id.toString() }, {}, {}, testUser);
      await NotificationController.deleteNotification(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);

      const deleted = await Notification.findById(notification._id);
      expect(deleted).toBeNull();
    });

    it('should return 400 for invalid id', async () => {
      const ctx = createMockCtx({ id: 'invalid' }, {}, {}, testUser);
      await NotificationController.deleteNotification(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent notification', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({ id: fakeId.toString() }, {}, {}, testUser);
      await NotificationController.deleteNotification(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('getSettings', () => {
    it('should return default settings', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser);
      await NotificationController.getSettings(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('email');
      expect(ctx.body.data).toHaveProperty('inApp');
      expect(ctx.body.data).toHaveProperty('webhook');
    });
  });

  describe('updateSettings', () => {
    it('should update settings', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          email: {
            interfaceChange: false,
            testFailed: true,
          },
          inApp: {
            interfaceChange: true,
            testFailed: true,
          },
        },
        testUser
      );
      await NotificationController.updateSettings(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });
  });
});

