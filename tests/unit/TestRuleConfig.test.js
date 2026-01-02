import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import TestRuleConfigController from '../../Server/Controllers/TestRuleConfig.js';
import TestRuleConfig from '../../Server/Models/TestRuleConfig.js';
import Project from '../../Server/Models/Project.js';
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

describe('TestRuleConfigController', () => {
  let testUser;
  let testProject;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await TestRuleConfig.deleteMany({});
    await Project.deleteMany({});
    await User.deleteMany({});

    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
    });

    testProject = await Project.create({
      project_name: 'Test Project',
      project_desc: 'Test Description',
      createdBy: testUser._id,
    });
  });

  afterEach(async () => {
    await TestRuleConfig.deleteMany({});
    await Project.deleteMany({});
    await User.deleteMany({});
  });

  describe('listRules', () => {
    it('should list rules for a project', async () => {
      await TestRuleConfig.create({
        project_id: testProject._id,
        name: 'Test Rule',
        type: 'assertion',
        enabled: true,
        createdBy: testUser._id,
      });

      const ctx = createMockCtx({}, { projectId: testProject._id.toString() }, {}, testUser);
      await TestRuleConfigController.listRules(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveLength(1);
      expect(ctx.body.data[0].name).toBe('Test Rule');
    });

    it('should filter rules by type', async () => {
      await TestRuleConfig.create([
        {
          project_id: testProject._id,
          name: 'Assertion Rule',
          type: 'assertion',
          enabled: true,
          createdBy: testUser._id,
        },
        {
          project_id: testProject._id,
          name: 'Request Rule',
          type: 'request',
          enabled: true,
          createdBy: testUser._id,
        },
      ]);

      const ctx = createMockCtx({}, { projectId: testProject._id.toString(), type: 'assertion' }, {}, testUser);
      await TestRuleConfigController.listRules(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveLength(1);
      expect(ctx.body.data[0].type).toBe('assertion');
    });

    it('should return error if projectId is missing', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser);
      await TestRuleConfigController.listRules(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return error if project does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({}, { projectId: fakeId.toString() }, {}, testUser);
      await TestRuleConfigController.listRules(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('createRule', () => {
    it('should create a new rule', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          projectId: testProject._id.toString(),
          name: 'New Rule',
          type: 'assertion',
          enabled: true,
        },
        testUser
      );

      await TestRuleConfigController.createRule(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.name).toBe('New Rule');
      expect(ctx.body.data.type).toBe('assertion');

      const rule = await TestRuleConfig.findById(ctx.body.data._id);
      expect(rule).not.toBeNull();
      expect(rule.name).toBe('New Rule');
    });

    it('should return error if projectId is missing', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          name: 'New Rule',
          type: 'assertion',
        },
        testUser
      );

      await TestRuleConfigController.createRule(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return error if name or type is missing', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          projectId: testProject._id.toString(),
          name: 'New Rule',
        },
        testUser
      );

      await TestRuleConfigController.createRule(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return error if type is invalid', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          projectId: testProject._id.toString(),
          name: 'New Rule',
          type: 'invalid',
        },
        testUser
      );

      await TestRuleConfigController.createRule(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should create rule with assertion_rules', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          projectId: testProject._id.toString(),
          name: 'Assertion Rule',
          type: 'assertion',
          assertion_rules: {
            status_code_check: true,
            response_time_check: true,
            max_response_time: 5000,
          },
        },
        testUser
      );

      await TestRuleConfigController.createRule(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.data.assertion_rules.status_code_check).toBe(true);
      expect(ctx.body.data.assertion_rules.max_response_time).toBe(5000);
    });
  });

  describe('updateRule', () => {
    it('should update an existing rule', async () => {
      const rule = await TestRuleConfig.create({
        project_id: testProject._id,
        name: 'Original Rule',
        type: 'assertion',
        enabled: true,
        createdBy: testUser._id,
      });

      const ctx = createMockCtx(
        { id: rule._id.toString() },
        {},
        {
          name: 'Updated Rule',
          enabled: false,
        },
        testUser
      );

      await TestRuleConfigController.updateRule(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.name).toBe('Updated Rule');
      expect(ctx.body.data.enabled).toBe(false);
    });

    it('should return error if rule does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx(
        { id: fakeId.toString() },
        {},
        {
          name: 'Updated Rule',
        },
        testUser
      );

      await TestRuleConfigController.updateRule(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });

    it('should update assertion_rules', async () => {
      const rule = await TestRuleConfig.create({
        project_id: testProject._id,
        name: 'Test Rule',
        type: 'assertion',
        enabled: true,
        assertion_rules: {
          status_code_check: true,
          max_response_time: 5000,
        },
        createdBy: testUser._id,
      });

      const ctx = createMockCtx(
        { id: rule._id.toString() },
        {},
        {
          assertion_rules: {
            max_response_time: 3000,
          },
        },
        testUser
      );

      await TestRuleConfigController.updateRule(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.data.assertion_rules.status_code_check).toBe(true);
      expect(ctx.body.data.assertion_rules.max_response_time).toBe(3000);
    });
  });

  describe('deleteRule', () => {
    it('should delete an existing rule', async () => {
      const rule = await TestRuleConfig.create({
        project_id: testProject._id,
        name: 'Rule to Delete',
        type: 'assertion',
        enabled: true,
        createdBy: testUser._id,
      });

      const ctx = createMockCtx({ id: rule._id.toString() }, {}, {}, testUser);
      await TestRuleConfigController.deleteRule(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);

      const deletedRule = await TestRuleConfig.findById(rule._id);
      expect(deletedRule).toBeNull();
    });

    it('should return error if rule does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({ id: fakeId.toString() }, {}, {}, testUser);
      await TestRuleConfigController.deleteRule(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('getRule', () => {
    it('should get rule details', async () => {
      const rule = await TestRuleConfig.create({
        project_id: testProject._id,
        name: 'Test Rule',
        type: 'assertion',
        enabled: true,
        createdBy: testUser._id,
      });

      const ctx = createMockCtx({ id: rule._id.toString() }, {}, {}, testUser);
      await TestRuleConfigController.getRule(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.name).toBe('Test Rule');
      expect(ctx.body.data.type).toBe('assertion');
    });

    it('should return error if rule does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({ id: fakeId.toString() }, {}, {}, testUser);
      await TestRuleConfigController.getRule(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });
  });
});

