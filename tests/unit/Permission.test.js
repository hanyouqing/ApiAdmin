import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import PermissionController from '../../Server/Controllers/Permission.js';
import ProjectMember from '../../Server/Models/ProjectMember.js';
import GroupMember from '../../Server/Models/GroupMember.js';
import RolePermission from '../../Server/Models/RolePermission.js';
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

describe('PermissionController', () => {
  let testUser;
  let superAdmin;
  let testGroup;
  let testProject;
  let otherUser;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await ProjectMember.deleteMany({});
    await GroupMember.deleteMany({});
    await RolePermission.deleteMany({});
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

    otherUser = await User.create({
      username: 'other',
      email: 'other@example.com',
      password: 'Other1234',
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
    await ProjectMember.deleteMany({});
    await GroupMember.deleteMany({});
    await RolePermission.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  describe('addProjectMember', () => {
    it('should add project member successfully', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          project_id: testProject._id.toString(),
          user_id: otherUser._id.toString(),
          role: 'developer',
        },
        testUser
      );
      await PermissionController.addProjectMember(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);

      const member = await ProjectMember.findOne({
        project_id: testProject._id,
        user_id: otherUser._id,
      });
      expect(member).toBeDefined();
      expect(member.role).toBe('developer');
    });

    it('should return 400 for invalid IDs', async () => {
      const ctx = createMockCtx({}, {}, { project_id: 'invalid', user_id: 'invalid' }, testUser);
      await PermissionController.addProjectMember(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx(
        {},
        {},
        {
          project_id: fakeId.toString(),
          user_id: otherUser._id.toString(),
        },
        testUser
      );
      await PermissionController.addProjectMember(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx(
        {},
        {},
        {
          project_id: testProject._id.toString(),
          user_id: fakeId.toString(),
        },
        testUser
      );
      await PermissionController.addProjectMember(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 400 if user is already a member', async () => {
      await ProjectMember.create({
        project_id: testProject._id,
        user_id: otherUser._id,
        role: 'viewer',
        invited_by: testUser._id,
      });

      const ctx = createMockCtx(
        {},
        {},
        {
          project_id: testProject._id.toString(),
          user_id: otherUser._id.toString(),
        },
        testUser
      );
      await PermissionController.addProjectMember(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 403 if user lacks permission', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          project_id: testProject._id.toString(),
          user_id: otherUser._id.toString(),
        },
        otherUser
      );
      await PermissionController.addProjectMember(ctx);

      expect(ctx.status).toBe(403);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('updateProjectMember', () => {
    it('should update project member successfully', async () => {
      await ProjectMember.create({
        project_id: testProject._id,
        user_id: otherUser._id,
        role: 'viewer',
        invited_by: testUser._id,
      });

      const ctx = createMockCtx(
        { project_id: testProject._id.toString(), user_id: otherUser._id.toString() },
        {},
        {
          role: 'developer',
        },
        testUser
      );
      await PermissionController.updateProjectMember(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.role).toBe('developer');
    });

    it('should return 400 for invalid IDs', async () => {
      const ctx = createMockCtx({ project_id: 'invalid', user_id: 'invalid' }, {}, {}, testUser);
      await PermissionController.updateProjectMember(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent member', async () => {
      const ctx = createMockCtx(
        { project_id: testProject._id.toString(), user_id: otherUser._id.toString() },
        {},
        {},
        testUser
      );
      await PermissionController.updateProjectMember(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });

    it('should not allow changing owner role', async () => {
      await ProjectMember.create({
        project_id: testProject._id,
        user_id: otherUser._id,
        role: 'owner',
        invited_by: testUser._id,
      });

      const ctx = createMockCtx(
        { project_id: testProject._id.toString(), user_id: otherUser._id.toString() },
        {},
        {
          role: 'developer',
        },
        testUser
      );
      await PermissionController.updateProjectMember(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('removeProjectMember', () => {
    it('should remove project member successfully', async () => {
      await ProjectMember.create({
        project_id: testProject._id,
        user_id: otherUser._id,
        role: 'developer',
        invited_by: testUser._id,
      });

      const ctx = createMockCtx(
        { project_id: testProject._id.toString(), user_id: otherUser._id.toString() },
        {},
        {},
        testUser
      );
      await PermissionController.removeProjectMember(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);

      const member = await ProjectMember.findOne({
        project_id: testProject._id,
        user_id: otherUser._id,
      });
      expect(member).toBeNull();
    });

    it('should return 400 for invalid IDs', async () => {
      const ctx = createMockCtx({ project_id: 'invalid', user_id: 'invalid' }, {}, {}, testUser);
      await PermissionController.removeProjectMember(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent member', async () => {
      const ctx = createMockCtx(
        { project_id: testProject._id.toString(), user_id: otherUser._id.toString() },
        {},
        {},
        testUser
      );
      await PermissionController.removeProjectMember(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });

    it('should not allow removing owner', async () => {
      await ProjectMember.create({
        project_id: testProject._id,
        user_id: otherUser._id,
        role: 'owner',
        invited_by: testUser._id,
      });

      const ctx = createMockCtx(
        { project_id: testProject._id.toString(), user_id: otherUser._id.toString() },
        {},
        {},
        testUser
      );
      await PermissionController.removeProjectMember(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('listProjectMembers', () => {
    it('should list project members', async () => {
      await ProjectMember.create({
        project_id: testProject._id,
        user_id: otherUser._id,
        role: 'developer',
        invited_by: testUser._id,
      });

      const ctx = createMockCtx({ project_id: testProject._id.toString() }, {}, {}, testUser);
      await PermissionController.listProjectMembers(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 400 for invalid project_id', async () => {
      const ctx = createMockCtx({ project_id: 'invalid' }, {}, {}, testUser);
      await PermissionController.listProjectMembers(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('batchAddProjectMembers', () => {
    it('should batch add members successfully', async () => {
      const thirdUser = await User.create({
        username: 'third',
        email: 'third@example.com',
        password: 'Third1234',
      });

      const ctx = createMockCtx(
        {},
        {},
        {
          project_id: testProject._id.toString(),
          members: [
            {
              user_id: otherUser._id.toString(),
              role: 'developer',
            },
            {
              user_id: thirdUser._id.toString(),
              role: 'viewer',
            },
          ],
        },
        testUser
      );
      await PermissionController.batchAddProjectMembers(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.successCount).toBe(2);
    });

    it('should return 400 if members array is empty', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          project_id: testProject._id.toString(),
          members: [],
        },
        testUser
      );
      await PermissionController.batchAddProjectMembers(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should handle partial failures', async () => {
      await ProjectMember.create({
        project_id: testProject._id,
        user_id: otherUser._id,
        role: 'developer',
        invited_by: testUser._id,
      });

      const thirdUser = await User.create({
        username: 'third',
        email: 'third@example.com',
        password: 'Third1234',
      });

      const ctx = createMockCtx(
        {},
        {},
        {
          project_id: testProject._id.toString(),
          members: [
            {
              user_id: otherUser._id.toString(),
              role: 'developer',
            },
            {
              user_id: thirdUser._id.toString(),
              role: 'viewer',
            },
          ],
        },
        testUser
      );
      await PermissionController.batchAddProjectMembers(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.failedCount).toBeGreaterThan(0);
    });
  });

  describe('addGroupMember', () => {
    it('should add group member successfully', async () => {
      const ctx = createMockCtx(
        {},
        {},
        {
          group_id: testGroup._id.toString(),
          user_id: otherUser._id.toString(),
          role: 'member',
        },
        testUser
      );
      await PermissionController.addGroupMember(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);

      const member = await GroupMember.findOne({
        group_id: testGroup._id,
        user_id: otherUser._id,
      });
      expect(member).toBeDefined();
    });

    it('should return 400 for invalid IDs', async () => {
      const ctx = createMockCtx({}, {}, { group_id: 'invalid', user_id: 'invalid' }, testUser);
      await PermissionController.addGroupMember(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('listRolePermissions', () => {
    it('should list role permissions', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser);
      await PermissionController.listRolePermissions(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(Array.isArray(ctx.body.data)).toBe(true);
    });
  });

  describe('getRolePermission', () => {
    it('should get role permission', async () => {
      const ctx = createMockCtx({ role: 'developer' }, {}, {}, testUser);
      await PermissionController.getRolePermission(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });

    it('should return 400 for invalid role', async () => {
      const ctx = createMockCtx({ role: 'invalid_role' }, {}, {}, testUser);
      await PermissionController.getRolePermission(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('updateRolePermission', () => {
    it('should update role permission for super admin', async () => {
      const ctx = createMockCtx(
        { role: 'developer' },
        {},
        {
          permissions: {
            read: true,
            write: true,
          },
        },
        superAdmin
      );
      await PermissionController.updateRolePermission(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });

    it('should return 403 for non-super-admin', async () => {
      const ctx = createMockCtx(
        { role: 'developer' },
        {},
        {
          permissions: {
            read: true,
          },
        },
        testUser
      );
      await PermissionController.updateRolePermission(ctx);

      expect(ctx.status).toBe(403);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 400 for invalid role', async () => {
      const ctx = createMockCtx({ role: 'invalid_role' }, {}, {}, superAdmin);
      await PermissionController.updateRolePermission(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });
  });

  describe('getUserProjectPermission', () => {
    it('should get user project permission', async () => {
      const ctx = createMockCtx({ project_id: testProject._id.toString() }, {}, {}, testUser);
      await PermissionController.getUserProjectPermission(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toHaveProperty('isOwner');
      expect(ctx.body.data).toHaveProperty('isSuperAdmin');
      expect(ctx.body.data).toHaveProperty('role');
      expect(ctx.body.data).toHaveProperty('permissions');
      expect(ctx.body.data).toHaveProperty('hasFullAccess');
    });

    it('should return 400 for invalid project_id', async () => {
      const ctx = createMockCtx({ project_id: 'invalid' }, {}, {}, testUser);
      await PermissionController.getUserProjectPermission(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const ctx = createMockCtx({ project_id: fakeId.toString() }, {}, {}, testUser);
      await PermissionController.getUserProjectPermission(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body.success).toBe(false);
    });

    it('should identify owner correctly', async () => {
      const ctx = createMockCtx({ project_id: testProject._id.toString() }, {}, {}, testUser);
      await PermissionController.getUserProjectPermission(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.data.isOwner).toBe(true);
    });

    it('should identify super admin correctly', async () => {
      const ctx = createMockCtx({ project_id: testProject._id.toString() }, {}, {}, superAdmin);
      await PermissionController.getUserProjectPermission(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.data.isSuperAdmin).toBe(true);
    });
  });
});

