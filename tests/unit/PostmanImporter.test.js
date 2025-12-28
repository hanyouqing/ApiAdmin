import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostmanImporter } from '../../Server/Utils/importers/PostmanImporter.js';

// Mock models
vi.mock('../../Server/Models/Interface.js', () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock('../../Server/Models/InterfaceCat.js', () => ({
  default: {
    findOne: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../Server/Utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('PostmanImporter', () => {
  let importer;
  let Interface;
  let InterfaceCat;

  beforeEach(async () => {
    vi.clearAllMocks();
    importer = new PostmanImporter();
    Interface = (await import('../../Server/Models/Interface.js')).default;
    InterfaceCat = (await import('../../Server/Models/InterfaceCat.js')).default;
  });

  describe('import', () => {
    it('should throw error for invalid Postman collection', async () => {
      const invalidData = {};

      await expect(importer.import(invalidData, { projectId: '123', userId: '456' })).rejects.toThrow('Invalid Postman collection format');
    });

    it('should import valid Postman collection', async () => {
      Interface.findOne.mockResolvedValue(null);
      InterfaceCat.findOne.mockResolvedValue(null);
      
      const mockSave = vi.fn().mockResolvedValue({ _id: 'new-id' });
      Interface.prototype.save = mockSave;
      InterfaceCat.prototype.save = vi.fn().mockResolvedValue({ _id: 'cat-id' });

      const collection = {
        info: { name: 'Test Collection' },
        item: [
          {
            name: 'Test Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/test',
            },
          },
        ],
      };

      const result = await importer.import(collection, {
        projectId: 'project-id',
        userId: 'user-id',
        mode: 'normal',
      });

      expect(result.imported).toBeGreaterThan(0);
    });
  });

  describe('parseQuery', () => {
    it('should parse query parameters', () => {
      const query = [
        { key: 'id', value: '123', disabled: false },
        { key: 'name', value: 'test', description: 'Name parameter' },
      ];

      const result = importer.parseQuery(query);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('id');
      expect(result[0].default).toBe('123');
    });

    it('should return empty array for non-array input', () => {
      expect(importer.parseQuery(null)).toEqual([]);
      expect(importer.parseQuery({})).toEqual([]);
    });
  });

  describe('parseHeaders', () => {
    it('should parse headers', () => {
      const headers = [
        { key: 'Content-Type', value: 'application/json' },
        { key: 'Authorization', value: 'Bearer token' },
      ];

      const result = importer.parseHeaders(headers);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Content-Type');
      expect(result[0].value).toBe('application/json');
    });

    it('should return empty array for non-array input', () => {
      expect(importer.parseHeaders(null)).toEqual([]);
    });
  });

  describe('parseBody', () => {
    it('should parse raw JSON body', () => {
      const body = {
        mode: 'raw',
        raw: '{"name": "test"}',
      };

      const result = importer.parseBody(body);

      expect(result.type).toBe('json');
      expect(result.data).toBe('{"name": "test"}');
    });

    it('should parse formdata body', () => {
      const body = {
        mode: 'formdata',
        formdata: [{ key: 'name', value: 'test' }],
      };

      const result = importer.parseBody(body);

      expect(result.type).toBe('form');
    });

    it('should return default for null body', () => {
      const result = importer.parseBody(null);
      expect(result.type).toBe('json');
      expect(result.data).toBe('');
    });
  });
});

