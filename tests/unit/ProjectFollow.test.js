import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import ProjectFollowController from '../../Server/Controllers/ProjectFollow.js';
import ProjectFollow from '../../Server/Models/ProjectFollow.js';
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

describe('ProjectFollowController', () => {
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
    await ProjectFollow.deleteMany({});
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
    await ProjectFollow.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  describe('followProject', () => {
    it('should follow project successfully', async () => {
      const ctx = createMockCtx({ projectId: testProject._id.toString() }, {}, {}, testUser);
      await ProjectFollowController.followProject(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);

      const follow = await ProjectFollow.findOne({
        userId: testUser._id,
        projectId: testProject._id,
      });
      expect(follow).toBeDefined();
    });

    it('should return 400 for invalid project ID', async () => {
      const ctx = createMockCtx({ projectId: 'invalid' }, {}, {}, testUser);
      await ProjectFollowController.followProject(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({ projectId: fakeId.toString() }, {}, {}, testUser);
      await ProjectFollowController.followProject(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });

    it('should handle already following', async () => {
      await ProjectFollow.create({
        userId: testUser._id,
        projectId: testProject._id,
      });

      const ctx = createMockCtx({ projectId: testProject._id.toString() }, {}, {}, testUser);
      await ProjectFollowController.followProject(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });
  });

  describe('unfollowProject', () => {
    it('should unfollow project successfully', async () => {
      await ProjectFollow.create({
        userId: testUser._id,
        projectId: testProject._id,
      });

      const ctx = createMockCtx({ projectId: testProject._id.toString() }, {}, {}, testUser);
      await ProjectFollowController.unfollowProject(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);

      const follow = await ProjectFollow.findOne({
        userId: testUser._id,
        projectId: testProject._id,
      });
      expect(follow).toBeNull();
    });

    it('should return 400 for invalid project ID', async () => {
      const ctx = createMockCtx({ projectId: 'invalid' }, {}, {}, testUser);
      await ProjectFollowController.unfollowProject(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 if not following', async () => {
      const ctx = createMockCtx({ projectId: testProject._id.toString() }, {}, {}, testUser);
      await ProjectFollowController.unfollowProject(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('listFollowing', () => {
    it('should list following projects', async () => {
      const project2 = await Project.create({
        project_name: 'Project 2',
        group_id: testGroup._id,
        uid: testUser._id,
      });

      await ProjectFollow.create({
        userId: testUser._id,
        projectId: testProject._id,
      });

      await ProjectFollow.create({
        userId: testUser._id,
        projectId: project2._id,
      });

      const ctx = createMockCtx({}, {}, {}, testUser);
      await ProjectFollowController.listFollowing(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.length).toBe(2);
      expect(ctx.body.data).toHaveProperty('pagination');
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 15; i++) {
        const project = await Project.create({
          project_name: `Project ${i}`,
          group_id: testGroup._id,
          uid: testUser._id,
        });

        await ProjectFollow.create({
          userId: testUser._id,
          projectId: project._id,
        });
      }

      const ctx = createMockCtx({}, { page: 1, pageSize: 10 }, {}, testUser);
      await ProjectFollowController.listFollowing(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.length).toBeLessThanOrEqual(10);
    });

    it('should filter deleted projects', async () => {
      const project2 = await Project.create({
        project_name: 'Project 2',
        group_id: testGroup._id,
        uid: testUser._id,
      });

      await ProjectFollow.create({
        userId: testUser._id,
        projectId: testProject._id,
      });

      await ProjectFollow.create({
        userId: testUser._id,
        projectId: project2._id,
      });

      await project2.deleteOne();

      const ctx = createMockCtx({}, {}, {}, testUser);
      await ProjectFollowController.listFollowing(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.length).toBe(1);
    });
  });

  describe('checkFollowing', () => {
    it('should return true if following', async () => {
      await ProjectFollow.create({
        userId: testUser._id,
        projectId: testProject._id,
      });

      const ctx = createMockCtx({ projectId: testProject._id.toString() }, {}, {}, testUser);
      await ProjectFollowController.checkFollowing(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.following).toBe(true);
      expect(ctx.body.data.followedAt).toBeDefined();
    });

    it('should return false if not following', async () => {
      const ctx = createMockCtx({ projectId: testProject._id.toString() }, {}, {}, testUser);
      await ProjectFollowController.checkFollowing(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.following).toBe(false);
      expect(ctx.body.data.followedAt).toBeNull();
    });

    it('should return 400 for invalid project ID', async () => {
      const ctx = createMockCtx({ projectId: 'invalid' }, {}, {}, testUser);
      await ProjectFollowController.checkFollowing(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });
  });
});

