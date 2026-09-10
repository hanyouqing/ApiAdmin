import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import Interface from '../../Server/Models/Interface.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';
import User from '../../Server/Models/User.js';

describe('Interface Model', () => {
  let testUser;
  let testGroup;
  let testProject;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
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
  });

  afterEach(async () => {
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  it('should create an interface with valid data', async () => {
    const interfaceData = {
      title: 'Test Interface',
      path: '/api/test',
      method: 'GET',
      project_id: testProject._id,
      uid: testUser._id,
    };

    const interface_ = new Interface(interfaceData);
    await interface_.save();

    expect(interface_._id).toBeDefined();
    expect(interface_.title).toBe(interfaceData.title);
    expect(interface_.path).toBe(interfaceData.path);
    expect(interface_.method).toBe(interfaceData.method);
  });

  it('should require title, path, method, and project_id', async () => {
    const interface_ = new Interface({
      title: 'Test Interface',
    });
    
    await expect(interface_.save()).rejects.toThrow();
  });

  it('should have default status', async () => {
    const interface_ = new Interface({
      title: 'Test Interface',
      path: '/api/test',
      method: 'GET',
      project_id: testProject._id,
      uid: testUser._id,
    });
    await interface_.save();

    expect(interface_.status).toBeDefined();
  });
});
