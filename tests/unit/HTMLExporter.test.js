import { describe, it, expect } from 'vitest';
import { HTMLExporter } from '../../Server/Utils/exporters/HTMLExporter.js';

describe('HTMLExporter', () => {
  let exporter;

  beforeEach(() => {
    exporter = new HTMLExporter();
  });

  describe('export', () => {
    it('should export interfaces to HTML format', async () => {
      const interfaces = [
        {
          path: '/api/test',
          method: 'GET',
          title: 'Test Interface',
          desc: 'Test Description',
          req_query: [],
          req_body: null,
          res_body: '{"data": "test"}',
        },
      ];

      const project = {
        project_name: 'Test Project',
        project_desc: 'Test Description',
      };

      const result = await exporter.export(interfaces, { project });

      expect(result).toBeDefined();
      expect(result).toContain('Test Project');
      expect(result).toContain('GET /api/test');
      expect(result).toContain('Test Interface');
    });

    it('should filter public interfaces when publicOnly is true', async () => {
      const interfaces = [
        {
          path: '/api/public',
          method: 'GET',
          title: 'Public Interface',
          tag: ['public'],
          req_query: [],
        },
        {
          path: '/api/private',
          method: 'GET',
          title: 'Private Interface',
          tag: ['private'],
          req_query: [],
        },
      ];

      const project = {
        project_name: 'Test Project',
        project_desc: '',
      };

      const result = await exporter.export(interfaces, { project, publicOnly: true });

      expect(result).toContain('Public Interface');
      expect(result).not.toContain('Private Interface');
    });

    it('should include query parameters table', async () => {
      const interfaces = [
        {
          path: '/api/test',
          method: 'GET',
          title: 'Test Interface',
          req_query: [
            { name: 'id', type: 'string', required: true, desc: 'ID' },
          ],
          req_body: null,
          res_body: '{}',
        },
      ];

      const project = {
        project_name: 'Test Project',
        project_desc: '',
      };

      const result = await exporter.export(interfaces, { project });

      expect(result).toContain('Query Parameters');
      expect(result).toContain('id');
    });

    it('should include request and response bodies', async () => {
      const interfaces = [
        {
          path: '/api/test',
          method: 'POST',
          title: 'Test Interface',
          req_query: [],
          req_body: '{"name": "test"}',
          res_body: '{"result": "success"}',
        },
      ];

      const project = {
        project_name: 'Test Project',
        project_desc: '',
      };

      const result = await exporter.export(interfaces, { project });

      expect(result).toContain('Request Body');
      expect(result).toContain('Response');
    });
  });

  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(exporter.escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
      expect(exporter.escapeHtml('&')).toBe('&amp;');
      expect(exporter.escapeHtml('"')).toBe('&quot;');
      expect(exporter.escapeHtml("'")).toBe('&#039;');
    });

    it('should not escape safe characters', () => {
      expect(exporter.escapeHtml('Hello World')).toBe('Hello World');
      expect(exporter.escapeHtml('123')).toBe('123');
    });
  });
});

