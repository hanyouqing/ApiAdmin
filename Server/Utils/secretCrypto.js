import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

function getKey() {
  const raw = process.env.SECRETS_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!raw || typeof raw !== 'string') {
    throw new Error('SECRETS_ENCRYPTION_KEY or JWT_SECRET is required to encrypt secrets');
  }
  return crypto.createHash('sha256').update(raw).digest();
}

export function isEncryptedSecret(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function encryptSecret(plaintext) {
  if (plaintext == null || plaintext === '') {
    return '';
  }
  if (typeof plaintext !== 'string') {
    plaintext = String(plaintext);
  }
  if (isEncryptedSecret(plaintext)) {
    return plaintext;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(value) {
  if (value == null || value === '') {
    return '';
  }
  if (typeof value !== 'string') {
    return String(value);
  }
  if (!isEncryptedSecret(value)) {
    return value;
  }
  const payload = value.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted secret format');
  }
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function maskSecret(value, visible = 4) {
  if (!value) return '';
  const plain = isEncryptedSecret(value) ? '********' : value;
  if (plain.length <= visible) return '********';
  return `${plain.slice(0, visible)}...`;
}

const SENSITIVE_SSO_KEYS = [
  'clientSecret',
  'client_secret',
  'privateKey',
  'private_key',
  'certificate',
  'cert',
  'password',
  'bindPassword',
  'bind_password',
  'secret',
];

export function encryptSsoConfig(config = {}) {
  if (!config || typeof config !== 'object') return config;
  const next = { ...config };
  for (const key of SENSITIVE_SSO_KEYS) {
    if (next[key] != null && next[key] !== '') {
      next[key] = encryptSecret(String(next[key]));
    }
  }
  return next;
}

export function decryptSsoConfig(config = {}) {
  if (!config || typeof config !== 'object') return config;
  const next = { ...config };
  for (const key of SENSITIVE_SSO_KEYS) {
    if (next[key] != null && next[key] !== '') {
      try {
        next[key] = decryptSecret(String(next[key]));
      } catch {
        // leave as-is if decrypt fails (legacy / wrong key)
      }
    }
  }
  return next;
}

export function isRegulatedMode() {
  return process.env.REGULATED === 'true' || process.env.REGULATED_MODE === 'true';
}

export function isCloudAiAllowed() {
  if (!isRegulatedMode()) return true;
  return process.env.ALLOW_CLOUD_AI === 'true';
}

export const CLOUD_AI_PROVIDERS = new Set([
  'openai',
  'deepseek',
  'doubao',
  'gemini',
  'kimi',
  'aliyun',
]);
