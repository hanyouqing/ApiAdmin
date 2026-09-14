import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ProjectVariableStore, { entriesToMap, mapToEntries } from '../../Server/Models/ProjectVariableStore.js';
import { resolveEnvironmentContext } from '../../Server/Utils/variableResolver.js';
import Project from '../../Server/Models/Project.js';
import TestEnvironment from '../../Server/Models/TestEnvironment.js';
import User from '../../Server/Models/User.js';
import Group from '../../Server/Models/Group.js';
import ApiMonitor from '../../Server/Models/ApiMonitor.js';

describe('P2 variables + monitor helpers', () => {
  let userId;
  let projectId;

  beforeEach(async () => {
    const { connectTestDB, ensureConnection } = await import('./test-helpers.js');
    await connectTestDB();
    await ensureConnection();

    await Promise.all([
      ProjectVariableStore.deleteMany({}),
      TestEnvironment.deleteMany({}),
      ApiMonitor.deleteMany({}),
      Project.deleteMany({}),
      Group.deleteMany({}),
      User.deleteMany({}),
    ]);

    const user = await User.create({
      username: `varuser_${Date.now()}`,
      email: `varuser_${Date.now()}@example.com`,
      password: 'Test1234',
      role: 'developer',
    });
    userId = user._id;

    const group = await Group.create({
      group_name: 'Var Group',
      uid: userId,
    });

    const project = await Project.create({
      project_name: 'Var Project',
      uid: userId,
      group_id: group._id,
      env: [{ name: 'legacy', host: 'https://legacy.example.com', variables: { LEGACY: '1' } }],
    });
    projectId = project._id;
  });

  afterEach(async () => {
    await Promise.all([
      ProjectVariableStore.deleteMany({}),
      TestEnvironment.deleteMany({}),
      ApiMonitor.deleteMany({}),
      Project.deleteMany({}),
      Group.deleteMany({}),
      User.deleteMany({}),
    ]);
  });

  it('mapToEntries / entriesToMap round-trip', () => {
    const entries = mapToEntries({ a: '1', b: '2' });
    expect(entries).toHaveLength(2);
    expect(entriesToMap(entries)).toEqual({ a: '1', b: '2' });
    expect(entriesToMap([{ key: 'x', value: 'y', enabled: false, type: 'default' }])).toEqual({});
  });

  it('resolveEnvironmentContext merges globals under env', async () => {
    await ProjectVariableStore.create({
      project_id: projectId,
      globals: [
        { key: 'G', value: 'global', enabled: true, type: 'default' },
        { key: 'SHARED', value: 'from-global', enabled: true, type: 'default' },
      ],
      createdBy: userId,
    });
    await TestEnvironment.create({
      name: 'dev',
      project_id: projectId,
      base_url: 'https://dev.example.com',
      variables: { SHARED: 'from-env', TOKEN: 'abc' },
      createdBy: userId,
      is_default: true,
    });

    const ctx = await resolveEnvironmentContext(projectId, { name: 'dev' });
    expect(ctx.baseUrl).toBe('https://dev.example.com');
    expect(ctx.globals.G).toBe('global');
    expect(ctx.envMap.TOKEN).toBe('abc');
    expect(ctx.merged.SHARED).toBe('from-env');
    expect(ctx.merged.G).toBe('global');
  });

  it('creates ApiMonitor schema document', async () => {
    const monitor = await ApiMonitor.create({
      name: 'health',
      project_id: projectId,
      request: { method: 'GET', url: 'https://example.com/health' },
      createdBy: userId,
      schedule: { enabled: true, cron: '*/5 * * * *' },
    });
    expect(monitor.last_status).toBe('idle');
    expect(monitor.request.method).toBe('GET');
  });
});
