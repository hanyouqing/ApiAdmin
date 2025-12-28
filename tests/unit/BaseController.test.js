import { describe, it, expect } from 'vitest';
import { BaseController } from '../../Server/Controllers/Base.js';

describe('BaseController', () => {
  describe('success', () => {
    it('should return success response with data', () => {
      const result = BaseController.success({ id: 1, name: 'Test' });
      expect(result).toEqual({
        success: true,
        message: '操作成功',
        data: { id: 1, name: 'Test' },
      });
    });

    it('should return success response with custom message', () => {
      const result = BaseController.success({ id: 1 }, 'Custom message');
      expect(result).toEqual({
        success: true,
        message: 'Custom message',
        data: { id: 1 },
      });
    });

    it('should handle null data', () => {
      const result = BaseController.success(null);
      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });

    it('should handle array data', () => {
      const result = BaseController.success([1, 2, 3]);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });
  });

  describe('error', () => {
    it('should return error response with default message', () => {
      const result = BaseController.error();
      expect(result).toEqual({
        success: false,
        message: '操作失败',
        code: 400,
      });
    });

    it('should return error response with custom message', () => {
      const result = BaseController.error('Custom error message');
      expect(result).toEqual({
        success: false,
        message: 'Custom error message',
        code: 400,
      });
    });

    it('should return error response with custom code', () => {
      const result = BaseController.error('Not found', 404);
      expect(result).toEqual({
        success: false,
        message: 'Not found',
        code: 404,
      });
    });

    it('should handle empty message', () => {
      const result = BaseController.error('', 500);
      expect(result.success).toBe(false);
      expect(result.message).toBe('');
      expect(result.code).toBe(500);
    });
  });
});

