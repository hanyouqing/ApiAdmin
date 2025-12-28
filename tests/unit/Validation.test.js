import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, sanitizeString, sanitizeInput } from '../../Utils/validation.js';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
      expect(validateEmail('user_name@example-domain.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('test..test@example.com')).toBe(false);
      expect(validateEmail('test@example')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
      expect(validateEmail(123)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result1 = validatePassword('Test1234');
      expect(result1.valid).toBe(true);
      
      const result2 = validatePassword('MyP@ssw0rd');
      expect(result2.valid).toBe(true);
      
      const result3 = validatePassword('Complex#Pass123');
      expect(result3.valid).toBe(true);
    });

    it('should reject weak passwords', () => {
      const result1 = validatePassword('short');
      expect(result1.valid).toBe(false);
      
      const result2 = validatePassword('12345678');
      expect(result2.valid).toBe(false);
      
      const result3 = validatePassword('abcdefgh');
      expect(result3.valid).toBe(false);
      
      const result4 = validatePassword('ABCDEFGH');
      expect(result4.valid).toBe(false);
    });

    it('should provide validation messages', () => {
      const result = validatePassword('short');
      expect(result.valid).toBe(false);
      expect(result.message).toBeDefined();
    });

    it('should handle edge cases', () => {
      expect(() => validatePassword(null)).not.toThrow();
      expect(() => validatePassword(undefined)).not.toThrow();
      expect(() => validatePassword('')).not.toThrow();
    });
  });

  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(sanitizeString('<div>Hello</div>')).toBe('Hello');
      expect(sanitizeString('Plain text')).toBe('Plain text');
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
    });

    it('should preserve safe content', () => {
      expect(sanitizeString('Hello World')).toBe('Hello World');
      expect(sanitizeString('123')).toBe('123');
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize string values', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")');
    });

    it('should sanitize object values recursively', () => {
      const input = {
        name: '<script>alert("xss")</script>',
        nested: {
          value: '<div>test</div>',
        },
      };
      const result = sanitizeInput(input);
      expect(result.name).toBe('alert("xss")');
      expect(result.nested.value).toBe('test');
    });

    it('should sanitize array values', () => {
      const input = ['<script>test</script>', 'normal'];
      const result = sanitizeInput(input);
      expect(result[0]).toBe('test');
      expect(result[1]).toBe('normal');
    });

    it('should handle non-string values', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(true)).toBe(true);
      expect(sanitizeInput(null)).toBe(null);
    });
  });
});

