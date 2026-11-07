import config from './config.js';
import { assertSafeOutboundUrl } from './security.js';

/**
 * Map Swagger UI paths to the OpenAPI JSON document URL.
 * http://host/swagger → http://host/swagger.json
 */
export function normalizeSwaggerSpecUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl).trim());
  } catch {
    throw new Error('无效的 Swagger URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('仅允许 http/https 协议');
  }

  let path = parsed.pathname || '/';

  // Swagger UI entrypoints (incl. /swagger/index.html) → OpenAPI JSON
  if (
    path === '/swagger' ||
    path === '/swagger/' ||
    path === '/swagger-ui' ||
    path === '/swagger-ui/' ||
    path === '/swagger/index.html' ||
    path.startsWith('/swagger/') ||
    path.endsWith('/swagger') ||
    path.endsWith('/swagger-ui')
  ) {
    path = '/swagger.json';
  } else {
    path = path.replace(/\/+$/, '') || '/';
    if (
      !path.endsWith('.json') &&
      !path.endsWith('.yaml') &&
      !path.endsWith('.yml') &&
      !path.includes('/swagger.json') &&
      !path.includes('/openapi.json') &&
      !path.includes('/api-docs')
    ) {
      path = path === '/' ? '/swagger.json' : `${path}/swagger.json`;
    }
  }

  parsed.pathname = path;
  return parsed.toString();
}

export function isLocalAppSwaggerSpec(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return false;
  }

  const path = (parsed.pathname || '').replace(/\/+$/, '') || '/';
  if (!['/swagger.json', '/openapi.json', '/api-docs'].includes(path)) {
    return false;
  }

  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return true;
  }

  try {
    const app = new URL(config.APP_URL || `http://localhost:${config.PORT || 3000}`);
    return host === app.hostname.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Load an OpenAPI/Swagger document from a URL.
 * Own-server /swagger.json is served from memory (no SSRF). Other URLs use assertSafeOutboundUrl.
 */
export async function fetchSwaggerSpec(rawUrl) {
  const normalized = normalizeSwaggerSpecUrl(rawUrl);

  if (isLocalAppSwaggerSpec(normalized)) {
    const swaggerDefinition = (await import('./swagger.js')).default;
    return { url: normalized, data: swaggerDefinition, source: 'local' };
  }

  const safeUrl = assertSafeOutboundUrl(normalized);
  const response = await fetch(safeUrl, {
    method: 'GET',
    headers: { Accept: 'application/json, application/yaml, text/yaml, text/plain' },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`无法获取 Swagger 文档: HTTP ${response.status}`);
  }

  const text = await response.text();
  const trimmed = text.trim();
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
    throw new Error('URL 返回了 HTML（Swagger UI），请使用 /swagger.json 或 OpenAPI JSON 地址');
  }

  try {
    return { url: safeUrl, data: JSON.parse(text), source: 'remote' };
  } catch {
    throw new Error('无法解析 Swagger JSON。YAML 请先转换为 JSON 或使用 .json 地址');
  }
}
