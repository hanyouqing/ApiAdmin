import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import TestCollection from '../../Server/Models/TestCollection.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';
import User from '../../Server/Models/User.js';

describe('TestCollection Model', () => {
  let testUser;
  let testGroup;
  let testProject;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await TestCollection.deleteMany({});
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
    await TestCollection.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  it('should create a test collection with valid data', async () => {
    const collectionData = {
      name: 'Test Collection',
      description: 'Test Description',
      project_id: testProject._id,
      uid: testUser._id,
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
