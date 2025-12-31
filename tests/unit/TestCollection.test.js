import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import TestCollection from '../../Server/Models/TestCollection.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';

describe('TestCollection Model', () => {
  let testGroup;
  let testProject;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await TestCollection.deleteMany({});
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
    await TestCollection.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
  });

  it('should create a test collection with valid data', async () => {
    const collectionData = {
      name: 'Test Collection',
      description: 'Test Description',
      project_id: testProject._id,
    };

    const collection = new TestCollection(collectionData);
    await collection.save();

    expect(collection._id).toBeDefined();
    expect(collection.name).toBe(collectionData.name);
    expect(collection.description).toBe(collectionData.description);
    expect(collection.project_id.toString()).toBe(testProject._id.toString());
  });

  it('should require name and project_id', async () => {
    const collection = new TestCollection({
      description: 'Test Description',
    });
    
    await expect(collection.save()).rejects.toThrow();
  });
});


