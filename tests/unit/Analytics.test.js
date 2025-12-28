import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import AnalyticsController from '../../Server/Controllers/Analytics.js';
import Project from '../../Server/Models/Project.js';
import Interface from '../../Server/Models/Interface.js';
import TestCollection from '../../Server/Models/TestCollection.js';
import TestResult from '../../Server/Models/TestResult.js';
import TestCase from '../../Server/Models/TestCase.js';
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

describe('AnalyticsController', () => {
  let testUser;
  let testGroup;
  let testProject;
  let testInterface;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      mongoose.set('bufferCommands', false);
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test', {
        serverSelectionTimeoutMS: 5000,
      });
    }
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        if (mongoose.connection.readyState === 1) {
          resolve();
        } else {
          mongoose.connection.once('connected', resolve);
          setTimeout(() => resolve(), 5000);
        }
      });
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB connection failed');
      }
    }
    await TestResult.deleteMany({});
    await TestCase.deleteMany({});
    await TestCollection.deleteMany({});
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
      desc: 'Test description',
      res_body: '{"test": "data"}',
    });
  });

  afterEach(async () => {
    await TestResult.deleteMany({});
    await TestCase.deleteMany({});
    await TestCollection.deleteMany({});
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  describe('getProjectHealth', () => {
    it('should return project health data', async () => {
      const ctx = createMockCtx({ projectId: testProject._id.toString() }, {}, {}, testUser);
      await AnalyticsController.getProjectHealth(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('totalInterfaces');
      expect(ctx.body.data).toHaveProperty('documentedInterfaces');
      expect(ctx.body.data).toHaveProperty('documentationCoverage');
      expect(ctx.body.data).toHaveProperty('mockUsageRate');
      expect(ctx.body.data).toHaveProperty('testPassRate');
      expect(ctx.body.data).toHaveProperty('score');
    });

    it('should return 400 for invalid project ID', async () => {
      const ctx = createMockCtx({ projectId: 'invalid' }, {}, {}, testUser);
      await AnalyticsController.getProjectHealth(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({ projectId: fakeId.toString() }, {}, {}, testUser);
      await AnalyticsController.getProjectHealth(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });

    it('should calculate documentation coverage correctly', async () => {
      await Interface.create({
        title: 'Undocumented Interface',
        path: '/api/undoc',
        method: 'GET',
        project_id: testProject._id,
      });

      const ctx = createMockCtx({ projectId: testProject._id.toString() }, {}, {}, testUser);
      await AnalyticsController.getProjectHealth(ctx);

      expect(ctx.body.data.totalInterfaces).toBe(2);
      expect(ctx.body.data.documentedInterfaces).toBe(1);
      expect(ctx.body.data.documentationCoverage).toBe(0.5);
    });

    it('should handle empty project', async () => {
      const emptyProject = await Project.create({
        project_name: 'Empty Project',
        group_id: testGroup._id,
        uid: testUser._id,
      });

      const ctx = createMockCtx({ projectId: emptyProject._id.toString() }, {}, {}, testUser);
      await AnalyticsController.getProjectHealth(ctx);

      expect(ctx.body.data.totalInterfaces).toBe(0);
      expect(ctx.body.data.documentationCoverage).toBe(0);
      expect(ctx.body.data.mockUsageRate).toBe(0);
      expect(ctx.body.data.testPassRate).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      const ctx = createMockCtx({ projectId: testProject._id.toString() }, {}, {}, testUser);
      vi.spyOn(Project, 'findById').mockRejectedValueOnce(new Error('Database error'));

      await AnalyticsController.getProjectHealth(ctx);

      expect(ctx.status).toBe(500);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('getInterfaceQuality', () => {
    it('should return interface quality data', async () => {
      const testCollection = await TestCollection.create({
        name: 'Test Collection',
        project_id: testProject._id,
      });

      const testCase = await TestCase.create({
        name: 'Test Case',
        collection_id: testCollection._id,
        interface_id: testInterface._id,
      });

      await TestResult.create({
        test_case_id: testCase._id,
        collection_id: testCollection._id,
        status: 'passed',
        duration: 100,
        run_at: new Date(),
      });

      const ctx = createMockCtx({ id: testInterface._id.toString() }, {}, {}, testUser);
      await AnalyticsController.getInterfaceQuality(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('testHistory');
      expect(ctx.body.data.testHistory).toHaveProperty('totalRuns');
      expect(ctx.body.data.testHistory).toHaveProperty('successRate');
    });

    it('should return 400 for invalid interface ID', async () => {
      const ctx = createMockCtx({ id: 'invalid' }, {}, {}, testUser);
      await AnalyticsController.getInterfaceQuality(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should calculate success rate correctly', async () => {
      const testCollection = await TestCollection.create({
        name: 'Test Collection',
        project_id: testProject._id,
      });

      const testCase = await TestCase.create({
        name: 'Test Case',
        collection_id: testCollection._id,
        interface_id: testInterface._id,
      });

      await TestResult.create({
        test_case_id: testCase._id,
        collection_id: testCollection._id,
        status: 'passed',
        duration: 100,
        run_at: new Date(),
      });

      await TestResult.create({
        test_case_id: testCase._id,
        collection_id: testCollection._id,
        status: 'failed',
        duration: 50,
        run_at: new Date(),
      });

      const ctx = createMockCtx({ id: testInterface._id.toString() }, {}, {}, testUser);
      await AnalyticsController.getInterfaceQuality(ctx);

      expect(ctx.body.data.testHistory.totalRuns).toBe(2);
      expect(ctx.body.data.testHistory.successRate).toBe(0.5);
    });

    it('should calculate average response time', async () => {
      const testCollection = await TestCollection.create({
        name: 'Test Collection',
        project_id: testProject._id,
      });

      const testCase = await TestCase.create({
        name: 'Test Case',
        collection_id: testCollection._id,
        interface_id: testInterface._id,
      });

      await TestResult.create({
        test_case_id: testCase._id,
        collection_id: testCollection._id,
        status: 'passed',
        duration: 100,
        run_at: new Date(),
      });

      await TestResult.create({
        test_case_id: testCase._id,
        collection_id: testCollection._id,
        status: 'passed',
        duration: 200,
        run_at: new Date(),
      });

      const ctx = createMockCtx({ id: testInterface._id.toString() }, {}, {}, testUser);
      await AnalyticsController.getInterfaceQuality(ctx);

      expect(ctx.body.data.testHistory.averageResponseTime).toBe(150);
    });

    it('should handle interface with no test results', async () => {
      const ctx = createMockCtx({ id: testInterface._id.toString() }, {}, {}, testUser);
      await AnalyticsController.getInterfaceQuality(ctx);

      expect(ctx.body.data.testHistory.totalRuns).toBe(0);
      expect(ctx.body.data.testHistory.successRate).toBe(0);
      expect(ctx.body.data.testHistory.averageResponseTime).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      const ctx = createMockCtx({ id: testInterface._id.toString() }, {}, {}, testUser);
      vi.spyOn(TestCase, 'find').mockRejectedValueOnce(new Error('Database error'));

      await AnalyticsController.getInterfaceQuality(ctx);

      expect(ctx.status).toBe(500);
      expect(ctx.body.success).toBe(false);
    });
  });
});

