import crypto from 'crypto';

export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

export const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const sanitizeHtml = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const validateUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^\[::1\]$/,
];

export const isPrivateOrLocalHost = (hostname) => {
  if (!hostname) return true;
  const host = hostname.replace(/^\[|\]$/g, '');
  return PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(host));
};

/**
 * Block SSRF to internal/link-local addresses for outbound proxy requests.
 * Allows private hosts only when ALLOW_PRIVATE_OUTBOUND=true (e.g. internal staging).
 */
export const assertSafeOutboundUrl = (rawUrl) => {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('无效的目标 URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('仅允许 http/https 协议');
  }

  const allowPrivate = process.env.ALLOW_PRIVATE_OUTBOUND === 'true';
  if (!allowPrivate && isPrivateOrLocalHost(parsed.hostname)) {
    throw new Error('禁止访问内网或本地地址');
  }

  return parsed.toString();
};

export const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

