/**
 * Build TestCase.request payload from an Interface document (MeterSphere CASE sync).
 */
export function buildRequestFromInterface(iface) {
  if (!iface) {
    throw new Error('Interface is required');
  }

  const headers = {};
  for (const h of iface.req_headers || []) {
    if (h?.name) {
      headers[h.name] = h.value ?? '';
    }
  }

  const query = {};
  for (const q of iface.req_query || []) {
    if (q?.name) {
      query[q.name] = q.example ?? q.default ?? '';
    }
  }

  let body = {};
  const bodyType = iface.req_body_type || 'json';
  if (bodyType === 'json' || bodyType === 'raw') {
    const raw = iface.req_body_other || iface.req_body || '';
    if (typeof raw === 'string' && raw.trim()) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    }
  } else if (bodyType === 'form') {
    for (const f of iface.req_body_form || []) {
      if (f?.name) {
        body[f.name] = f.default ?? '';
      }
    }
  }

  const pathParams = {};
  const path = iface.path || '';
  const re = /\{(\w+)\}/g;
  let m;
  while ((m = re.exec(path)) !== null) {
    pathParams[m[1]] = '';
  }

  return {
    method: (iface.method || 'GET').toUpperCase(),
    path,
    query,
    body,
    headers,
    path_params: pathParams,
  };
}
