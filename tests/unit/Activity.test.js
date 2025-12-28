import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import Activity from '../../Server/Models/Activity.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';
import User from '../../Server/Models/User.js';

describe('Activity Model', () => {
  let testUser;
  let testGroup;
  let testProject;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await Activity.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});

    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
    });
    await testUser.save();

    testGroup = new Group({
      group_name: 'Test Group',
      uid: testUser._id,
    });
    await testGroup.save();

    testProject = new Project({
      project_name: 'Test Project',
      group_id: testGroup._id,
      uid: testUser._id,
    });
    await testProject.save();
  });

  afterEach(async () => {
    await Activity.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  it('should create an activity with valid data', async () => {
    const activityData = {
      project_id: testProject._id,
      user_id: testUser._id,
      action: 'project.created',
      target_type: 'project',
      target_id: testProject._id,
      description: 'Project created',
    };

    const activity = new Activity(activityData);
    await activity.save();

    expect(activity._id).toBeDefined();
    expect(activity.project_id.toString()).toBe(testProject._id.toString());
    expect(activity.user_id.toString()).toBe(testUser._id.toString());
    expect(activity.action).toBe('project.created');
  });

  it('should require project_id, user_id, and action', async () => {
    const activity = new Activity({
      description: 'Test',
    });
    
    await expect(activity.save()).rejects.toThrow();
  });

  it('should validate action enum', async () => {
    const activity = new Activity({
      project_id: testProject._id,
      user_id: testUser._id,
      action: 'invalid.action',
    });
    
    await expect(activity.save()).rejects.toThrow();
  });

  it('should have default empty metadata', async () => {
    const activity = new Activity({
      project_id: testProject._id,
      user_id: testUser._id,
      action: 'project.created',
    });
    await activity.save();

    expect(activity.metadata).toBeDefined();
    expect(typeof activity.metadata).toBe('object');
  });
});

