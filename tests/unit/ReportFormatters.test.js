import { describe, it, expect } from 'vitest';
import { formatJUnitXML, normalizeReportForFormatters } from '../../Server/Utils/reportFormatters.js';

describe('reportFormatters', () => {
  it('normalizes TestRunner flat report into summary + snake_case results', () => {
    const report = {
      total: 2,
      passed: 1,
      failed: 1,
      errors: 0,
      duration: 120,
      results: [
        {
          interfaceId: 'a1',
          interfaceName: 'Get User',
          testCaseName: 'status 200',
          status: 'passed',
          duration: 50,
          assertionResult: { passed: true, message: 'ok' },
          request: { method: 'GET', url: 'http://x/user' },
          response: { statusCode: 200 },
        },
        {
          interface_id: 'a1',
          interface_name: 'Get User',
          test_case_name: 'assert body',
          status: 'failed',
          duration: 70,
          assertion_result: { passed: false, message: 'missing id', errors: ['id'] },
          request: { method: 'GET', path: '/user' },
          response: { status: 200 },
        },
      ],
    };

    const normalized = normalizeReportForFormatters(report);
    expect(normalized.summary.total).toBe(2);
    expect(normalized.summary.failed).toBe(1);
    expect(normalized.results[0].interface_id).toBe('a1');
    expect(normalized.results[0].test_case_name).toBe('status 200');

    const xml = formatJUnitXML(report);
    expect(xml).toContain('<?xml');
    expect(xml).toContain('testsuites');
    expect(xml).toContain('Get User');
    expect(xml).toContain('failure');
  });

  it('formats AutoTestResult-shaped reports', () => {
    const xml = formatJUnitXML({
      summary: { total: 1, passed: 1, failed: 0, error: 0 },
      duration: 10,
      results: [
        {
          interface_id: 'b1',
          interface_name: 'Ping',
          status: 'passed',
          duration: 10,
          request: { method: 'GET', url: '/ping' },
          response: { status_code: 200 },
        },
      ],
    });
    expect(xml).toContain('Ping');
    expect(xml).not.toContain('<failure');
  });
});
