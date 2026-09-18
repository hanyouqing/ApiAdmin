/**
 * Generate MockExpectation-shaped payloads from Interface definitions.
 * Prefer rule-based when AI is unavailable; redact secrets before any cloud prompt.
 */

const SECRET_KEY_RE =
  /^(authorization|cookie|set-cookie|x-api-key|api-key|api_key|token|access[_-]?token|refresh[_-]?token|secret|password|passwd|private[_-]?key)$/i;

export function isSecretKey(key) {
  if (!key || typeof key !== 'string') return false;
  return SECRET_KEY_RE.test(key.trim());
}

export function redactSecretsDeep(value, depth = 0) {
  if (depth > 8 || value == null) return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactSecretsDeep(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = isSecretKey(k) ? '[REDACTED]' : redactSecretsDeep(v, depth + 1);
    }
    return out;
  }
  return value;
}

function tryParseJson(raw) {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    try {
      // lazy JSON5 if available
      return null;
    } catch {
      return null;
    }
  }
}

function exampleFromResBody(interfaceData) {
  const parsed = tryParseJson(interfaceData.res_body);
  if (parsed != null) return parsed;

  const method = (interfaceData.method || 'GET').toUpperCase();
  if (method === 'DELETE') {
    return { success: true, message: 'deleted' };
  }
  if (method === 'POST') {
    return {
      success: true,
      data: {
        id: '@guid',
        created_at: '@datetime',
      },
    };
  }
  return {
    success: true,
    data: {
      id: 1,
      name: '@string',
      path: interfaceData.path || '/api/resource',
    },
  };
}

/**
 * @param {object} interfaceData
 * @returns {{ name, query_filter, body_filter, response, enabled, priority, source }}
 */
export function buildRuleBasedMock(interfaceData = {}) {
  const bodyObj = exampleFromResBody(interfaceData);
  const body =
    typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj, null, 2);

  return {
    name: `AI Mock — ${interfaceData.title || interfaceData.path || 'default'}`,
    query_filter: {},
    body_filter: {},
    ip_filter: '',
    response: {
      status_code: 200,
      delay: 0,
      headers: { 'Content-Type': 'application/json' },
      body,
    },
    enabled: true,
    priority: 10,
    source: 'rule',
  };
}

export function sanitizeInterfaceForPrompt(interfaceData = {}) {
  const scrubParamList = (list) => {
    if (!Array.isArray(list)) return list;
    return list.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const name = item.name || item.key || '';
      if (isSecretKey(name)) {
        return { ...item, value: '[REDACTED]', example: '[REDACTED]' };
      }
      return item;
    });
  };

  const safe = redactSecretsDeep({
    title: interfaceData.title,
    path: interfaceData.path,
    method: interfaceData.method,
    desc: interfaceData.desc,
    req_query: scrubParamList(interfaceData.req_query),
    req_headers: scrubParamList(interfaceData.req_headers),
    req_params: scrubParamList(interfaceData.req_params),
    req_body_type: interfaceData.req_body_type,
    req_body: interfaceData.req_body || interfaceData.req_body_other,
    res_body_type: interfaceData.res_body_type,
    res_body: interfaceData.res_body,
  });
  return safe;
}

export function parseAiMockJson(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('Empty AI response');
  }
  const jsonStr = content.replace(/```json\n?|\n?```/gi, '').trim();
  const parsed = JSON.parse(jsonStr);
  const response = parsed.response || {};
  let body = response.body;
  if (body != null && typeof body !== 'string') {
    body = JSON.stringify(body, null, 2);
  }
  return {
    name: parsed.name || 'AI Generated Mock',
    query_filter: parsed.query_filter || {},
    body_filter: parsed.body_filter || {},
    ip_filter: parsed.ip_filter || '',
    response: {
      status_code: Number(response.status_code) || 200,
      delay: Number(response.delay) || 0,
      headers: response.headers || { 'Content-Type': 'application/json' },
      body: body || '{}',
    },
    enabled: parsed.enabled !== false,
    priority: Number(parsed.priority) || 10,
    source: 'ai',
  };
}

export function buildMockPrompt(safeInterface) {
  return `You are an API Mock designer. Given this REST interface definition (secrets already redacted),
return ONLY JSON for a Mock expectation (no markdown):

{
  "name": "string",
  "query_filter": {},
  "body_filter": {},
  "response": {
    "status_code": 200,
    "delay": 0,
    "headers": { "Content-Type": "application/json" },
    "body": "{ ... json string or object example ... }"
  },
  "enabled": true,
  "priority": 10
}

Use realistic sample data. Prefer Mock.js-style placeholders (@string, @integer) inside JSON strings when helpful.
Interface:
${JSON.stringify(safeInterface, null, 2)}
`;
}

/**
 * High-level: try AI, else rule-based.
 * @param {object} interfaceData
 * @param {{ callAI?: Function, projectId?: string }} options
 */
export async function generateMockExpectation(interfaceData, options = {}) {
  const rule = buildRuleBasedMock(interfaceData);
  const safe = sanitizeInterfaceForPrompt(interfaceData);

  if (typeof options.callAI !== 'function') {
    return rule;
  }

  try {
    const prompt = buildMockPrompt(safe);
    const content = await options.callAI(prompt, {
      projectId: options.projectId,
      maxTokens: options.maxTokens || 1500,
    });
    const text = typeof content === 'string' ? content : content?.content || content?.text || '';
    return parseAiMockJson(text);
  } catch {
    return { ...rule, source: 'rule_fallback' };
  }
}

export default {
  isSecretKey,
  redactSecretsDeep,
  buildRuleBasedMock,
  sanitizeInterfaceForPrompt,
  parseAiMockJson,
  buildMockPrompt,
  generateMockExpectation,
};
