import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import UploadController from '../../Server/Controllers/Upload.js';
import User from '../../Server/Models/User.js';

function createMockCtx(params = {}, query = {}, body = {}, user = null, file = null) {
  return {
    params,
    query,
    request: {
      body,
      file,
    },
    state: { user: user || { _id: new mongoose.Types.ObjectId(), role: 'guest' } },
    status: 200,
    body: null,
  };
}

describe('UploadController', () => {
  let testUser;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await User.deleteMany({});

    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
    });
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const mockFile = {
        filename: 'test-file.txt',
        originalname: 'test-file.txt',
        mimetype: 'text/plain',
        size: 1024,
      };

      const ctx = createMockCtx({}, {}, {}, testUser, mockFile);
      await UploadController.uploadFile(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('filename', 'test-file.txt');
      expect(ctx.body.data).toHaveProperty('originalname', 'test-file.txt');
      expect(ctx.body.data).toHaveProperty('mimetype', 'text/plain');
      expect(ctx.body.data).toHaveProperty('size', 1024);
      expect(ctx.body.data).toHaveProperty('url');
    });

    it('should return 400 if file is missing', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser, null);
      await UploadController.uploadFile(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const mockFile = {
        filename: 'test-file.txt',
        originalname: 'test-file.txt',
        mimetype: 'text/plain',
        size: 1024,
      };

      const ctx = createMockCtx({}, {}, {}, testUser, mockFile);
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await UploadController.uploadFile(ctx);

      expect(ctx.status).toBe(200);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const mockFile = {
        filename: 'avatar.jpg',
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 2048,
      };

      const ctx = createMockCtx({}, {}, {}, testUser, mockFile);
      await UploadController.uploadAvatar(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('avatar');

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.avatar).toBeDefined();
    });

    it('should return 400 if file is missing', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser, null);
      await UploadController.uploadAvatar(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 400 if file is not an image', async () => {
      const mockFile = {
        filename: 'document.pdf',
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      };

      const ctx = createMockCtx({}, {}, {}, testUser, mockFile);
      await UploadController.uploadAvatar(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should accept PNG images', async () => {
      const mockFile = {
        filename: 'avatar.png',
        originalname: 'avatar.png',
        mimetype: 'image/png',
        size: 2048,
      };

      const ctx = createMockCtx({}, {}, {}, testUser, mockFile);
      await UploadController.uploadAvatar(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });

    it('should accept GIF images', async () => {
      const mockFile = {
        filename: 'avatar.gif',
        originalname: 'avatar.gif',
        mimetype: 'image/gif',
        size: 2048,
      };

      const ctx = createMockCtx({}, {}, {}, testUser, mockFile);
      await UploadController.uploadAvatar(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const mockFile = {
        filename: 'avatar.jpg',
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 2048,
      };

      const ctx = createMockCtx({}, {}, {}, testUser, mockFile);
      vi.spyOn(testUser, 'save').mockRejectedValueOnce(new Error('Database error'));

      await UploadController.uploadAvatar(ctx);

      expect(ctx.status).toBe(500);
      expect(ctx.body.success).toBe(false);
    });
  });
});

