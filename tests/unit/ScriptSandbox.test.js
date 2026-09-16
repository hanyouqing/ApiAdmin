import { describe, it, expect } from 'vitest';
import { createPmSandbox, runScript, applyEnvToString, deepResolveTemplates } from '../../Server/Utils/scriptSandbox.js';

describe('scriptSandbox', () => {
  it('runs pre-request script and mutates environment', () => {
    const request = { headers: {}, method: 'GET', url: '' };
    const sandbox = createPmSandbox({
      request,
      environment: { base: 'https://api.example.com' },
      variables: {},
      iterationData: { userId: 'u1' },
    });

    const result = runScript(
      `
      pm.environment.set('token', 'abc');
      pm.variables.set('uid', pm.iterationData.get('userId'));
      pm.request.setHeader('X-Token', pm.environment.get('token'));
      `,
      sandbox
    );

    expect(result.ok).toBe(true);
    expect(sandbox.getEnvironment().token).toBe('abc');
    expect(sandbox.getVariables().uid).toBe('u1');
    expect(request.headers['X-Token']).toBe('abc');
  });

  it('supports pm.test assertions', () => {
    const sandbox = createPmSandbox({
      request: {},
      response: { statusCode: 200, body: { ok: true }, headers: {} },
    });
    const result = runScript(
      `
      pm.test('status is 200', function () {
        pm.expect(pm.response.code).to.eql(200);
      });
      `,
      sandbox
    );
    expect(result.ok).toBe(true);
    expect(sandbox.getTests()[0].passed).toBe(true);
  });

  it('resolves {{var}} templates', () => {
    expect(applyEnvToString('Hello {{name}}', { name: 'ApiAdmin' })).toBe('Hello ApiAdmin');
    expect(deepResolveTemplates({ url: '{{host}}/x' }, { host: 'https://a.com' }, {}, {})).toEqual({
      url: 'https://a.com/x',
    });
  });
});
