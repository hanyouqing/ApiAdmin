import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import AutoTestResult from '../../Server/Models/AutoTestResult.js';
import AutoTestTask from '../../Server/Models/AutoTestTask.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';
import User from '../../Server/Models/User.js';

describe('AutoTestResult report share fields', () => {
  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test', {
        serverSelectionTimeoutMS: 5000,
      });
    }
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection failed');
    }
    await AutoTestResult.deleteMany({});
    await AutoTestTask.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  it('stores share_token and expiry for public reports', async () => {
    const user = await User.create({
      username: `shareuser_${Date.now()}`,
      password: 'Password123!',
      email: `share_${Date.now()}@example.com`,
      role: 'developer',
    });
    const group = await Group.create({
      group_name: 'ShareGroup',
      uid: user._id,
    });
    const project = await Project.create({
      project_name: 'ShareProj',
      group_id: group._id,
      uid: user._id,
      basepath: '/',
    });
    const task = await AutoTestTask.create({
      name: 'task',
      project_id: project._id,
      test_cases: [],
      createdBy: user._id,
    });
    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 7 * 86400000);
    const result = await AutoTestResult.create({
      task_id: task._id,
      status: 'passed',
      summary: { total: 1, passed: 1, failed: 0, error: 0, skipped: 0 },
      results: [],
      share_token: token,
      share_expires_at: expires,
      share_created_by: user._id,
    });

    const found = await AutoTestResult.findOne({ share_token: token });
    expect(found).toBeTruthy();
    expect(found._id.toString()).toBe(result._id.toString());
    expect(found.share_expires_at.getTime()).toBe(expires.getTime());
    expect(token).toHaveLength(48);
  });
});
