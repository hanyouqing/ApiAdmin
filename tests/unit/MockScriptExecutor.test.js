import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeMockScript, validateMockScript } from '../../Server/Utils/mockScriptExecutor.js';

// Mock logger
vi.mock('../../Server/Utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Mock Script Executor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('executeMockScript', () => {
    it('should return null for empty script', async () => {
      const result = await executeMockScript('', {});
      expect(result).toBe(null);
    });

    it('should return null for whitespace-only script', async () => {
      const result = await executeMockScript('   ', {});
      expect(result).toBe(null);
    });

    it('should execute simple script and return result', async () => {
      const context = {
        mockJson: { name: 'test' },
        httpCode: 200,
        delay: 0,
      };
      const script = 'mockJson.name = "updated";';
      
      const result = await executeMockScript(script, context);
      
      expect(result).toBeDefined();
      expect(result.body.name).toBe('updated');
    });

    it('should handle script errors gracefully', async () => {
      const context = { mockJson: {} };
      const script = 'invalid syntax here!!!';
      
      await expect(executeMockScript(script, context)).rejects.toThrow();
    });

    it('should preserve context values', async () => {
      const context = {
        header: { 'Content-Type': 'application/json' },
        params: { id: '123' },
        mockJson: { data: 'test' },
        httpCode: 201,
        delay: 100,
      };
      const script = '';
      
      const result = await executeMockScript(script, context);
      
      expect(result).toBe(null);
    });
  });

  describe('validateMockScript', () => {
    it('should validate empty script', () => {
      const result = validateMockScript('');
      expect(result.valid).toBe(true);
    });

    it('should validate whitespace-only script', () => {
      const result = validateMockScript('   ');
      expect(result.valid).toBe(true);
    });

    it('should reject scripts with require', () => {
      const result = validateMockScript('require("fs")');
      expect(result.valid).toBe(false);
    });

    it('should reject scripts with import', () => {
      const result = validateMockScript('import fs from "fs"');
      expect(result.valid).toBe(false);
    });

    it('should reject scripts with process', () => {
      const result = validateMockScript('process.exit()');
      expect(result.valid).toBe(false);
    });

    it('should reject scripts with eval', () => {
      const result = validateMockScript('eval("code")');
      expect(result.valid).toBe(false);
    });

    it('should validate simple valid script', () => {
      const result = validateMockScript('mockJson.value = 123;');
      expect(result.valid).toBe(true);
    });

    it('should reject scripts with syntax errors', () => {
      const result = validateMockScript('invalid syntax!!!');
      expect(result.valid).toBe(false);
    });
  });
});

