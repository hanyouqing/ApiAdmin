import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { buildUnifiedDiff, suggestCodeFix } from '../../Server/Utils/codeFixSuggester.js';
import ApiMonitorRun from '../../Server/Models/ApiMonitorRun.js';
import ApiMonitor from '../../Server/Models/ApiMonitor.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';
import User from '../../Server/Models/User.js';

describe('codeFixSuggester', () => {
  let userId;
  let projectId;
  let monitorId;
  let runId;

  beforeEach(async () => {
    const { connectTestDB, ensureConnection } = await import('./test-helpers.js');
    await connectTestDB();
    await ensureConnection();

    await Promise.all([
      ApiMonitorRun.deleteMany({}),
      ApiMonitor.deleteMany({}),
      Project.deleteMany({}),
      Group.deleteMany({}),
      User.deleteMany({}),
    ]);

    const user = await User.create({
      username: `fixuser_${Date.now()}`,
      email: `fix_${Date.now()}@example.com`,
      password: 'Test1234',
      role: 'developer',
    });
    userId = user._id;
    const group = await Group.create({ group_name: 'Fix Group', uid: userId });
    const project = await Project.create({
      project_name: 'Fix Project',
      uid: userId,
      group_id: group._id,
    });
    projectId = project._id;

    const monitor = await ApiMonitor.create({
      name: 'health',
      project_id: projectId,
      request: { method: 'GET', url: 'https://example.com/api/users' },
      createdBy: userId,
    });
    monitorId = monitor._id;

    const run = await ApiMonitorRun.create({
      monitor_id: monitorId,
      project_id: projectId,
      status: 'failing',
      message: 'status_code expected 200 got 500',
      duration: 120,
      assertions: [{ name: 'status_code', passed: false }],
      request: { method: 'GET', url: 'https://example.com/api/users' },
      response: { status: 500, data: { error: 'boom' } },
      run_at: new Date(),
    });
    runId = run._id;
  });

  afterEach(async () => {
    await Promise.all([
      ApiMonitorRun.deleteMany({}),
      ApiMonitor.deleteMany({}),
      Project.deleteMany({}),
      Group.deleteMany({}),
      User.deleteMany({}),
    ]);
  });

  it('builds unified diff', () => {
    const diff = buildUnifiedDiff('a.js', 'old\n', 'new\n');
    expect(diff).toContain('--- a/a.js');
    expect(diff).toContain('-old');
    expect(diff).toContain('+new');
  });

  it('returns heuristic suggestion without AI', async () => {
    const result = await suggestCodeFix(
      { run_type: 'monitor', run_id: String(runId), project_id: String(projectId) },
      {}
    );
    expect(result.source).toMatch(/heuristic/);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files[0].diff).toContain('+++');
    expect(result.repository_configured).toBe(false);
  });

  it('uses AI JSON when callAI succeeds', async () => {
    const result = await suggestCodeFix(
      { run_type: 'monitor', run_id: String(runId) },
      {
        callAI: async () =>
          JSON.stringify({
            summary: 'Fix handler',
            files: [
              {
                path: 'src/routes/api/users.js',
                fixed_content: 'export default () => ({ ok: true })\n',
                rationale: 'return 200',
              },
            ],
          }),
      }
    );
    expect(result.source).toBe('ai');
    expect(result.summary).toBe('Fix handler');
    expect(result.files[0].path).toBe('src/routes/api/users.js');
    expect(result.files[0].diff).toContain('+export default');
  });
});
