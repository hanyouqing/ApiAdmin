import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HARImporter } from '../../Server/Utils/importers/HARImporter.js';

// Mock models
vi.mock('../../Server/Models/Interface.js', () => ({
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

describe('HARImporter', () => {
  let importer;
  let Interface;

  beforeEach(async () => {
    vi.clearAllMocks();
    importer = new HARImporter();
    Interface = (await import('../../Server/Models/Interface.js')).default;
  });

  describe('import', () => {
    it('should throw error for invalid HAR format', async () => {
      const invalidData = {};

      await expect(importer.import(invalidData, { projectId: '123', userId: '456' })).rejects.toThrow('Invalid HAR format');
    });

    it('should import valid HAR data', async () => {
      Interface.findOne.mockResolvedValue(null);
      
      const mockSave = vi.fn().mockResolvedValue({ _id: 'new-id' });
      Interface.prototype.save = mockSave;

      const har = {
        log: {
          entries: [
            {
              request: {
                method: 'GET',
                url: 'https://api.example.com/test?id=123',
                queryString: [{ name: 'id', value: '123' }],
                headers: [{ name: 'Content-Type', value: 'application/json' }],
              },
              response: {
                status: 200,
                content: {
                  text: '{"data": "test"}',
                  mimeType: 'application/json',
                },
              },
            },
          ],
        },
      };

      const result = await importer.import(har, {
        projectId: 'project-id',
        userId: 'user-id',
        mode: 'normal',
      });

      expect(result.imported).toBeGreaterThan(0);
    });
  });

  describe('importEntry', () => {
    it('should skip existing entries in normal mode', async () => {
      Interface.findOne.mockResolvedValue({ _id: 'existing-id' });

      const entry = {
        request: {
          method: 'GET',
          url: 'https://api.example.com/test',
          queryString: [],
          headers: [],
        },
        response: {
          status: 200,
          content: { text: '{}' },
        },
      };

      const result = await importer.import(entry, 'project-id', 'user-id', 'normal', {
        imported: 0,
        skipped: 0,
        errors: [],
      });

      expect(result.skipped).toBe(1);
    });

    it('should merge existing entries in merge mode', async () => {
      const mockExisting = {
        _id: 'existing-id',
        save: vi.fn().mockResolvedValue(true),
      };
      Interface.findOne.mockResolvedValue(mockExisting);

      const entry = {
        request: {
          method: 'GET',
          url: 'https://api.example.com/test',
          queryString: [],
          headers: [],
        },
        response: {
          status: 200,
          content: { text: '{}' },
        },
      };

      const results = {
        imported: 0,
        skipped: 0,
        errors: [],
      };

      await importer.importEntry(entry, 'project-id', 'user-id', 'merge', results);

      expect(results.imported).toBe(1);
      expect(mockExisting.save).toHaveBeenCalled();
    });
  });
});

