import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import InterfaceCat from '../../Server/Models/InterfaceCat.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';

describe('InterfaceCat Model', () => {
  let testGroup;
  let testProject;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await InterfaceCat.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});

    testGroup = new Group({ group_name: 'Test Group' });
    await testGroup.save();

    testProject = new Project({
      project_name: 'Test Project',
      group_id: testGroup._id,
    });
    await testProject.save();
  });

  afterEach(async () => {
    await InterfaceCat.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
  });

  it('should create an interface category with valid data', async () => {
    const catData = {
      name: 'Test Category',
      desc: 'Test Description',
      project_id: testProject._id,
    };

    const cat = new InterfaceCat(catData);
    await cat.save();

    expect(cat._id).toBeDefined();
    expect(cat.name).toBe(catData.name);
    expect(cat.desc).toBe(catData.desc);
    expect(cat.project_id.toString()).toBe(testProject._id.toString());
  });

  it('should require name and project_id', async () => {
    const cat = new InterfaceCat({
      desc: 'Test Description',
    });
    
    await expect(cat.save()).rejects.toThrow();
  });

  it('should have default index of 0', async () => {
    const user = new (await import('../../Server/Models/User.js')).default({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
    });
    await user.save();

    const cat = new InterfaceCat({
      name: 'Test Category',
      project_id: testProject._id,
      uid: user._id,
    });
    await cat.save();

    expect(cat.index).toBe(0);
  });

  it('should have default empty desc', async () => {
    const user = new (await import('../../Server/Models/User.js')).default({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
    });
    await user.save();

    const cat = new InterfaceCat({
      name: 'Test Category',
      project_id: testProject._id,
      uid: user._id,
    });
    await cat.save();

    expect(cat.desc).toBe('');
  });
});

