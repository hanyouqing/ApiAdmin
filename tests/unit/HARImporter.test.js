import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HARImporter } from '../../Server/Utils/importers/HARImporter.js';

vi.mock('../../Server/Models/Interface.js', () => {
  const Interface = vi.fn(function Interface(data) {
    Object.assign(this, data);
    this.save = vi.fn().mockResolvedValue(this);
    this.deleteOne = vi.fn().mockResolvedValue(true);
  });
  Interface.findOne = vi.fn();
  return { default: Interface };
});

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

      await expect(importer.import(invalidData, { projectId: '123', userId: '456' })).rejects.toThrow(
        'Invalid HAR format'
      );
    });

    it('should import valid HAR data', async () => {
      Interface.findOne.mockResolvedValue(null);

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
      expect(Interface).toHaveBeenCalled();
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

      const results = {
        imported: 0,
        skipped: 0,
        errors: [],
      };

      await importer.importEntry(entry, 'project-id', 'user-id', 'normal', results);

      expect(results.skipped).toBe(1);
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
