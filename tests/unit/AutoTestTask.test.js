import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import AutoTestTaskController from '../../Server/Controllers/AutoTestTask.js';
import AutoTestTask from '../../Server/Models/AutoTestTask.js';
import AutoTestResult from '../../Server/Models/AutoTestResult.js';
import TestEnvironment from '../../Server/Models/TestEnvironment.js';
import Interface from '../../Server/Models/Interface.js';
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

describe('AutoTestTaskController', () => {
  let testUser;
  let testGroup;
  let testProject;
  let testInterface;
  let testEnvironment;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await AutoTestResult.deleteMany({});
    await AutoTestTask.deleteMany({});
    await TestEnvironment.deleteMany({});
    await Interface.deleteMany({});
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

    testInterface = await Interface.create({
      title: 'Test Interface',
      path: '/api/test',
      method: 'GET',
      project_id: testProject._id,
    });

    testEnvironment = await TestEnvironment.create({
      name: 'Test Environment',
      project_id: testProject._id,
      base_url: 'https://api.test.com',
      is_default: true,
      createdBy: testUser._id,
    });
  });

  afterEach(async () => {
    await AutoTestResult.deleteMany({});
    await AutoTestTask.deleteMany({});
    await TestEnvironment.deleteMany({});
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  describe('createTask', () => {
    it('should create task successfully', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          name: 'Test Task',
          description: 'Test Description',
          project_id: testProject._id.toString(),
          test_cases: [
            {
              interface_id: testInterface._id.toString(),
              enabled: true,
            },
          ],
          environment_id: testEnvironment._id.toString(),
        },
        testUser
      );
      await AutoTestTaskController.createTask(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('name', 'Test Task');
    });

    it('should return 400 if name is missing', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          project_id: testProject._id.toString(),
        },
        testUser
      );
      await AutoTestTaskController.createTask(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 400 if project_id is missing', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          name: 'Test Task',
        },
        testUser
      );
      await AutoTestTaskController.createTask(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 400 for invalid project_id', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          name: 'Test Task',
          project_id: 'invalid',
        },
        testUser
      );
      await AutoTestTaskController.createTask(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx(
        {},
        {},
        {
          name: 'Test Task',
          project_id: fakeId.toString(),
        },
        testUser
      );
      await AutoTestTaskController.createTask(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });

    it('should validate interface belongs to project', async () => {
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

      const ctx = createMockCtx(
        {},
        {},
        {
          name: 'Test Task',
          project_id: testProject._id.toString(),
          test_cases: [
            {
              interface_id: otherInterface._id.toString(),
            },
          ],
        },
        testUser
      );
      await AutoTestTaskController.createTask(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should validate environment belongs to project', async () => {
      const otherProject = await Project.create({
        project_name: 'Other Project',
        group_id: testGroup._id,
        uid: testUser._id,
      });

      const otherEnv = await TestEnvironment.create({
        name: 'Other Environment',
        project_id: otherProject._id,
        base_url: 'https://other.test.com',
        createdBy: testUser._id,
      });

      const ctx = createMockCtx(
        {},
        {},
        {
          name: 'Test Task',
          project_id: testProject._id.toString(),
          environment_id: otherEnv._id.toString(),
        },
        testUser
      );
      await AutoTestTaskController.createTask(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('listTasks', () => {
    it('should list all tasks', async () => {
      await AutoTestTask.create({
        name: 'Task 1',
        project_id: testProject._id,
        test_cases: [],
        createdBy: testUser._id,
      });

      await AutoTestTask.create({
        name: 'Task 2',
        project_id: testProject._id,
        test_cases: [],
        createdBy: testUser._id,
      });

      const ctx = createMockCtx({}, {}, {}, testUser);
      await AutoTestTaskController.listTasks(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by project_id', async () => {
      const otherProject = await Project.create({
        project_name: 'Other Project',
        group_id: testGroup._id,
        uid: testUser._id,
      });

      await AutoTestTask.create({
        name: 'Task 1',
        project_id: testProject._id,
        test_cases: [],
        createdBy: testUser._id,
      });

      await AutoTestTask.create({
        name: 'Task 2',
        project_id: otherProject._id,
        test_cases: [],
        createdBy: testUser._id,
      });

      const ctx = createMockCtx({}, { project_id: testProject._id.toString() }, {}, testUser);
      await AutoTestTaskController.listTasks(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.every(t => t.project_id._id.toString() === testProject._id.toString())).toBe(true);
    });

    it('should filter by enabled status', async () => {
      await AutoTestTask.create({
        name: 'Enabled Task',
        project_id: testProject._id,
        test_cases: [],
        enabled: true,
        createdBy: testUser._id,
      });

      await AutoTestTask.create({
        name: 'Disabled Task',
        project_id: testProject._id,
        test_cases: [],
        enabled: false,
        createdBy: testUser._id,
      });

      const ctx = createMockCtx({}, { enabled: 'true' }, {}, testUser);
      await AutoTestTaskController.listTasks(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.every(t => t.enabled === true)).toBe(true);
    });
  });

  describe('getTask', () => {
    it('should get task by id', async () => {
      const task = await AutoTestTask.create({
        name: 'Test Task',
        project_id: testProject._id,
        test_cases: [],
        createdBy: testUser._id,
      });

      const ctx = createMockCtx({ id: task._id.toString() }, {}, {}, testUser);
      await AutoTestTaskController.getTask(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.name).toBe('Test Task');
    });

    it('should return 400 for invalid id', async () => {
      const ctx = createMockCtx({ id: 'invalid' }, {}, {}, testUser);
      await AutoTestTaskController.getTask(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({ id: fakeId.toString() }, {}, {}, testUser);
      await AutoTestTaskController.getTask(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const task = await AutoTestTask.create({
        name: 'Original Name',
        project_id: testProject._id,
        test_cases: [],
        createdBy: testUser._id,
      });

      const ctx = createMockCtx(
        { id: task._id.toString() },
        {},
        {
          name: 'Updated Name',
          description: 'Updated Description',
        },
        testUser
      );
      await AutoTestTaskController.updateTask(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.name).toBe('Updated Name');
    });

    it('should return 400 for invalid id', async () => {
      const ctx = createMockCtx({ id: 'invalid' }, {}, { name: 'Updated' }, testUser);
      await AutoTestTaskController.updateTask(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({ id: fakeId.toString() }, {}, { name: 'Updated' }, testUser);
      await AutoTestTaskController.updateTask(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      const task = await AutoTestTask.create({
        name: 'Test Task',
        project_id: testProject._id,
        test_cases: [],
        createdBy: testUser._id,
      });

      const ctx = createMockCtx({ id: task._id.toString() }, {}, {}, testUser);
      await AutoTestTaskController.deleteTask(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);

      const deleted = await AutoTestTask.findById(task._id);
      expect(deleted).toBeNull();
    });

    it('should return 400 for invalid id', async () => {
      const ctx = createMockCtx({ id: 'invalid' }, {}, {}, testUser);
      await AutoTestTaskController.deleteTask(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({ id: fakeId.toString() }, {}, {}, testUser);
      await AutoTestTaskController.deleteTask(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('runTask', () => {
    it('should run task successfully', async () => {
      const task = await AutoTestTask.create({
        name: 'Test Task',
        project_id: testProject._id,
        test_cases: [
          {
            interface_id: testInterface._id,
            enabled: true,
          },
        ],
        enabled: true,
        createdBy: testUser._id,
      });

      const ctx = createMockCtx({ id: task._id.toString() }, {}, {}, testUser);
      await AutoTestTaskController.runTask(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('resultId');
      expect(ctx.body.data).toHaveProperty('status', 'running');
    });

    it('should return 400 if task is disabled', async () => {
      const task = await AutoTestTask.create({
        name: 'Disabled Task',
        project_id: testProject._id,
        test_cases: [],
        enabled: false,
        createdBy: testUser._id,
      });

      const ctx = createMockCtx({ id: task._id.toString() }, {}, {}, testUser);
      await AutoTestTaskController.runTask(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should use provided environment_id', async () => {
      const task = await AutoTestTask.create({
        name: 'Test Task',
        project_id: testProject._id,
        test_cases: [
          {
            interface_id: testInterface._id,
            enabled: true,
          },
        ],
        enabled: true,
        createdBy: testUser._id,
      });

      const ctx = createMockCtx(
        { id: task._id.toString() },
        {},
        { environment_id: testEnvironment._id.toString() },
        testUser
      );
      await AutoTestTaskController.runTask(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });
  });

  describe('getResult', () => {
    it('should get result by id', async () => {
      const task = await AutoTestTask.create({
        name: 'Test Task',
        project_id: testProject._id,
        test_cases: [],
        createdBy: testUser._id,
      });

      const result = await AutoTestResult.create({
        task_id: task._id,
        status: 'completed',
        summary: { total: 1, passed: 1, failed: 0, error: 0, skipped: 0 },
        results: [],
        started_at: new Date(),
        triggered_by: 'manual',
        triggered_by_user: testUser._id,
      });

      const ctx = createMockCtx({ resultId: result._id.toString() }, {}, {}, testUser);
      await AutoTestTaskController.getResult(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.status).toBe('completed');
    });

    it('should return 400 for invalid id', async () => {
      const ctx = createMockCtx({ resultId: 'invalid' }, {}, {}, testUser);
      await AutoTestTaskController.getResult(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent result', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({ resultId: fakeId.toString() }, {}, {}, testUser);
      await AutoTestTaskController.getResult(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('getTaskHistory', () => {
    it('should get task history with pagination', async () => {
      const task = await AutoTestTask.create({
        name: 'Test Task',
        project_id: testProject._id,
        test_cases: [],
        createdBy: testUser._id,
      });

      await AutoTestResult.create({
        task_id: task._id,
        status: 'completed',
        summary: { total: 1, passed: 1, failed: 0, error: 0, skipped: 0 },
        results: [],
        started_at: new Date(),
        triggered_by: 'manual',
        triggered_by_user: testUser._id,
      });

      const ctx = createMockCtx({ id: task._id.toString() }, { page: 1, pageSize: 10 }, {}, testUser);
      await AutoTestTaskController.getTaskHistory(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('list');
      expect(ctx.body.data).toHaveProperty('pagination');
      expect(ctx.body.data.pagination.page).toBe(1);
    });

    it('should return 400 for invalid id', async () => {
      const ctx = createMockCtx({ id: 'invalid' }, {}, {}, testUser);
      await AutoTestTaskController.getTaskHistory(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });
  });
});

