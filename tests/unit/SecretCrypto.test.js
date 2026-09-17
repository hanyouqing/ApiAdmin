import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  encryptSecret,
  decryptSecret,
  isEncryptedSecret,
  encryptSsoConfig,
  decryptSsoConfig,
  isRegulatedMode,
  isCloudAiAllowed,
} from '../../Server/Utils/secretCrypto.js';

describe('secretCrypto', () => {
  const prevKey = process.env.SECRETS_ENCRYPTION_KEY;
  const prevJwt = process.env.JWT_SECRET;
  const prevRegulated = process.env.REGULATED;
  const prevCloud = process.env.ALLOW_CLOUD_AI;

  beforeEach(() => {
    process.env.SECRETS_ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-32b';
    process.env.JWT_SECRET = 'dev-secret-key-change-in-production-32chars';
    delete process.env.REGULATED;
    delete process.env.ALLOW_CLOUD_AI;
  });

  afterEach(() => {
    process.env.SECRETS_ENCRYPTION_KEY = prevKey;
    process.env.JWT_SECRET = prevJwt;
    if (prevRegulated === undefined) delete process.env.REGULATED;
    else process.env.REGULATED = prevRegulated;
    if (prevCloud === undefined) delete process.env.ALLOW_CLOUD_AI;
    else process.env.ALLOW_CLOUD_AI = prevCloud;
  });

  it('encrypts and decrypts round-trip', () => {
    const enc = encryptSecret('sk-test-secret');
    expect(isEncryptedSecret(enc)).toBe(true);
    expect(enc).not.toContain('sk-test-secret');
    expect(decryptSecret(enc)).toBe('sk-test-secret');
  });

  it('is idempotent on already encrypted values', () => {
    const enc = encryptSecret('abc');
    expect(encryptSecret(enc)).toBe(enc);
  });

  it('encrypts SSO sensitive config keys', () => {
    const encrypted = encryptSsoConfig({
      clientId: 'public-id',
      clientSecret: 'super-secret',
      tokenUrl: 'https://example.com/token',
    });
    expect(encrypted.clientId).toBe('public-id');
    expect(isEncryptedSecret(encrypted.clientSecret)).toBe(true);
    const decrypted = decryptSsoConfig(encrypted);
    expect(decrypted.clientSecret).toBe('super-secret');
  });

  it('regulated mode blocks cloud AI unless ALLOW_CLOUD_AI', () => {
    process.env.REGULATED = 'true';
    expect(isRegulatedMode()).toBe(true);
    expect(isCloudAiAllowed()).toBe(false);
    process.env.ALLOW_CLOUD_AI = 'true';
    expect(isCloudAiAllowed()).toBe(true);
  });
});
