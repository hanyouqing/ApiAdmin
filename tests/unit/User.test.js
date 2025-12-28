import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import User from '../../Server/Models/User.js';
import { validateEmail, validatePassword } from '../../Server/Utils/validation.js';
import { connectTestDB } from './test-helpers.js';

describe('User Model', () => {
  beforeEach(async () => {
    try {
      await connectTestDB();
      await User.deleteMany({});
    } catch (error) {
      if (error.message?.includes('authentication')) {
        console.warn('Skipping User Model tests - MongoDB authentication required');
        return;
      }
      throw error;
    }
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  it('should create a user with valid data', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
    };

    const user = new User(userData);
    await user.save();

    expect(user._id).toBeDefined();
    expect(user.username).toBe(userData.username);
    expect(user.email).toBe(userData.email);
    expect(user.password).not.toBe(userData.password);
    expect(user.role).toBe('guest');
  });

  it('should hash password before saving', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
    };

    const user = new User(userData);
    await user.save();

    expect(user.password).not.toBe(userData.password);
    expect(user.password.length).toBeGreaterThan(20);
  });

  it('should compare password correctly', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
    };

    const user = new User(userData);
    await user.save();

    const isValid = await user.comparePassword('Test1234');
    expect(isValid).toBe(true);

    const isInvalid = await user.comparePassword('WrongPassword');
    expect(isInvalid).toBe(false);
  });

  it('should not include password in toJSON', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
    };

    const user = new User(userData);
    await user.save();

    const json = user.toJSON();
    expect(json.password).toBeUndefined();
  });
});

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('Test1234').valid).toBe(true);
      expect(validatePassword('MyP@ssw0rd').valid).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('short').valid).toBe(false);
      expect(validatePassword('12345678').valid).toBe(false);
      expect(validatePassword('abcdefgh').valid).toBe(false);
    });
  });
});

