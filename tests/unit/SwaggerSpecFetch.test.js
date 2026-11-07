import { describe, it, expect } from 'vitest';
import {
  normalizeSwaggerSpecUrl,
  isLocalAppSwaggerSpec,
  fetchSwaggerSpec,
} from '../../Server/Utils/swaggerSpecFetch.js';

describe('swaggerSpecFetch', () => {
  it('maps /swagger UI paths to /swagger.json', () => {
    expect(normalizeSwaggerSpecUrl('http://localhost:3000/swagger')).toBe(
      'http://localhost:3000/swagger.json'
    );
    expect(normalizeSwaggerSpecUrl('http://localhost:3000/swagger/')).toBe(
      'http://localhost:3000/swagger.json'
    );
    expect(normalizeSwaggerSpecUrl('http://localhost:3000/swagger-ui')).toBe(
      'http://localhost:3000/swagger.json'
    );
    expect(normalizeSwaggerSpecUrl('http://localhost:3000/swagger/index.html')).toBe(
      'http://localhost:3000/swagger.json'
    );
    expect(normalizeSwaggerSpecUrl('http://localhost:3000/swagger/swagger-initializer.js')).toBe(
      'http://localhost:3000/swagger.json'
    );
  });

  it('keeps explicit json urls', () => {
    expect(normalizeSwaggerSpecUrl('https://example.com/v3/openapi.json')).toBe(
      'https://example.com/v3/openapi.json'
    );
  });

  it('detects local app swagger specs', () => {
    expect(isLocalAppSwaggerSpec('http://localhost:3000/swagger.json')).toBe(true);
    expect(isLocalAppSwaggerSpec('http://127.0.0.1:3000/openapi.json')).toBe(true);
    expect(isLocalAppSwaggerSpec('https://petstore.swagger.io/v2/swagger.json')).toBe(false);
  });

  it('loads local ApiAdmin OpenAPI without outbound fetch', async () => {
    const result = await fetchSwaggerSpec('http://localhost:3000/swagger');
    expect(result.source).toBe('local');
    expect(result.url).toBe('http://localhost:3000/swagger.json');
    expect(result.data).toBeTruthy();
    expect(result.data.openapi || result.data.swagger).toBeTruthy();
  });

  it('imports /swagger/index.html as local without private-outbound error', async () => {
    const result = await fetchSwaggerSpec('http://localhost:3000/swagger/index.html');
    expect(result.source).toBe('local');
    expect(result.url).toBe('http://localhost:3000/swagger.json');
  });
});
