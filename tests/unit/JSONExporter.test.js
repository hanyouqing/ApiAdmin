import { describe, it, expect } from 'vitest';
import { JSONExporter } from '../../Server/Utils/exporters/JSONExporter.js';

describe('JSONExporter', () => {
  let exporter;

  beforeEach(() => {
    exporter = new JSONExporter();
  });

  describe('export', () => {
    it('should export interfaces to JSON format', async () => {
      const interfaces = [
        {
          path: '/api/test',
          method: 'GET',
          title: 'Test Interface',
          desc: 'Test Description',
          req_query: [],
          req_headers: [],
          req_body: '{}',
          req_body_type: 'json',
          res_body: '{"data": "test"}',
          res_body_type: 'json',
          status: 'developing',
          tag: ['test'],
          catid: null,
        },
      ];

      const project = {
        project_name: 'Test Project',
        project_desc: 'Test Description',
        basepath: '/api',
      };

      const result = await exporter.export(interfaces, { project });

      expect(result).toBeDefined();
      const data = JSON.parse(result);
      expect(data.project.name).toBe('Test Project');
      expect(data.interfaces).toHaveLength(1);
      expect(data.interfaces[0].title).toBe('Test Interface');
    });

    it('should filter public interfaces when publicOnly is true', async () => {
      const interfaces = [
        {
          path: '/api/public',
          method: 'GET',
          title: 'Public Interface',
          tag: ['public'],
          req_query: [],
          req_headers: [],
        },
        {
          path: '/api/private',
          method: 'GET',
          title: 'Private Interface',
          tag: ['private'],
          req_query: [],
          req_headers: [],
        },
      ];

      const project = {
        project_name: 'Test Project',
        project_desc: '',
        basepath: '/api',
      };

      const result = await exporter.export(interfaces, { project, publicOnly: true });
      const data = JSON.parse(result);

      expect(data.interfaces).toHaveLength(1);
      expect(data.interfaces[0].title).toBe('Public Interface');
    });

    it('should include all interface fields', async () => {
      const interfaces = [
        {
          path: '/api/test',
          method: 'POST',
          title: 'Test Interface',
          req_query: [{ name: 'id', type: 'string' }],
          req_headers: [{ name: 'Content-Type', value: 'application/json' }],
          req_body: '{"name": "test"}',
          req_body_type: 'json',
          res_body: '{"result": "success"}',
          res_body_type: 'json',
          status: 'testing',
          desc: 'Test description',
          tag: ['test', 'api'],
          catid: { name: 'Test Category' },
        },
      ];

      const project = {
        project_name: 'Test Project',
        project_desc: '',
        basepath: '/api',
      };

      const result = await exporter.export(interfaces, { project });
      const data = JSON.parse(result);

      expect(data.interfaces[0].req_query).toHaveLength(1);
      expect(data.interfaces[0].req_headers).toHaveLength(1);
      expect(data.interfaces[0].tag).toHaveLength(2);
    });
  });
});

