import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import OpenAPIController from '../../Server/Controllers/OpenAPI.js';
import Interface from '../../Server/Models/Interface.js';
import InterfaceCat from '../../Server/Models/InterfaceCat.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';
import User from '../../Server/Models/User.js';

function createMockCtx(params = {}, query = {}, body = {}, user = null, projectId = null) {
  return {
    params,
    query,
    request: { body },
    state: {
      user: user || { _id: new mongoose.Types.ObjectId(), role: 'guest' },
      projectId: projectId || new mongoose.Types.ObjectId(),
    },
    status: 200,
    body: null,
  };
}

describe('OpenAPIController', () => {
  let testUser;
  let testGroup;
  let testProject;
  let testInterface;
  let testCat;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await Interface.deleteMany({});
    await InterfaceCat.deleteMany({});
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

    testCat = await InterfaceCat.create({
      name: 'Test Category',
      project_id: testProject._id,
    });

    testInterface = await Interface.create({
      title: 'Test Interface',
      path: '/api/test',
      method: 'GET',
      project_id: testProject._id,
      catid: testCat._id,
      status: 'done',
    });
  });

  afterEach(async () => {
    await Interface.deleteMany({});
    await InterfaceCat.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  describe('listInterfaces', () => {
    it('should list interfaces', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser, testProject._id);
      await OpenAPIController.listInterfaces(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.length).toBeGreaterThanOrEqual(1);
      expect(ctx.body.data).toHaveProperty('pagination');
    });

    it('should filter by catId', async () => {
      const otherCat = await InterfaceCat.create({
        name: 'Other Category',
        project_id: testProject._id,
      });

      await Interface.create({
        title: 'Other Interface',
        path: '/api/other',
        method: 'GET',
        project_id: testProject._id,
        catid: otherCat._id,
      });

      const ctx = createMockCtx({}, { catId: testCat._id.toString() }, {}, testUser, testProject._id);
      await OpenAPIController.listInterfaces(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.every(i => i.catid._id.toString() === testCat._id.toString())).toBe(true);
    });

    it('should filter by tag', async () => {
      await Interface.create({
        title: 'Tagged Interface',
        path: '/api/tagged',
        method: 'GET',
        project_id: testProject._id,
        tags: ['important'],
      });

      const ctx = createMockCtx({}, { tag: 'important' }, {}, testUser, testProject._id);
      await OpenAPIController.listInterfaces(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.every(i => i.tags && i.tags.includes('important'))).toBe(true);
    });

    it('should filter by status', async () => {
      await Interface.create({
        title: 'Pending Interface',
        path: '/api/pending',
        method: 'GET',
        project_id: testProject._id,
        status: 'pending',
      });

      const ctx = createMockCtx({}, { status: 'done' }, {}, testUser, testProject._id);
      await OpenAPIController.listInterfaces(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.every(i => i.status === 'done')).toBe(true);
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 15; i++) {
        await Interface.create({
          title: `Interface ${i}`,
          path: `/api/test${i}`,
          method: 'GET',
          project_id: testProject._id,
        });
      }

      const ctx = createMockCtx({}, { page: 1, pageSize: 10 }, {}, testUser, testProject._id);
      await OpenAPIController.listInterfaces(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.list.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getInterface', () => {
    it('should get interface by id', async () => {
      const ctx = createMockCtx({ id: testInterface._id.toString() }, {}, {}, testUser, testProject._id);
      await OpenAPIController.getInterface(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.title).toBe('Test Interface');
    });

    it('should return 400 for invalid id', async () => {
      const ctx = createMockCtx({ id: 'invalid' }, {}, {}, testUser, testProject._id);
      await OpenAPIController.getInterface(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent interface', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({ id: fakeId.toString() }, {}, {}, testUser, testProject._id);
      await OpenAPIController.getInterface(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for interface from different project', async () => {
      const otherProject = await Project.create({
        project_name: 'Other Project',
        group_id: testGroup._id,
        uid: testUser._id,
      });

      const otherInterface = await Interface.create({
        title: 'Other Interface',
        path: '/api/other',
        method: 'GET',
        project_id: otherProject._id,
      });

      const ctx = createMockCtx({ id: otherInterface._id.toString() }, {}, {}, testUser, testProject._id);
      await OpenAPIController.getInterface(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('createInterface', () => {
    it('should create interface', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          title: 'New Interface',
          path: '/api/new',
          method: 'POST',
        },
        testUser,
        testProject._id
      );
      await OpenAPIController.createInterface(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });
  });

  describe('updateInterface', () => {
    it('should update interface', async () => {
      const ctx = createMockCtx(
        { id: testInterface._id.toString() },
        {},
        {
          title: 'Updated Interface',
        },
        testUser,
        testProject._id
      );
      await OpenAPIController.updateInterface(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });
  });

  describe('deleteInterface', () => {
    it('should delete interface', async () => {
      const ctx = createMockCtx({ id: testInterface._id.toString() }, {}, {}, testUser, testProject._id);
      await OpenAPIController.deleteInterface(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });
  });
});

