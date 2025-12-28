import { describe, it, expect } from 'vitest';
import { generateSecureToken, hashToken, sanitizeHtml, validateUrl, escapeRegex } from '../../Server/Utils/security.js';

describe('Security Utils', () => {
  describe('generateSecureToken', () => {
    it('should generate a token of default length', () => {
      const token = generateSecureToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex characters
    });

    it('should generate a token of specified length', () => {
      const token = generateSecureToken(16);
      expect(token.length).toBe(32); // 16 bytes = 32 hex characters
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken', () => {
    it('should hash a token correctly', () => {
      const token = 'test-token';
      const hash = hashToken(token);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA256 produces 64 hex characters
    });

    it('should produce consistent hashes', () => {
      const token = 'test-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = hashToken('token1');
      const hash2 = hashToken('token2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('sanitizeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      expect(sanitizeHtml('<div>Hello</div>')).toBe('&lt;div&gt;Hello&lt;&#x2F;div&gt;');
    });

    it('should handle empty strings', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('should handle non-string values', () => {
      expect(sanitizeHtml(null)).toBe(null);
      expect(sanitizeHtml(undefined)).toBe(undefined);
      expect(sanitizeHtml(123)).toBe(123);
    });

    it('should escape all dangerous characters', () => {
      expect(sanitizeHtml('&')).toBe('&amp;');
      expect(sanitizeHtml('<')).toBe('&lt;');
      expect(sanitizeHtml('>')).toBe('&gt;');
      expect(sanitizeHtml('"')).toBe('&quot;');
      expect(sanitizeHtml("'")).toBe('&#x27;');
      expect(sanitizeHtml('/')).toBe('&#x2F;');
    });
  });

  describe('validateUrl', () => {
    it('should validate HTTP URLs', () => {
      expect(validateUrl('http://example.com')).toBe(true);
      expect(validateUrl('http://example.com/path')).toBe(true);
    });

    it('should validate HTTPS URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('https://example.com/path?query=1')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('ftp://example.com')).toBe(false);
      expect(validateUrl('javascript:alert(1)')).toBe(false);
      expect(validateUrl('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateUrl(null)).toBe(false);
      expect(validateUrl(undefined)).toBe(false);
    });
  });

  describe('escapeRegex', () => {
    it('should escape regex special characters', () => {
      expect(escapeRegex('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    it('should not escape normal characters', () => {
      expect(escapeRegex('hello world')).toBe('hello world');
      expect(escapeRegex('123')).toBe('123');
    });

    it('should handle empty strings', () => {
      expect(escapeRegex('')).toBe('');
    });
  });
});

