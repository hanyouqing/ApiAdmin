import { describe, it, expect } from 'vitest';
import {
  evaluateStepCondition,
  resolvePassStatus,
  clampWaitMs,
  clampLoopCount,
  normalizeStepType,
} from '../../Server/Utils/scenarioSteps.js';
import { buildRequestFromInterface } from '../../Server/Utils/caseSync.js';

describe('scenarioSteps', () => {
  it('normalizes step types', () => {
    expect(normalizeStepType({})).toBe('request');
    expect(normalizeStepType({ step_type: 'wait' })).toBe('wait');
    expect(normalizeStepType({ step_type: 'bogus' })).toBe('request');
  });

  it('clamps wait and loop', () => {
    expect(clampWaitMs(999999)).toBe(60000);
    expect(clampWaitMs(-1)).toBe(0);
    expect(clampLoopCount(100)).toBe(50);
    expect(clampLoopCount(0)).toBe(1);
  });

  it('evaluates conditions against last response', () => {
    expect(
      evaluateStepCondition('last.status_code === 200', {
        last: { status_code: 200 },
      })
    ).toBe(true);
    expect(
      evaluateStepCondition('last.status_code === 500', {
        last: { status_code: 200 },
      })
    ).toBe(false);
  });

  it('resolves pass threshold', () => {
    expect(resolvePassStatus({ passed: 9, failed: 1, error: 0 }, { min_pass_rate: 90 })).toBe(
      'passed'
    );
    expect(resolvePassStatus({ passed: 8, failed: 2, error: 0 }, { min_pass_rate: 90 })).toBe(
      'failed'
    );
    expect(resolvePassStatus({ passed: 1, failed: 0, error: 0 }, { min_pass_rate: 100 })).toBe(
      'passed'
    );
  });
});

describe('caseSync', () => {
  it('builds request from interface', () => {
    const req = buildRequestFromInterface({
      method: 'post',
      path: '/pets/{id}',
      req_headers: [{ name: 'Content-Type', value: 'application/json' }],
      req_query: [{ name: 'verbose', example: '1' }],
      req_body_type: 'json',
      req_body_other: '{"name":"dog"}',
    });
    expect(req.method).toBe('POST');
    expect(req.path).toBe('/pets/{id}');
    expect(req.headers['Content-Type']).toBe('application/json');
    expect(req.query.verbose).toBe('1');
    expect(req.body).toEqual({ name: 'dog' });
    expect(req.path_params).toHaveProperty('id');
  });
});
