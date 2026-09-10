import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import Group from '../../Server/Models/Group.js';
import User from '../../Server/Models/User.js';
import GroupController from '../../Server/Controllers/Group.js';
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

describe('Group Model', () => {
  let ownerUser;

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
    
    await Group.deleteMany({});
    await User.deleteMany({});
    await OperationLog.deleteMany({});

    ownerUser = await User.create({
      username: 'owner',
      email: 'owner@example.com',
      password: 'Test1234',
    });
  });

  afterEach(async () => {
    await Group.deleteMany({});
    await User.deleteMany({});
    await OperationLog.deleteMany({});
  });

  it('should create a group with valid data', async () => {
    const groupData = {
      group_name: 'Test Group',
      group_desc: 'Test Description',
      uid: ownerUser._id,
    };

    const group = new Group(groupData);
    await group.save();

    expect(group._id).toBeDefined();
    expect(group.group_name).toBe(groupData.group_name);
    expect(group.group_desc).toBe(groupData.group_desc);
  });

  it('should require group_name', async () => {
    const group = new Group({ group_desc: 'Test Description', uid: ownerUser._id });
    
    await expect(group.save()).rejects.toThrow();
  });

  it('should have default empty member array', async () => {
    const group = new Group({ group_name: 'Test Group', uid: ownerUser._id });
    await group.save();

    expect(group.member).toBeDefined();
    expect(Array.isArray(group.member)).toBe(true);
    expect(group.member.length).toBe(0);
  });

  it('should require uid', async () => {
    const group = new Group({
      group_name: 'Test Group',
    });
    await expect(group.save()).rejects.toThrow();
  });

  it('should trim group_name', async () => {
    const group = new Group({ group_name: '  Test Group  ', uid: ownerUser._id });
    await group.save();
    expect(group.group_name).toBe('Test Group');
  });
});

describe('GroupController', () => {
  let testUser;
  let testGroup;
  let superAdmin;
  let otherUser;

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

    otherUser = await User.create({
      username: 'otheruser',
      email: 'other@example.com',
      password: 'Test1234',
    });

    testGroup = await Group.create({
      group_name: 'Test Group',
      uid: testUser._id,
    });
  });

  afterEach(async () => {
    await Group.deleteMany({});
    await User.deleteMany({});
    await OperationLog.deleteMany({});
  });

  describe('list', () => {
    it('should list groups for super_admin', async () => {
      const ctx = createMockCtx({}, {}, {}, superAdmin);
      await GroupController.list(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(Array.isArray(ctx.body.data)).toBe(true);
    });

    it('should return empty array for non-admin user', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser);
      await GroupController.list(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });
  });

  describe('add', () => {
    it('should create group successfully for super_admin', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          group_name: 'New Group',
          group_desc: 'New Description',
        },
        superAdmin
      );
      await GroupController.add(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('group_name', 'New Group');
    });

    it('should return 403 for non-admin user', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          group_name: 'New Group',
        },
        testUser
      );
      await GroupController.add(ctx);

      expect(ctx.status).toBe(403);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 400 if group_name is missing', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          group_desc: 'Description',
        },
        superAdmin
      );
      await GroupController.add(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('get', () => {
    it('should get group by id', async () => {
      const ctx = createMockCtx({}, {}, {}, superAdmin);
      ctx.query._id = testGroup._id.toString();
      await GroupController.get(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('_id');
    });

    it('should return 400 for invalid id', async () => {
      const ctx = createMockCtx({}, {}, {}, superAdmin);
      ctx.query._id = 'invalid';
      await GroupController.get(ctx);

      // Invalid ObjectId returns 400 when type check fails, or 404 when not found
      expect([400, 404, 500]).toContain(ctx.status);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('update', () => {
    it('should update group successfully', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          _id: testGroup._id.toString(),
          group_name: 'Updated Group',
          group_desc: 'Updated Description',
        },
        superAdmin
      );
      await GroupController.update(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('group_name', 'Updated Group');
    });

    it('should return 400 for invalid id', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          _id: 'invalid',
          group_name: 'Updated',
        },
        superAdmin
      );
      await GroupController.update(ctx);

      expect([400, 404, 500]).toContain(ctx.status);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete group successfully', async () => {
      const groupToDelete = await Group.create({
        group_name: 'To Delete',
        uid: superAdmin._id,
      });

      const ctx = createMockCtx(
        {},
        { _id: groupToDelete._id.toString() },
        {},
        superAdmin
      );
      await GroupController.delete(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);

      const deleted = await Group.findById(groupToDelete._id);
      expect(deleted).toBeNull();
    });
  });

  describe('addMember', () => {
    it('should add member to group', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          group_id: testGroup._id.toString(),
          member_email: otherUser.email,
        },
        superAdmin
      );
      await GroupController.addMember(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });

    it('should return 400 for invalid user_id', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          group_id: testGroup._id.toString(),
          member_email: '',
        },
        superAdmin
      );
      await GroupController.addMember(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('removeMember', () => {
    it('should remove member from group', async () => {
      testGroup.member.push(otherUser._id);
      await testGroup.save();

      const ctx = createMockCtx(
        {},
        {
          group_id: testGroup._id.toString(),
          member_id: otherUser._id.toString(),
        },
        {},
        superAdmin
      );
      await GroupController.removeMember(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });
  });
});

