import { describe, it, expect } from 'vitest';
import { SwaggerExporter } from '../../Server/Utils/exporters/SwaggerExporter.js';

describe('SwaggerExporter', () => {
  let exporter;

  beforeEach(() => {
    exporter = new SwaggerExporter();
  });

  describe('export', () => {
    it('should export interfaces to Swagger format', async () => {
      const interfaces = [
        {
          path: '/api/test',
          method: 'GET',
          title: 'Test Interface',
          desc: 'Test Description',
          tag: ['test'],
          req_query: [],
          req_headers: [],
          res_body: '{"data": "test"}',
          req_body: null,
          req_body_type: 'json',
        },
      ];

      const project = {
        project_name: 'Test Project',
        project_desc: 'Test Description',
        basepath: '/api',
      };

      const result = await exporter.export(interfaces, { project });

      expect(result).toBeDefined();
      const swagger = JSON.parse(result);
      expect(swagger.openapi).toBe('3.0.0');
      expect(swagger.info.title).toBe('Test Project');
      expect(swagger.paths['/api/test']).toBeDefined();
      expect(swagger.paths['/api/test'].get).toBeDefined();
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
          res_body: '{}',
        },
        {
          path: '/api/private',
          method: 'GET',
          title: 'Private Interface',
          tag: ['private'],
          req_query: [],
          req_headers: [],
          res_body: '{}',
        },
      ];

      const project = {
        project_name: 'Test Project',
        project_desc: '',
        basepath: '/api',
      };

      const result = await exporter.export(interfaces, { project, publicOnly: true });
      const swagger = JSON.parse(result);

      expect(swagger.paths['/api/public']).toBeDefined();
      expect(swagger.paths['/api/private']).toBeUndefined();
    });

    it('should include request body for POST requests', async () => {
      const interfaces = [
        {
          path: '/api/test',
          method: 'POST',
          title: 'Test Interface',
          tag: [],
          req_query: [],
          req_headers: [],
          req_body: '{"name": "test"}',
          req_body_type: 'json',
          res_body: '{}',
        },
      ];

      const project = {
        project_name: 'Test Project',
        project_desc: '',
        basepath: '/api',
      };

      const result = await exporter.export(interfaces, { project });
      const swagger = JSON.parse(result);

      expect(swagger.paths['/api/test'].post.requestBody).toBeDefined();
    });

    it('should include query parameters', async () => {
      const interfaces = [
        {
          path: '/api/test',
          method: 'GET',
          title: 'Test Interface',
          tag: [],
          req_query: [
            { name: 'id', type: 'string', required: true, desc: 'ID' },
          ],
          req_headers: [],
          res_body: '{}',
        },
      ];

      const project = {
        project_name: 'Test Project',
        project_desc: '',
        basepath: '/api',
      };

      const result = await exporter.export(interfaces, { project });
      const swagger = JSON.parse(result);

      expect(swagger.paths['/api/test'].get.parameters).toBeDefined();
      expect(swagger.paths['/api/test'].get.parameters.length).toBe(1);
      expect(swagger.paths['/api/test'].get.parameters[0].name).toBe('id');
    });
  });

  describe('parseSchema', () => {
    it('should parse valid JSON schema', () => {
      const schema = exporter.parseSchema('{"type": "object", "properties": {"name": {"type": "string"}}}');
      expect(schema).toBeDefined();
      expect(schema.type).toBe('object');
    });

    it('should return default schema for invalid JSON', () => {
      const schema = exporter.parseSchema('invalid json');
      expect(schema).toEqual({ type: 'object' });
    });

    it('should handle empty string', () => {
      const schema = exporter.parseSchema('');
      expect(schema).toEqual({ type: 'object' });
    });
  });

  describe('convertToSchema', () => {
    it('should convert object to schema', () => {
      const schema = exporter.convertToSchema({ name: 'test', age: 25 });
      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
    });

    it('should convert array to schema', () => {
      const schema = exporter.convertToSchema([1, 2, 3]);
      expect(schema.type).toBe('array');
      expect(schema.items).toBeDefined();
    });

    it('should convert primitive values', () => {
      expect(exporter.convertToSchema('string')).toEqual({ type: 'string' });
      expect(exporter.convertToSchema(123)).toEqual({ type: 'number' });
      expect(exporter.convertToSchema(true)).toEqual({ type: 'boolean' });
    });

    it('should handle null', () => {
      const schema = exporter.convertToSchema(null);
      expect(schema.type).toBe('null');
    });
  });
});

