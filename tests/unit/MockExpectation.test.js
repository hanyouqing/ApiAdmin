import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import MockExpectation from '../../Server/Models/MockExpectation.js';
import Interface from '../../Server/Models/Interface.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';
import User from '../../Server/Models/User.js';

describe('MockExpectation Model', () => {
  let testUser;
  let testGroup;
  let testProject;
  let testInterface;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await MockExpectation.deleteMany({});
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

    testInterface = await Interface.create({
      title: 'Test Interface',
      path: '/api/test',
      method: 'GET',
      project_id: testProject._id,
      uid: testUser._id,
    });
  });

  afterEach(async () => {
    await MockExpectation.deleteMany({});
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  it('should create a mock expectation with valid data', async () => {
    const expectationData = {
      name: 'Test Expectation',
      interface_id: testInterface._id,
      project_id: testProject._id,
      uid: testUser._id,
      response: {
        status: 200,
        body: JSON.stringify({ message: 'test' }),
      },
    };

    const expectation = new MockExpectation(expectationData);
    await expectation.save();

    expect(expectation._id).toBeDefined();
    expect(expectation.name).toBe(expectationData.name);
    expect(expectation.interface_id.toString()).toBe(testInterface._id.toString());
  });

  it('should require name and interface_id', async () => {
    const expectation = new MockExpectation({
      response: { status: 200 },
    });
    
    await expect(expectation.save()).rejects.toThrow();
  });
});
