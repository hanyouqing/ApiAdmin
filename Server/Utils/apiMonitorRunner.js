import axios from 'axios';
import { logger } from './logger.js';
import ApiMonitor from '../Models/ApiMonitor.js';
import ApiMonitorRun from '../Models/ApiMonitorRun.js';
import { assertSafeOutboundUrl } from './security.js';
import { resolveEnvironmentContext } from './variableResolver.js';
import { deepResolveTemplates } from './scriptSandbox.js';
import { sendEmail } from './emailService.js';
import EmailConfig from '../Models/EmailConfig.js';

function bodyToText(data) {
  if (data == null) return '';
  if (typeof data === 'string') return data;
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

function evaluateAssertions(assertions = {}, response, duration) {
  const results = [];
  let passed = true;

  if (assertions.status_code != null && assertions.status_code !== '') {
    const expected = Number(assertions.status_code);
    const ok = response.status === expected;
    results.push({ name: 'status_code', expected, actual: response.status, passed: ok });
    if (!ok) passed = false;
  }

  if (assertions.body_contains) {
    const text = bodyToText(response.data);
    const ok = text.includes(assertions.body_contains);
    results.push({
      name: 'body_contains',
      expected: assertions.body_contains,
      actual: ok ? 'found' : 'missing',
      passed: ok,
    });
    if (!ok) passed = false;
  }

  if (assertions.max_response_time_ms != null && assertions.max_response_time_ms !== '') {
    const max = Number(assertions.max_response_time_ms);
    const ok = duration <= max;
    results.push({ name: 'max_response_time_ms', expected: max, actual: duration, passed: ok });
    if (!ok) passed = false;
  }

  return { passed, results };
}

async function notifyMonitor(monitor, run) {
  const notification = monitor.notification || {};
  if (!notification.enabled) return;

  const isFailure = run.status === 'failing' || run.status === 'error';
  const isSuccess = run.status === 'passing';
  const shouldNotify =
    (isFailure && notification.on_failure !== false) || (isSuccess && notification.on_success === true);
  if (!shouldNotify) return;

  const payload = {
    event: 'api_monitor',
    monitor_id: String(monitor._id),
    monitor_name: monitor.name,
    project_id: String(monitor.project_id),
    status: run.status,
    message: run.message,
    duration: run.duration,
    run_at: run.run_at,
    assertions: run.assertions,
  };

  if (notification.webhook_url) {
    try {
      const url = assertSafeOutboundUrl(notification.webhook_url);
      await axios.post(url, payload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
        maxRedirects: 0,
      });
    } catch (error) {
      logger.warn({ error: error.message, monitorId: monitor._id }, 'Monitor webhook failed');
    }
  }

  const emails = Array.isArray(notification.email_addresses)
    ? notification.email_addresses.filter(Boolean)
    : [];
  if (emails.length > 0) {
    try {
      const emailConfig = await EmailConfig.getConfig();
      if (!emailConfig) {
        logger.warn({ monitorId: monitor._id }, 'Email not configured, skip monitor email');
      } else {
        await sendEmail(
          emails.join(','),
          `[ApiAdmin Monitor] ${monitor.name} — ${run.status}`,
          `<p>Monitor <b>${monitor.name}</b> status: <b>${run.status}</b></p>
           <p>${run.message || ''}</p>
           <p>Duration: ${run.duration}ms</p>`,
          `Monitor ${monitor.name} status: ${run.status}\n${run.message || ''}\nDuration: ${run.duration}ms`,
          emailConfig
        );
      }
    } catch (error) {
      logger.warn({ error: error.message, monitorId: monitor._id }, 'Monitor email failed');
    }
  }
}

export async function runApiMonitor(monitorId, { triggeredBy = 'manual' } = {}) {
  const monitor = await ApiMonitor.findById(monitorId);
  if (!monitor) {
    throw new Error('Monitor not found');
  }

  const started = Date.now();
  let status = 'passing';
  let message = 'OK';
  let requestSnapshot = {};
  let responseSnapshot = {};
  let assertionSnapshot = {};

  try {
    const envHint = monitor.environment_id ? { _id: monitor.environment_id } : {};
    const { merged, baseUrl, headers: envHeaders } = await resolveEnvironmentContext(
      monitor.project_id,
      envHint
    );

    let urlTemplate = monitor.request.url || '';
    if (baseUrl && urlTemplate.startsWith('/')) {
      urlTemplate = `${baseUrl.replace(/\/$/, '')}${urlTemplate}`;
    }

    const resolvedUrl = deepResolveTemplates(urlTemplate, merged, {}, {});
    const resolvedHeaders = deepResolveTemplates(
      { ...(envHeaders || {}), ...(monitor.request.headers || {}) },
      merged,
      {},
      {}
    );
    const resolvedBody = deepResolveTemplates(monitor.request.body, merged, {}, {});

    const safeUrl = assertSafeOutboundUrl(resolvedUrl);
    requestSnapshot = {
      method: monitor.request.method || 'GET',
      url: safeUrl,
      headers: resolvedHeaders,
      body: resolvedBody,
      triggeredBy,
    };

    const axiosResponse = await axios({
      method: monitor.request.method || 'GET',
      url: safeUrl,
      headers: resolvedHeaders,
      data: resolvedBody,
      timeout: Math.max(Number(monitor.assertions?.max_response_time_ms) || 5000, 5000) + 5000,
      maxRedirects: 0,
      validateStatus: () => true,
    });

    const duration = Date.now() - started;
    responseSnapshot = {
      status: axiosResponse.status,
      statusText: axiosResponse.statusText,
      headers: axiosResponse.headers,
      data: axiosResponse.data,
      duration,
    };

    const evalResult = evaluateAssertions(monitor.assertions, axiosResponse, duration);
    assertionSnapshot = evalResult.results;
    if (!evalResult.passed) {
      status = 'failing';
      message = evalResult.results
        .filter((r) => !r.passed)
        .map((r) => `${r.name}: expected ${r.expected}, got ${r.actual}`)
        .join('; ');
    }
  } catch (error) {
    status = 'error';
    message = error.message || 'Monitor run failed';
    responseSnapshot = { error: message };
    assertionSnapshot = [];
  }

  const duration = Date.now() - started;
  const run = await ApiMonitorRun.create({
    monitor_id: monitor._id,
    project_id: monitor.project_id,
    status,
    request: requestSnapshot,
    response: responseSnapshot,
    assertions: assertionSnapshot,
    message,
    duration,
    run_at: new Date(),
  });

  monitor.last_run_at = run.run_at;
  monitor.last_status = status;
  monitor.last_duration = duration;
  monitor.last_message = message;
  await monitor.save();

  await notifyMonitor(monitor, run).catch((err) => {
    logger.warn({ error: err.message, monitorId: monitor._id }, 'Monitor notify error');
  });

  // Keep last 100 runs per monitor
  const oldRuns = await ApiMonitorRun.find({ monitor_id: monitor._id })
    .sort({ run_at: -1 })
    .skip(100)
    .select('_id');
  if (oldRuns.length) {
    await ApiMonitorRun.deleteMany({ _id: { $in: oldRuns.map((r) => r._id) } });
  }

  return { monitor, run };
}

export default { runApiMonitor };
