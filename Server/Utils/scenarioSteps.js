/**
 * Scenario control helpers for AutoTest pipeline (MeterSphere-style wait / if / loop).
 */
import vm from 'node:vm';

const MAX_WAIT_MS = 60_000;
const MAX_LOOP = 50;

export function normalizeStepType(step) {
  const t = step?.step_type || 'request';
  return ['request', 'wait', 'if', 'endif'].includes(t) ? t : 'request';
}

export function clampWaitMs(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(MAX_WAIT_MS, Math.floor(n));
}

export function clampLoopCount(count) {
  const n = parseInt(String(count ?? 1), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(MAX_LOOP, n);
}

/**
 * Evaluate a simple JS condition against last response / env / records.
 * Uses node:vm with tight timeout — not a security boundary.
 */
export function evaluateStepCondition(condition, context = {}) {
  const code = String(condition || '').trim();
  if (!code) return true;

  const sandbox = {
    env: context.env || {},
    records: context.records || [],
    last: context.last || null,
    vars: context.vars || {},
    console: { log() {}, warn() {}, error() {} },
  };

  try {
    const script = new vm.Script(`(function(){ return !!(${code}); })()`);
    return Boolean(
      script.runInNewContext(sandbox, {
        timeout: 200,
        displayErrors: false,
      })
    );
  } catch (err) {
    const error = new Error(`Condition error: ${err.message}`);
    error.code = 'CONDITION_ERROR';
    throw error;
  }
}

/**
 * @param {{ passed: number, failed: number, error: number, skipped?: number, total?: number }} summary
 * @param {{ min_pass_rate?: number, treat_error_as_fail?: boolean }|null|undefined} threshold
 * @returns {'passed'|'failed'}
 */
export function resolvePassStatus(summary, threshold) {
  const passed = summary?.passed || 0;
  const failed = summary?.failed || 0;
  const error = summary?.error || 0;
  const considered = passed + failed + error;
  if (considered === 0) {
    return 'passed';
  }

  const minRate =
    threshold && Number.isFinite(Number(threshold.min_pass_rate))
      ? Math.min(100, Math.max(0, Number(threshold.min_pass_rate)))
      : 100;

  const rate = (passed / considered) * 100;
  if (rate + 1e-9 < minRate) {
    return 'failed';
  }
  return 'passed';
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, clampWaitMs(ms)));
}

export { MAX_WAIT_MS, MAX_LOOP };
