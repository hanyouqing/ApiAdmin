import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import PasswordReset from '../../Server/Models/PasswordReset.js';
import User from '../../Server/Models/User.js';

describe('PasswordReset Model', () => {
  let testUser;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await PasswordReset.deleteMany({});
    await User.deleteMany({});

    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
    });
    await testUser.save();
  });

  afterEach(async () => {
    await PasswordReset.deleteMany({});
    await User.deleteMany({});
  });

  it('should generate a token', () => {
    const token = PasswordReset.generateToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBe(64); // 32 bytes = 64 hex characters
  });

  it('should create a reset token', async () => {
    const token = await PasswordReset.createResetToken(testUser._id);
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    
    const resetToken = await PasswordReset.findOne({ userId: testUser._id });
    expect(resetToken).toBeDefined();
    expect(resetToken.token).toBe(token);
    expect(resetToken.used).toBe(false);
    expect(resetToken.expiresAt).toBeInstanceOf(Date);
  });

  it('should validate a valid token', async () => {
    const token = await PasswordReset.createResetToken(testUser._id);
    const resetToken = await PasswordReset.validateToken(token);
    
    expect(resetToken).toBeDefined();
    expect(resetToken.userId.toString()).toBe(testUser._id.toString());
  });

  it('should not validate an invalid token', async () => {
    const resetToken = await PasswordReset.validateToken('invalid-token');
    expect(resetToken).toBe(null);
  });

  it('should not validate an expired token', async () => {
    const token = await PasswordReset.createResetToken(testUser._id);
    const resetToken = await PasswordReset.findOne({ token });
    resetToken.expiresAt = new Date(Date.now() - 1000);
    await resetToken.save();
    
    const validated = await PasswordReset.validateToken(token);
    expect(validated).toBe(null);
  });

  it('should not validate a used token', async () => {
    const token = await PasswordReset.createResetToken(testUser._id);
    const resetToken = await PasswordReset.findOne({ token });
    resetToken.used = true;
    await resetToken.save();
    
    const validated = await PasswordReset.validateToken(token);
    expect(validated).toBe(null);
  });
});

