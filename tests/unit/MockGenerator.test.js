import { describe, it, expect } from 'vitest';
import {
  isSecretKey,
  redactSecretsDeep,
  buildRuleBasedMock,
  sanitizeInterfaceForPrompt,
  parseAiMockJson,
  generateMockExpectation,
} from '../../Server/Utils/mockGenerator.js';

describe('mockGenerator', () => {
  it('detects secret keys', () => {
    expect(isSecretKey('Authorization')).toBe(true);
    expect(isSecretKey('x-api-key')).toBe(true);
    expect(isSecretKey('Content-Type')).toBe(false);
  });

  it('redacts secrets deeply', () => {
    const out = redactSecretsDeep({
      Authorization: 'Bearer secret',
      nested: { api_key: 'x', ok: 1 },
    });
    expect(out.Authorization).toBe('[REDACTED]');
    expect(out.nested.api_key).toBe('[REDACTED]');
    expect(out.nested.ok).toBe(1);
  });

  it('builds rule-based mock from res_body', () => {
    const mock = buildRuleBasedMock({
      title: 'List users',
      path: '/api/users',
      method: 'GET',
      res_body: '{"items":[]}',
    });
    expect(mock.source).toBe('rule');
    expect(mock.response.status_code).toBe(200);
    expect(JSON.parse(mock.response.body)).toEqual({ items: [] });
  });

  it('sanitizes interface for prompt', () => {
    const safe = sanitizeInterfaceForPrompt({
      path: '/api/x',
      req_headers: [{ name: 'Authorization', value: 'Bearer tok' }],
      req_query: [{ name: 'q', value: 'a' }],
    });
    expect(safe.path).toBe('/api/x');
    expect(safe.req_headers[0].value).toBe('[REDACTED]');
    expect(safe.req_query[0].value).toBe('a');
  });

  it('parses AI JSON mock', () => {
    const parsed = parseAiMockJson(
      '```json\n{"name":"n","response":{"status_code":201,"body":{"ok":true}}}\n```'
    );
    expect(parsed.name).toBe('n');
    expect(parsed.response.status_code).toBe(201);
    expect(parsed.source).toBe('ai');
  });

  it('falls back when callAI fails', async () => {
    const mock = await generateMockExpectation(
      { title: 'X', path: '/x', method: 'GET', res_body: '{}' },
      {
        callAI: async () => {
          throw new Error('no key');
        },
      }
    );
    expect(mock.source).toBe('rule_fallback');
  });

  it('uses AI when callAI succeeds', async () => {
    const mock = await generateMockExpectation(
      { title: 'X', path: '/x', method: 'GET' },
      {
        callAI: async () =>
          JSON.stringify({
            name: 'from-ai',
            response: { status_code: 200, body: { hello: 'world' } },
          }),
      }
    );
    expect(mock.source).toBe('ai');
    expect(mock.name).toBe('from-ai');
  });
});
