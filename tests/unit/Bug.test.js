import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Bug from '../../Server/Models/Bug.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';
import User from '../../Server/Models/User.js';

describe('Bug model', () => {
  let userId;
  let projectId;

  beforeEach(async () => {
    const { connectTestDB, ensureConnection } = await import('./test-helpers.js');
    await connectTestDB();
    await ensureConnection();

    await Promise.all([
      Bug.deleteMany({}),
      Project.deleteMany({}),
      Group.deleteMany({}),
      User.deleteMany({}),
    ]);

    const user = await User.create({
      username: `buguser_${Date.now()}`,
      email: `buguser_${Date.now()}@example.com`,
      password: 'Test1234',
      role: 'developer',
    });
    userId = user._id;

    const group = await Group.create({
      group_name: 'Bug Group',
      uid: userId,
    });

    const project = await Project.create({
      project_name: 'Bug Project',
      uid: userId,
      group_id: group._id,
    });
    projectId = project._id;
  });

  afterEach(async () => {
    await Promise.all([
      Bug.deleteMany({}),
      Project.deleteMany({}),
      Group.deleteMany({}),
      User.deleteMany({}),
    ]);
  });

  it('creates bug with defaults and unique project number', async () => {
    await Bug.syncIndexes();
    const first = await Bug.create({
      project_id: projectId,
      number: 1,
      title: 'Login 500',
      reporter_id: userId,
      description: 'POST /login returns 500',
    });
    expect(first.status).toBe('open');
    expect(first.severity).toBe('major');
    expect(first.priority).toBe('p2');
    expect(first.deleted_at).toBeNull();

    const second = await Bug.create({
      project_id: projectId,
      number: 2,
      title: 'Timeout',
      reporter_id: userId,
      severity: 'critical',
      priority: 'p0',
      monitor_id: null,
    });
    expect(second.number).toBe(2);
    expect(second.severity).toBe('critical');

    await expect(
      Bug.create({
        project_id: projectId,
        number: 1,
        title: 'dup',
        reporter_id: userId,
      })
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('supports soft delete and comments', async () => {
    const bug = await Bug.create({
      project_id: projectId,
      number: 1,
      title: 'Flaky assertion',
      reporter_id: userId,
    });
    bug.comments.push({
      user_id: userId,
      username: 'buguser',
      content: 'Reproduced on staging',
      createdAt: new Date(),
    });
    bug.deleted_at = new Date();
    await bug.save();

    const active = await Bug.find({ project_id: projectId, deleted_at: null });
    expect(active).toHaveLength(0);
    const trashed = await Bug.findById(bug._id);
    expect(trashed.comments).toHaveLength(1);
    expect(trashed.deleted_at).toBeTruthy();
  });
});
