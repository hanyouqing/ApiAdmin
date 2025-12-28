export class SwaggerExporter {
  async export(interfaces, options = {}) {
    const { project, publicOnly = false } = options;

    const paths = {};
    const tags = new Set();

    interfaces
      .filter((i) => !publicOnly || i.tag?.includes('public'))
      .forEach((interfaceData) => {
        if (interfaceData.tag) {
          interfaceData.tag.forEach((tag) => tags.add(tag));
        }

        const path = interfaceData.path;
        if (!paths[path]) {
          paths[path] = {};
        }

        const operation = {
          summary: interfaceData.title,
          description: interfaceData.desc || '',
          tags: interfaceData.tag || [],
          parameters: [
            ...(interfaceData.req_query || []).map((q) => ({
              name: q.name,
              in: 'query',
              schema: { type: q.type || 'string' },
              required: q.required || false,
              description: q.desc || '',
            })),
            ...(interfaceData.req_headers || []).map((h) => ({
              name: h.name,
              in: 'header',
              schema: { type: 'string' },
              required: h.required || false,
              description: h.desc || '',
            })),
          ],
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: this.parseSchema(interfaceData.res_body),
                },
              },
            },
          },
        };

        if (interfaceData.req_body && interfaceData.req_body_type === 'json') {
          operation.requestBody = {
            content: {
              'application/json': {
                schema: this.parseSchema(interfaceData.req_body),
              },
            },
          };
        }

        paths[path][interfaceData.method.toLowerCase()] = operation;
      });

    const swagger = {
      openapi: '3.0.0',
      info: {
        title: project.project_name,
        description: project.project_desc || '',
        version: '0.0.1',
      },
      servers: [
        {
          url: project.basepath || '/',
        },
      ],
      tags: Array.from(tags).map((tag) => ({ name: tag })),
      paths,
    };

    return JSON.stringify(swagger, null, 2);
  }

  parseSchema(body) {
    try {
      const parsed = JSON.parse(body);
      return this.convertToSchema(parsed);
    } catch {
      return { type: 'object' };
    }
  }

  convertToSchema(obj) {
    if (obj === null) return { type: 'null' };
    if (Array.isArray(obj)) {
      return {
        type: 'array',
        items: obj.length > 0 ? this.convertToSchema(obj[0]) : { type: 'object' },
      };
    }
    if (typeof obj === 'object') {
      const properties = {};
      const required = [];
      for (const [key, value] of Object.entries(obj)) {
        properties[key] = this.convertToSchema(value);
      }
      return { type: 'object', properties, required };
    }
    return { type: typeof obj };
  }
}

