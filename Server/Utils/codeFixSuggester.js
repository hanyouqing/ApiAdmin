import { logger } from './logger.js';
import { redactSecretsDeep } from './mockGenerator.js';
import AutoTestResult from '../Models/AutoTestResult.js';
import AutoTestTask from '../Models/AutoTestTask.js';
import ApiMonitorRun from '../Models/ApiMonitorRun.js';
import ApiMonitor from '../Models/ApiMonitor.js';
import CodeRepository from '../Models/CodeRepository.js';
import { codeRepositoryService } from './codeRepositoryService.js';

function truncate(str, max = 8000) {
  if (str == null) return '';
  const s = typeof str === 'string' ? str : JSON.stringify(str);
  return s.length > max ? `${s.slice(0, max)}\n…[truncated]` : s;
}

export function buildUnifiedDiff(path, original, fixed) {
  const a = (original || '').split('\n');
  const b = (fixed || '').split('\n');
  // Lightweight whole-file replace diff (good enough for review UI)
  const lines = [`--- a/${path}`, `+++ b/${path}`, `@@ -1,${a.length} +1,${b.length} @@`];
  for (const line of a) lines.push(`-${line}`);
  for (const line of b) lines.push(`+${line}`);
  return lines.join('\n');
}

function extractFailureSummary(runType, doc) {
  if (runType === 'monitor') {
    return redactSecretsDeep({
      type: 'monitor',
      status: doc.status,
      message: doc.message,
      duration: doc.duration,
      assertions: doc.assertions,
      request: doc.request,
      response: {
        status: doc.response?.status,
        statusText: doc.response?.statusText,
        data: truncate(doc.response?.data, 2000),
        error: doc.response?.error,
      },
    });
  }

  const failed = (doc.results || []).filter((r) => r.status === 'failed' || r.status === 'error');
  return redactSecretsDeep({
    type: 'pipeline',
    status: doc.status,
    summary: doc.summary,
    failures: failed.slice(0, 5).map((r) => ({
      status: r.status,
      error: r.error,
      assertionResult: r.assertionResult,
      request: r.request
        ? {
            method: r.request.method,
            url: r.request.url,
            // omit headers/body secrets via redact on wrapper
            headers: r.request.headers,
            body: truncate(r.request.body, 1000),
          }
        : null,
      response: r.response
        ? {
            status: r.response.status,
            data: truncate(r.response.data, 1500),
          }
        : null,
      path: r.path || r.interface_path,
      interface_id: r.interface_id,
    })),
  });
}

async function loadCodeContext(projectId, failureSummary) {
  const repository = await CodeRepository.findOne({ project_id: projectId, enabled: true });
  if (!repository) {
    return { repository: null, files: [] };
  }

  const candidates = new Set();
  const failures = failureSummary.failures || [];
  for (const f of failures) {
    const interfacePath = f.path || f.request?.url || '';
    try {
      const u = interfacePath.includes('://') ? new URL(interfacePath).pathname : interfacePath;
      codeRepositoryService.inferFilePath(u || '/api/unknown').forEach((p) => candidates.add(p));
    } catch {
      codeRepositoryService.inferFilePath('/api/unknown').forEach((p) => candidates.add(p));
    }
  }
  if (failureSummary.type === 'monitor' && failureSummary.request?.url) {
    try {
      const u = new URL(failureSummary.request.url);
      codeRepositoryService.inferFilePath(u.pathname).forEach((p) => candidates.add(p));
    } catch {
      /* ignore */
    }
  }

  const files = [];
  for (const filePath of candidates) {
    if (files.length >= 3) break;
    try {
      const content = await codeRepositoryService.getFileContent(repository, filePath);
      files.push({
        path: filePath,
        content: truncate(content, 12000),
        language: filePath.endsWith('.ts') ? 'typescript' : 'javascript',
      });
    } catch {
      /* try next */
    }
  }

  return { repository, files };
}

function heuristicSuggestion(failureSummary, codeFiles) {
  const status = failureSummary.status || 'failed';
  const msg =
    failureSummary.message ||
    failureSummary.failures?.[0]?.error ||
    JSON.stringify(failureSummary.summary || {});

  const files = (codeFiles.length ? codeFiles : [{ path: 'README_FIX.md', content: '' }]).map((f) => {
    const note = [
      `// ApiAdmin heuristic suggestion (AI not configured or failed)`,
      `// Failure status: ${status}`,
      `// Hint: ${truncate(String(msg), 200)}`,
      `// Review assertions, status codes, and auth headers.`,
      f.content || '// Add handler / fix implementation here\n',
    ].join('\n');
    return {
      path: f.path === 'README_FIX.md' ? 'docs/APIADMIN_FIX_HINT.md' : f.path,
      diff: buildUnifiedDiff(
        f.path === 'README_FIX.md' ? 'docs/APIADMIN_FIX_HINT.md' : f.path,
        f.content || '',
        note
      ),
      rationale: 'Heuristic stub — configure AI + code repository for real patches.',
      fixed_content: note,
      original_content: f.content || '',
    };
  });

  return {
    summary: `No AI patch generated. Failure: ${truncate(String(msg), 300)}. Configure Admin AI and project Code Repository for better suggestions.`,
    files,
    source: codeFiles.length ? 'heuristic_with_repo' : 'heuristic',
    repository_configured: !!codeFiles.length,
  };
}

function parseAiPatchResponse(text, codeFiles) {
  const jsonStr = String(text || '')
    .replace(/```json\n?|\n?```/gi, '')
    .trim();
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Treat as prose + optional single code fence
    const parts = String(text).split(/```(?:diff|javascript|js|typescript|ts)?/);
    const explanation = parts[0]?.trim() || String(text).slice(0, 500);
    const code = parts[1]?.trim();
    const target = codeFiles[0];
    if (target && code) {
      return {
        summary: explanation,
        files: [
          {
            path: target.path,
            diff: buildUnifiedDiff(target.path, target.content, code),
            rationale: explanation.slice(0, 400),
            fixed_content: code,
            original_content: target.content,
          },
        ],
        source: 'ai_prose',
      };
    }
    throw new Error('AI returned non-JSON patch');
  }

  const files = [];
  for (const item of parsed.files || []) {
    const path = item.path || codeFiles[0]?.path || 'suggested-fix.js';
    const original =
      item.original_content ??
      codeFiles.find((f) => f.path === path)?.content ??
      '';
    let diff = item.diff;
    const fixed = item.fixed_content || item.content || item.code;
    if (!diff && fixed != null) {
      diff = buildUnifiedDiff(path, original, fixed);
    }
    if (!diff) continue;
    files.push({
      path,
      diff,
      rationale: item.rationale || parsed.summary || '',
      fixed_content: fixed || null,
      original_content: original,
    });
  }

  if (!files.length) {
    throw new Error('AI JSON missing files/diff');
  }

  return {
    summary: parsed.summary || 'AI suggested code changes',
    files,
    source: 'ai',
  };
}

function buildFixPrompt(failureSummary, codeFiles) {
  return `You are a senior engineer. A self-hosted API test/monitor failed.
Propose minimal code fixes. Return ONLY JSON:

{
  "summary": "one paragraph",
  "files": [
    {
      "path": "relative/path.js",
      "fixed_content": "full file content after fix",
      "rationale": "why"
    }
  ]
}

Rules:
- Prefer editing provided source files; if none, suggest a new path under src/.
- Do not include secrets. Do not invent unrelated refactors.
- Keep changes small.

Failure (redacted):
${JSON.stringify(failureSummary, null, 2)}

Source files:
${codeFiles.length ? codeFiles.map((f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n') : '(no repo files found — suggest a new handler file)'}
`;
}

/**
 * @param {{ run_type: 'pipeline'|'monitor', run_id: string, project_id?: string, create_draft_pr?: boolean, file_path?: string }} input
 * @param {{ callAI?: Function, user?: any }} options
 */
export async function suggestCodeFix(input, options = {}) {
  const runType = input.run_type === 'monitor' ? 'monitor' : 'pipeline';
  const runId = input.run_id;

  let projectId = input.project_id;
  let failureSummary;
  let targetId = runId;
  let targetName = runType;

  if (runType === 'monitor') {
    const run = await ApiMonitorRun.findById(runId).lean();
    if (!run) throw Object.assign(new Error('Monitor run not found'), { status: 404 });
    projectId = projectId || String(run.project_id);
    failureSummary = extractFailureSummary('monitor', run);
    const mon = await ApiMonitor.findById(run.monitor_id).lean();
    targetName = mon?.name || 'monitor-run';
  } else {
    const result = await AutoTestResult.findById(runId).lean();
    if (!result) throw Object.assign(new Error('Pipeline result not found'), { status: 404 });
    const task = await AutoTestTask.findById(result.task_id).lean();
    projectId = projectId || (task?.project_id ? String(task.project_id) : null);
    if (!projectId) throw Object.assign(new Error('Cannot resolve project_id'), { status: 400 });
    failureSummary = extractFailureSummary('pipeline', result);
    targetName = task?.name || 'pipeline-result';
  }

  const { repository, files: codeFiles } = await loadCodeContext(projectId, failureSummary);

  // Optional explicit file
  if (input.file_path && repository) {
    try {
      const content = await codeRepositoryService.getFileContent(repository, input.file_path);
      if (!codeFiles.find((f) => f.path === input.file_path)) {
        codeFiles.unshift({
          path: input.file_path,
          content: truncate(content, 12000),
          language: 'javascript',
        });
      }
    } catch (error) {
      logger.warn({ error: error.message, file_path: input.file_path }, 'Explicit file fetch failed');
    }
  }

  let suggestion;
  if (typeof options.callAI === 'function') {
    try {
      const prompt = buildFixPrompt(failureSummary, codeFiles);
      const raw = await options.callAI(prompt, {
        systemPrompt: 'You return strict JSON only for code fix suggestions.',
        maxTokens: 4000,
      });
      const text = typeof raw === 'string' ? raw : raw?.content || raw?.text || '';
      suggestion = parseAiPatchResponse(text, codeFiles);
      suggestion.repository_configured = !!repository;
    } catch (error) {
      logger.warn({ error: error.message }, 'AI code fix failed, using heuristic');
      suggestion = heuristicSuggestion(failureSummary, codeFiles);
      suggestion.ai_error = error.message;
    }
  } else {
    suggestion = heuristicSuggestion(failureSummary, codeFiles);
  }

  let pull_request = null;
  if (input.create_draft_pr && repository && suggestion.files?.length) {
    try {
      pull_request = await codeRepositoryService.createDraftPullRequest(repository, {
        title: `[ApiAdmin] Fix suggestion: ${targetName}`,
        body: `${suggestion.summary}\n\n_Generated by ApiAdmin AI — review carefully before merge._`,
        files: suggestion.files
          .filter((f) => f.fixed_content != null)
          .map((f) => ({ path: f.path, content: f.fixed_content })),
        branchPrefix: 'apiadmin-fix',
      });
    } catch (error) {
      logger.warn({ error: error.message }, 'Draft PR creation failed');
      pull_request = { error: error.message };
    }
  }

  return {
    project_id: projectId,
    run_type: runType,
    run_id: runId,
    target_id: targetId,
    target_name: targetName,
    failure: failureSummary,
    summary: suggestion.summary,
    files: suggestion.files,
    source: suggestion.source,
    repository_configured: !!repository,
    ai_error: suggestion.ai_error || null,
    pull_request,
  };
}

export default { suggestCodeFix, buildUnifiedDiff, extractFailureSummary };
