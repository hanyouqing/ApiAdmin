import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import TestCase from '../../Server/Models/TestCase.js';
import TestCollection from '../../Server/Models/TestCollection.js';
import Interface from '../../Server/Models/Interface.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';

describe('TestCase Model', () => {
  let testGroup;
  let testProject;
  let testInterface;
  let testCollection;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await TestCase.deleteMany({});
    await TestCollection.deleteMany({});
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});

    testGroup = new Group({ group_name: 'Test Group' });
    await testGroup.save();

    testProject = new Project({
      project_name: 'Test Project',
      group_id: testGroup._id,
    });
    await testProject.save();

    testInterface = new Interface({
      title: 'Test Interface',
      path: '/api/test',
      method: 'GET',
      project_id: testProject._id,
    });
    await testInterface.save();

    testCollection = new TestCollection({
      name: 'Test Collection',
      project_id: testProject._id,
    });
    await testCollection.save();
  });

  afterEach(async () => {
    await TestCase.deleteMany({});
    await TestCollection.deleteMany({});
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
  });

  it('should create a test case with valid data', async () => {
    const User = (await import('../../Server/Models/User.js')).default;
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
    });
    await user.save();

    const testCaseData = {
      name: 'Test Case',
      collection_id: testCollection._id,
      interface_id: testInterface._id,
      request: {
        method: 'GET',
        path: '/api/test',
      },
      uid: user._id,
    };

    const testCase = new TestCase(testCaseData);
    await testCase.save();

    expect(testCase._id).toBeDefined();
    expect(testCase.name).toBe(testCaseData.name);
    expect(testCase.collection_id.toString()).toBe(testCollection._id.toString());
    expect(testCase.interface_id.toString()).toBe(testInterface._id.toString());
  });

  it('should require name, collection_id, and interface_id', async () => {
    const testCase = new TestCase({
      request: { method: 'GET' },
    });
    
    await expect(testCase.save()).rejects.toThrow();
  });
});

