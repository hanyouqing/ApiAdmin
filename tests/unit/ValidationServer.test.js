import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { validateObjectId, validateEmail, validatePassword, sanitizeString, sanitizeInput } from '../../Server/Utils/validation.js';

describe('Server Validation Utils', () => {
  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
  });

  describe('validateObjectId', () => {
    it('should validate correct ObjectIds', () => {
      const validId = new mongoose.Types.ObjectId().toString();
      expect(validateObjectId(validId)).toBe(true);
      expect(validateObjectId('507f1f77bcf86cd799439011')).toBe(true);
    });

    it('should reject invalid ObjectIds', () => {
      expect(validateObjectId('invalid')).toBe(false);
      expect(validateObjectId('123')).toBe(false);
      expect(validateObjectId('')).toBe(false);
      expect(validateObjectId(null)).toBe(false);
      expect(validateObjectId(undefined)).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('Test1234');
      expect(result.valid).toBe(true);
    });

    it('should reject weak passwords', () => {
      const result = validatePassword('short');
      expect(result.valid).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")');
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize string values', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")');
    });

    it('should sanitize object values', () => {
      const input = { name: '<script>test</script>' };
      const result = sanitizeInput(input);
      expect(result.name).toBe('test');
    });
  });
});

