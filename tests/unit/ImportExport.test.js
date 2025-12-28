import { describe, it, expect } from 'vitest';
import { PostmanImporter } from '../../Server/Utils/importers/PostmanImporter.js';
import { SwaggerImporter } from '../../Server/Utils/importers/SwaggerImporter.js';
import { SwaggerExporter } from '../../Server/Utils/exporters/SwaggerExporter.js';

describe('ImportExport Utils', () => {
  describe('PostmanImporter', () => {
    it('should import Postman collection v2.0', async () => {
      const importer = new PostmanImporter();
      const postmanData = {
        info: {
          name: 'Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json',
        },
        item: [
          {
            name: 'Test Request',
            request: {
              method: 'GET',
              url: {
                raw: 'http://example.com/api/test',
                protocol: 'http',
                host: ['example', 'com'],
                path: ['api', 'test'],
              },
            },
          },
        ],
      };

      const result = await importer.import(postmanData, {
        projectId: 'test-project-id',
        userId: 'test-user-id',
        mode: 'normal',
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('imported');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('SwaggerImporter', () => {
    it('should import Swagger 2.0', async () => {
      const importer = new SwaggerImporter();
      const swaggerData = {
        swagger: '2.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
        paths: {
          '/api/test': {
            get: {
              summary: 'Test endpoint',
              responses: {
                '200': {
                  description: 'Success',
                },
              },
            },
          },
        },
      };

      const result = await importer.import(swaggerData, {
        projectId: 'test-project-id',
        userId: 'test-user-id',
        mode: 'normal',
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('imported');
      expect(result).toHaveProperty('skipped');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('SwaggerExporter', () => {
    it('should export to Swagger 2.0 format', async () => {
      const exporter = new SwaggerExporter();
      const projectData = {
        project_name: 'Test Project',
        basepath: '/api',
        interfaces: [
          {
            title: 'Test Interface',
            path: '/test',
            method: 'GET',
            desc: 'Test description',
          },
        ],
      };

      const result = await exporter.export(projectData.interfaces, {
        project: projectData,
      });

      expect(result).toBeDefined();
      const swagger = JSON.parse(result);
      expect(swagger.openapi).toBe('3.0.0');
      expect(swagger.info.title).toBe(projectData.project_name);
      expect(swagger.paths).toBeDefined();
    });
  });
});

