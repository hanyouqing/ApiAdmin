import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';
import User from '../../Server/Models/User.js';
import ProjectController from '../../Server/Controllers/Project.js';
import OperationLog from '../../Server/Models/OperationLog.js';

function createMockCtx(params = {}, query = {}, body = {}, user = null) {
  return {
    params,
    query,
    request: { 
      body,
      url: '/api/test',
    },
    state: { user: user || { _id: new mongoose.Types.ObjectId(), role: 'guest' } },
    status: 200,
    body: null,
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'test-agent',
    },
  };
}

describe('Project Model', () => {
  let testGroup;

  beforeEach(async () => {
    const { connectTestDB, ensureConnection } = await import('./test-helpers.js');
    try {
      await connectTestDB();
      await ensureConnection();
    } catch (error) {
      if (error.message?.includes('authentication')) {
        throw new Error('MongoDB authentication required');
      }
      throw error;
    }
    
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
    await OperationLog.deleteMany({});

    testGroup = new Group({ group_name: 'Test Group' });
    await testGroup.save();
  });

  afterEach(async () => {
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
    await OperationLog.deleteMany({});
  });

  it('should create a project with valid data', async () => {
    const projectData = {
      project_name: 'Test Project',
      project_desc: 'Test Description',
      group_id: testGroup._id,
      basepath: '/api',
    };

    const project = new Project(projectData);
    await project.save();

    expect(project._id).toBeDefined();
    expect(project.project_name).toBe(projectData.project_name);
    expect(project.project_desc).toBe(projectData.project_desc);
    expect(project.group_id.toString()).toBe(testGroup._id.toString());
  });

  it('should require project_name', async () => {
    const project = new Project({
      project_desc: 'Test Description',
      group_id: testGroup._id,
    });
    
    await expect(project.save()).rejects.toThrow();
  });

  it('should have default empty environments array', async () => {
    const project = new Project({
      project_name: 'Test Project',
      group_id: testGroup._id,
    });
    await project.save();

    expect(project.env).toBeDefined();
    expect(Array.isArray(project.env)).toBe(true);
  });
});

describe('ProjectController', () => {
  let testUser;
  let testGroup;
  let testProject;
  let superAdmin;

  beforeEach(async () => {
    const { connectTestDB, ensureConnection } = await import('./test-helpers.js');
    try {
      await connectTestDB();
      await ensureConnection();
    } catch (error) {
      if (error.message?.includes('authentication')) {
        throw new Error('MongoDB authentication required');
      }
      throw error;
    }
    
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
    await OperationLog.deleteMany({});

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
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
    await OperationLog.deleteMany({});
  });

  describe('list', () => {
    it('should list projects for user', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser);
      await ProjectController.list(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(Array.isArray(ctx.body.data)).toBe(true);
    });

    it('should filter by group_id', async () => {
      const ctx = createMockCtx({}, { group_id: testGroup._id.toString() }, {}, testUser);
      await ProjectController.list(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });

    it('should return empty array for user with no projects', async () => {
      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'Test1234',
      });

      const ctx = createMockCtx({}, {}, {}, otherUser);
      await ProjectController.list(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toEqual([]);
    });
  });

  describe('add', () => {
    it('should create project successfully', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          project_name: 'New Project',
          project_desc: 'New Description',
          group_id: testGroup._id.toString(),
          basepath: '/api',
        },
        testUser
      );
      await ProjectController.add(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('project_name', 'New Project');
    });

    it('should return 400 if project_name is missing', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          project_desc: 'Description',
          group_id: testGroup._id.toString(),
        },
        testUser
      );
      await ProjectController.add(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 400 for invalid group_id', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          project_name: 'New Project',
          group_id: 'invalid',
        },
        testUser
      );
      await ProjectController.add(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('get', () => {
    it('should get project by id', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser);
      ctx.query.id = testProject._id.toString();
      await ProjectController.get(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('_id');
    });

    it('should return 400 for invalid id', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser);
      ctx.query.id = 'invalid';
      await ProjectController.get(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({}, {}, {}, testUser);
      ctx.query.id = fakeId.toString();
      await ProjectController.get(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('update', () => {
    it('should update project successfully', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          id: testProject._id.toString(),
          project_name: 'Updated Project',
          project_desc: 'Updated Description',
        },
        testUser
      );
      await ProjectController.update(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('project_name', 'Updated Project');
    });

    it('should return 400 for invalid id', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          id: 'invalid',
          project_name: 'Updated',
        },
        testUser
      );
      await ProjectController.update(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete project successfully', async () => {
      const projectToDelete = await Project.create({
        project_name: 'To Delete',
        group_id: testGroup._id,
        uid: testUser._id,
      });

      const ctx = createMockCtx(
        {},
        {},
        {
          id: projectToDelete._id.toString(),
        },
        testUser
      );
      await ProjectController.delete(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);

      const deleted = await Project.findById(projectToDelete._id);
      expect(deleted).toBeNull();
    });

    it('should return 400 for invalid id', async () => {
      const ctx = createMockCtx({}, {}, { id: 'invalid' }, testUser);
      await ProjectController.delete(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('listAllProjects', () => {
    it('should list all projects for super_admin', async () => {
      const ctx = createMockCtx({}, {}, {}, superAdmin);
      await ProjectController.listAllProjects(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(Array.isArray(ctx.body.data)).toBe(true);
    });

    it('should return 403 for non-admin user', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser);
      await ProjectController.listAllProjects(ctx);

      expect(ctx.status).toBe(403);
      expect(ctx.body.success).toBe(false);
    });
  });
});

