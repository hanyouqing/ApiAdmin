import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import Group from '../../Server/Models/Group.js';
import User from '../../Server/Models/User.js';

describe('Group Model', () => {
  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  afterEach(async () => {
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  it('should create a group with valid data', async () => {
    const groupData = {
      group_name: 'Test Group',
      group_desc: 'Test Description',
    };

    const group = new Group(groupData);
    await group.save();

    expect(group._id).toBeDefined();
    expect(group.group_name).toBe(groupData.group_name);
    expect(group.group_desc).toBe(groupData.group_desc);
  });

  it('should require group_name', async () => {
    const group = new Group({ group_desc: 'Test Description' });
    
    await expect(group.save()).rejects.toThrow();
  });

  it('should have default empty member array', async () => {
    const group = new Group({ group_name: 'Test Group' });
    await group.save();

    expect(group.member).toBeDefined();
    expect(Array.isArray(group.member)).toBe(true);
    expect(group.member.length).toBe(0);
  });

  it('should require uid', async () => {
    const user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
    });
    await user.save();

    const group = new Group({
      group_name: 'Test Group',
      uid: user._id,
    });
    await group.save();

    expect(group.uid.toString()).toBe(user._id.toString());
  });

  it('should trim group_name', async () => {
    const group = new Group({ group_name: '  Test Group  ' });
    await group.save();
    expect(group.group_name).toBe('Test Group');
  });
});

