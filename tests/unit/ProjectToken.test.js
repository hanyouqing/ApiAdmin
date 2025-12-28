import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import ProjectTokenController from '../../Server/Controllers/ProjectToken.js';
import ProjectToken from '../../Server/Models/ProjectToken.js';
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

describe('ProjectTokenController', () => {
  let testUser;
  let superAdmin;
  let testGroup;
  let testProject;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await ProjectToken.deleteMany({});
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
    await ProjectToken.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  describe('generateToken', () => {
    it('should generate token successfully', async () => {
      const ctx = createMockCtx(
        { projectId: testProject._id.toString() },
        {},
        {
          name: 'Test Token',
        },
        testUser
      );
      await ProjectTokenController.generateToken(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('token');
      expect(ctx.body.data).toHaveProperty('name', 'Test Token');
      expect(ctx.body.data).toHaveProperty('id');
    });

    it('should return 400 for invalid project ID', async () => {
      const ctx = createMockCtx({ projectId: 'invalid' }, {}, { name: 'Test Token' }, testUser);
      await ProjectTokenController.generateToken(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({ projectId: fakeId.toString() }, {}, { name: 'Test Token' }, testUser);
      await ProjectTokenController.generateToken(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 400 if name is missing', async () => {
      const ctx = createMockCtx({ projectId: testProject._id.toString() }, {}, {}, testUser);
      await ProjectTokenController.generateToken(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should support expiration date', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const ctx = createMockCtx(
        { projectId: testProject._id.toString() },
        {},
        {
          name: 'Test Token',
          expiresAt: expiresAt.toISOString(),
        },
        testUser
      );
      await ProjectTokenController.generateToken(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(new Date(ctx.body.data.expiresAt).getTime()).toBe(expiresAt.getTime());
    });
  });

  describe('listTokens', () => {
    it('should list tokens for project', async () => {
      await ProjectToken.create({
        token: ProjectToken.generateToken(),
        name: 'Token 1',
        projectId: testProject._id,
        createdBy: testUser._id,
      });

      await ProjectToken.create({
        token: ProjectToken.generateToken(),
        name: 'Token 2',
        projectId: testProject._id,
        createdBy: testUser._id,
      });

      const ctx = createMockCtx({ projectId: testProject._id.toString() }, {}, {}, testUser);
      await ProjectTokenController.listTokens(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.length).toBe(2);
      expect(ctx.body.data.every(t => !t.token)).toBe(true);
    });

    it('should return 400 for invalid project ID', async () => {
      const ctx = createMockCtx({ projectId: 'invalid' }, {}, {}, testUser);
      await ProjectTokenController.listTokens(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should not return token value', async () => {
      await ProjectToken.create({
        token: ProjectToken.generateToken(),
        name: 'Test Token',
        projectId: testProject._id,
        createdBy: testUser._id,
      });

      const ctx = createMockCtx({ projectId: testProject._id.toString() }, {}, {}, testUser);
      await ProjectTokenController.listTokens(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.data[0].token).toBeUndefined();
      expect(ctx.body.data[0]).toHaveProperty('id');
      expect(ctx.body.data[0]).toHaveProperty('name');
    });
  });

  describe('deleteToken', () => {
    it('should delete token successfully', async () => {
      const token = await ProjectToken.create({
        token: ProjectToken.generateToken(),
        name: 'Test Token',
        projectId: testProject._id,
        createdBy: testUser._id,
      });

      const ctx = createMockCtx(
        { projectId: testProject._id.toString(), tokenId: token._id.toString() },
        {},
        {},
        testUser
      );
      await ProjectTokenController.deleteToken(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);

      const deleted = await ProjectToken.findById(token._id);
      expect(deleted).toBeNull();
    });

    it('should return 400 for invalid IDs', async () => {
      const ctx = createMockCtx({ projectId: 'invalid', tokenId: 'invalid' }, {}, {}, testUser);
      await ProjectTokenController.deleteToken(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent token', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx(
        { projectId: testProject._id.toString(), tokenId: fakeId.toString() },
        {},
        {},
        testUser
      );
      await ProjectTokenController.deleteToken(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });

    it('should allow super admin to delete any token', async () => {
      const token = await ProjectToken.create({
        token: ProjectToken.generateToken(),
        name: 'Test Token',
        projectId: testProject._id,
        createdBy: testUser._id,
      });

      const ctx = createMockCtx(
        { projectId: testProject._id.toString(), tokenId: token._id.toString() },
        {},
        {},
        superAdmin
      );
      await ProjectTokenController.deleteToken(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });

    it('should return 403 for non-project-leader', async () => {
      const otherUser = await User.create({
        username: 'other',
        email: 'other@example.com',
        password: 'Other1234',
      });

      const token = await ProjectToken.create({
        token: ProjectToken.generateToken(),
        name: 'Test Token',
        projectId: testProject._id,
        createdBy: testUser._id,
      });

      const ctx = createMockCtx(
        { projectId: testProject._id.toString(), tokenId: token._id.toString() },
        {},
        {},
        otherUser
      );
      await ProjectTokenController.deleteToken(ctx);

      expect(ctx.status).toBe(403);
      expect(ctx.body.success).toBe(false);
    });
  });
});

