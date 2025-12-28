import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';

describe('Project Model', () => {
  let testGroup;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await Project.deleteMany({});
    await Group.deleteMany({});

    testGroup = new Group({ group_name: 'Test Group' });
    await testGroup.save();
  });

  afterEach(async () => {
    await Project.deleteMany({});
    await Group.deleteMany({});
  });

  it('should create a project with valid data', async () => {
    const projectData = {
      project_name: 'Test Project',
      project_desc: 'Test Description',
      group_id: testGroup._id,
      basepath: '/api',
    };

    const project = new Project(projectData);
    await project.save();

    expect(project._id).toBeDefined();
    expect(project.project_name).toBe(projectData.project_name);
    expect(project.project_desc).toBe(projectData.project_desc);
    expect(project.group_id.toString()).toBe(testGroup._id.toString());
  });

  it('should require project_name', async () => {
    const project = new Project({
      project_desc: 'Test Description',
      group_id: testGroup._id,
    });
    
    await expect(project.save()).rejects.toThrow();
  });

  it('should have default empty environments array', async () => {
    const project = new Project({
      project_name: 'Test Project',
      group_id: testGroup._id,
    });
    await project.save();

    expect(project.env).toBeDefined();
    expect(Array.isArray(project.env)).toBe(true);
  });
});

