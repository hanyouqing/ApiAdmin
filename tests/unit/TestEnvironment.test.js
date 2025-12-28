import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import TestEnvironmentController from '../../Server/Controllers/TestEnvironment.js';
import TestEnvironment from '../../Server/Models/TestEnvironment.js';
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

describe('TestEnvironmentController', () => {
  let testUser;
  let testGroup;
  let testProject;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await TestEnvironment.deleteMany({});
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
    await TestEnvironment.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  describe('createEnvironment', () => {
    it('should create environment successfully', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          name: 'Test Environment',
          project_id: testProject._id.toString(),
          base_url: 'https://api.test.com',
          variables: { apiKey: 'test123' },
          headers: { 'X-Custom': 'value' },
          description: 'Test description',
        },
        testUser
      );
      await TestEnvironmentController.createEnvironment(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.name).toBe('Test Environment');
      expect(ctx.body.data.base_url).toBe('https://api.test.com');
    });

    it('should return 400 if name is missing', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          project_id: testProject._id.toString(),
          base_url: 'https://api.test.com',
        },
        testUser
      );
      await TestEnvironmentController.createEnvironment(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 400 if project_id is missing', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          name: 'Test Environment',
          base_url: 'https://api.test.com',
        },
        testUser
      );
      await TestEnvironmentController.createEnvironment(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 400 if base_url is missing', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          name: 'Test Environment',
          project_id: testProject._id.toString(),
        },
        testUser
      );
      await TestEnvironmentController.createEnvironment(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 400 for invalid project_id', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          name: 'Test Environment',
          project_id: 'invalid',
          base_url: 'https://api.test.com',
        },
        testUser
      );
      await TestEnvironmentController.createEnvironment(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx(
        {},
        {},
        {
          name: 'Test Environment',
          project_id: fakeId.toString(),
          base_url: 'https://api.test.com',
        },
        testUser
      );
      await TestEnvironmentController.createEnvironment(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });

    it('should set as default and unset others', async () => {
      await TestEnvironment.create({
        name: 'Existing Default',
        project_id: testProject._id,
        base_url: 'https://existing.test.com',
        is_default: true,
        createdBy: testUser._id,
      });

      const ctx = createMockCtx(
        {},
        {},
        {
          name: 'New Default',
          project_id: testProject._id.toString(),
          base_url: 'https://new.test.com',
          is_default: true,
        },
        testUser
      );
      await TestEnvironmentController.createEnvironment(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.data.is_default).toBe(true);

      const existing = await TestEnvironment.findOne({ name: 'Existing Default' });
      expect(existing.is_default).toBe(false);
    });
  });

  describe('listEnvironments', () => {
    it('should list environments for project', async () => {
      await TestEnvironment.create({
        name: 'Environment 1',
        project_id: testProject._id,
        base_url: 'https://api1.test.com',
        createdBy: testUser._id,
      });

      await TestEnvironment.create({
        name: 'Environment 2',
        project_id: testProject._id,
        base_url: 'https://api2.test.com',
        createdBy: testUser._id,
      });

      const ctx = createMockCtx({}, { project_id: testProject._id.toString() }, {}, testUser);
      await TestEnvironmentController.listEnvironments(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.length).toBe(2);
    });

    it('should return 400 if project_id is missing', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser);
      await TestEnvironmentController.listEnvironments(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 400 for invalid project_id', async () => {
      const ctx = createMockCtx({}, { project_id: 'invalid' }, {}, testUser);
      await TestEnvironmentController.listEnvironments(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should sort by is_default first', async () => {
      await TestEnvironment.create({
        name: 'Regular',
        project_id: testProject._id,
        base_url: 'https://regular.test.com',
        is_default: false,
        createdBy: testUser._id,
      });

      await TestEnvironment.create({
        name: 'Default',
        project_id: testProject._id,
        base_url: 'https://default.test.com',
        is_default: true,
        createdBy: testUser._id,
      });

      const ctx = createMockCtx({}, { project_id: testProject._id.toString() }, {}, testUser);
      await TestEnvironmentController.listEnvironments(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.data[0].is_default).toBe(true);
    });
  });

  describe('getEnvironment', () => {
    it('should get environment by id', async () => {
      const env = await TestEnvironment.create({
        name: 'Test Environment',
        project_id: testProject._id,
        base_url: 'https://api.test.com',
        createdBy: testUser._id,
      });

      const ctx = createMockCtx({ id: env._id.toString() }, {}, {}, testUser);
      await TestEnvironmentController.getEnvironment(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.name).toBe('Test Environment');
    });

    it('should return 400 for invalid id', async () => {
      const ctx = createMockCtx({ id: 'invalid' }, {}, {}, testUser);
      await TestEnvironmentController.getEnvironment(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent environment', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({ id: fakeId.toString() }, {}, {}, testUser);
      await TestEnvironmentController.getEnvironment(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('updateEnvironment', () => {
    it('should update environment successfully', async () => {
      const env = await TestEnvironment.create({
        name: 'Original Name',
        project_id: testProject._id,
        base_url: 'https://api.test.com',
        createdBy: testUser._id,
      });

      const ctx = createMockCtx(
        { id: env._id.toString() },
        {},
        {
          name: 'Updated Name',
          base_url: 'https://updated.test.com',
        },
        testUser
      );
      await TestEnvironmentController.updateEnvironment(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.name).toBe('Updated Name');
      expect(ctx.body.data.base_url).toBe('https://updated.test.com');
    });

    it('should return 400 for invalid id', async () => {
      const ctx = createMockCtx({ id: 'invalid' }, {}, { name: 'Updated' }, testUser);
      await TestEnvironmentController.updateEnvironment(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent environment', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({ id: fakeId.toString() }, {}, { name: 'Updated' }, testUser);
      await TestEnvironmentController.updateEnvironment(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });

    it('should update is_default and unset others', async () => {
      const env1 = await TestEnvironment.create({
        name: 'Environment 1',
        project_id: testProject._id,
        base_url: 'https://api1.test.com',
        is_default: true,
        createdBy: testUser._id,
      });

      const env2 = await TestEnvironment.create({
        name: 'Environment 2',
        project_id: testProject._id,
        base_url: 'https://api2.test.com',
        is_default: false,
        createdBy: testUser._id,
      });

      const ctx = createMockCtx(
        { id: env2._id.toString() },
        {},
        {
          is_default: true,
        },
        testUser
      );
      await TestEnvironmentController.updateEnvironment(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.data.is_default).toBe(true);

      const updated1 = await TestEnvironment.findById(env1._id);
      expect(updated1.is_default).toBe(false);
    });
  });

  describe('deleteEnvironment', () => {
    it('should delete environment successfully', async () => {
      const env = await TestEnvironment.create({
        name: 'Test Environment',
        project_id: testProject._id,
        base_url: 'https://api.test.com',
        createdBy: testUser._id,
      });

      const ctx = createMockCtx({ id: env._id.toString() }, {}, {}, testUser);
      await TestEnvironmentController.deleteEnvironment(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);

      const deleted = await TestEnvironment.findById(env._id);
      expect(deleted).toBeNull();
    });

    it('should return 400 for invalid id', async () => {
      const ctx = createMockCtx({ id: 'invalid' }, {}, {}, testUser);
      await TestEnvironmentController.deleteEnvironment(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent environment', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({ id: fakeId.toString() }, {}, {}, testUser);
      await TestEnvironmentController.deleteEnvironment(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });
  });
});

