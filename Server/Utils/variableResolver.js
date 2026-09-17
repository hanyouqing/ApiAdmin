import ProjectVariableStore, { entriesToMap, mapToEntries } from '../Models/ProjectVariableStore.js';
import TestEnvironment from '../Models/TestEnvironment.js';
import Project from '../Models/Project.js';

/**
 * Resolution order (Postman-like):
 * iteration / local > collection > environment > project globals
 * Callers overlay local/collection/iteration themselves.
 */
export async function loadProjectGlobals(projectId) {
  if (!projectId) return {};
  const store = await ProjectVariableStore.findOne({ project_id: projectId }).lean();
  return entriesToMap(store?.globals || []);
}

export async function getOrCreateVariableStore(projectId, userId) {
  let store = await ProjectVariableStore.findOne({ project_id: projectId });
  if (!store) {
    store = await ProjectVariableStore.create({
      project_id: projectId,
      globals: [],
      createdBy: userId,
    });
  }
  return store;
}

/**
 * Build env variable map from TestEnvironment document, plain object, or Project.env row.
 */
export function environmentToMap(environment = {}) {
  if (!environment || typeof environment !== 'object') return {};
  if (environment.variables && typeof environment.variables === 'object') {
    return { ...environment.variables };
  }
  // Treat plain key/value bag as variables (legacy)
  const reserved = new Set([
    'name',
    'host',
    'base_url',
    'headers',
    '_id',
    'project_id',
    'description',
    'is_default',
    'createdBy',
    'createdAt',
    'updatedAt',
    '__v',
  ]);
  const out = {};
  for (const [k, v] of Object.entries(environment)) {
    if (!reserved.has(k) && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) {
      out[k] = String(v);
    }
  }
  return out;
}

export async function resolveEnvironmentContext(projectId, environmentHint = {}) {
  const globals = await loadProjectGlobals(projectId);
  let environment = environmentHint;
  let envMap = {};
  let baseUrl = '';
  let headers = {};

  if (environmentHint?._id || environmentHint?.id) {
    const id = environmentHint._id || environmentHint.id;
    const doc = await TestEnvironment.findById(id).lean();
    if (doc) {
      environment = doc;
      envMap = environmentToMap(doc);
      baseUrl = doc.base_url || '';
      headers = doc.headers || {};
    }
  } else if (environmentHint?.name && projectId) {
    const doc = await TestEnvironment.findOne({
      project_id: projectId,
      name: environmentHint.name,
    }).lean();
    if (doc) {
      environment = doc;
      envMap = environmentToMap(doc);
      baseUrl = doc.base_url || '';
      headers = doc.headers || {};
    }
  }

  if (!baseUrl) {
    const project = await Project.findById(projectId).lean();
    const row =
      project?.env?.find((e) => e.name === environmentHint?.name || e.name === 'default') ||
      project?.env?.[0];
    if (row) {
      envMap = { ...environmentToMap(row), ...envMap };
      baseUrl = environmentHint.base_url || environmentHint.host || row.host || project.basepath || '';
      headers = { ...(row.headers || {}), ...(environmentHint.headers || {}), ...headers };
    } else {
      baseUrl = environmentHint.base_url || environmentHint.host || project?.basepath || '';
      headers = { ...(environmentHint.headers || {}) };
      envMap = { ...environmentToMap(environmentHint), ...envMap };
    }
  } else {
    envMap = { ...envMap, ...environmentToMap(environmentHint) };
    headers = { ...headers, ...(environmentHint.headers || {}) };
  }

  // Scope merge for template resolution: env overrides globals when same key
  const merged = { ...globals, ...envMap };

  return {
    globals,
    envMap,
    merged,
    baseUrl,
    headers,
    environment,
  };
}

export { entriesToMap, mapToEntries };
