import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { checkProjectPermission } from '../../Server/Middleware/permission.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';
import User from '../../Server/Models/User.js';
import Interface from '../../Server/Models/Interface.js';

function createCtx({ user, body = {}, query = {}, params = {}, path = '/api/interface/add' } = {}) {
  return {
    path,
    params,
    query,
    request: { body },
    state: { user },
    status: 200,
    body: null,
  };
}

describe('checkProjectPermission middleware', () => {
  let owner;
  let outsider;
  let admin;
  let group;
  let project;
  let iface;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});

    owner = await User.create({
      username: 'owner',
      email: 'owner@example.com',
      password: 'Test1234',
    });
    outsider = await User.create({
      username: 'outsider',
      email: 'outsider@example.com',
      password: 'Test1234',
    });
    admin = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Admin1234',
      role: 'super_admin',
    });
    group = await Group.create({
      group_name: 'G',
      uid: owner._id,
      member: [owner._id],
    });
    project = await Project.create({
      project_name: 'P',
      group_id: group._id,
      uid: owner._id,
      member: [owner._id],
    });
    iface = await Interface.create({
      project_id: project._id,
      title: 'Get User',
      path: '/users',
      method: 'GET',
      uid: owner._id,
    });
  });

  afterEach(async () => {
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  it('returns 403 when non-member mutates project interface', async () => {
    const ctx = createCtx({
      user: outsider,
      body: { project_id: project._id.toString(), title: 'x', path: '/x', method: 'GET' },
      path: '/api/interface/add',
    });
    const next = vi.fn();
    await checkProjectPermission(ctx, next);
    expect(ctx.status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows project owner', async () => {
    const ctx = createCtx({
      user: owner,
      body: { project_id: project._id.toString() },
      path: '/api/interface/add',
    });
    const next = vi.fn();
    await checkProjectPermission(ctx, next);
    expect(next).toHaveBeenCalled();
    expect(ctx.state.project._id.toString()).toBe(project._id.toString());
  });

  it('allows super_admin', async () => {
    const ctx = createCtx({
      user: admin,
      body: { project_id: project._id.toString() },
    });
    const next = vi.fn();
    await checkProjectPermission(ctx, next);
    expect(next).toHaveBeenCalled();
  });

  it('resolves project via interface _id on update path', async () => {
    const ctx = createCtx({
      user: outsider,
      body: { _id: iface._id.toString(), title: 'hijack' },
      path: '/api/interface/up',
    });
    const next = vi.fn();
    await checkProjectPermission(ctx, next);
    expect(ctx.status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows owner updating via interface _id', async () => {
    const ctx = createCtx({
      user: owner,
      body: { _id: iface._id.toString(), title: 'ok' },
      path: '/api/interface/up',
    });
    const next = vi.fn();
    await checkProjectPermission(ctx, next);
    expect(next).toHaveBeenCalled();
  });
});
