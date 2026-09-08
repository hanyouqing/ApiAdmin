import { Config } from '../Types/config.js';

const requiredEnvVars: (keyof Config)[] = [
  'JWT_SECRET',
  'MONGODB_URL',
];

const optionalEnvVars: Partial<Config> = {
  PORT: 3000,
  NODE_ENV: 'development',
  JWT_EXPIRES_IN: '7d',
  LOG_LEVEL: 'info',
  REDIS_URL: null,
  CORS_ORIGIN: 'http://localhost:3000',
  UPLOAD_MAX_SIZE: 10485760,
  UPLOAD_PATH: './uploads',
  SWAGGER_ENABLED: false,
  SWAGGER_ALLOWED_IP_ADDRESSES: null,
  APP_URL: 'http://localhost:3000',
  SMTP_HOST: null,
  SMTP_PORT: 587,
  SMTP_SECURE: 'false',
  SMTP_USER: null,
  SMTP_PASS: null,
  SMTP_FROM: null,
  EMAIL_PROVIDER: 'smtp',
  OCI_EMAIL_REGION: null,
  OCI_EMAIL_USER: null,
  OCI_EMAIL_PASS: null,
  OCI_EMAIL_FROM: null,
};

export const config = {} as Config;

let configInitialized = false;

const WEAK_JWT_SECRETS = new Set([
  'your-secret-key',
  'your-secret-key-change-this-in-production',
  'change-me',
  'change-me-in-production',
  'dev-secret-key-change-in-production',
  'secret',
  'jwt-secret',
]);

function isWeakJwtSecret(secret: string | undefined | null): boolean {
  if (!secret || typeof secret !== 'string') return true;
  const normalized = secret.trim().toLowerCase();
  if (WEAK_JWT_SECRETS.has(normalized)) return true;
  if (secret.length < 32) return true;
  return false;
}

/**
 * 初始化配置（延迟初始化，确保环境变量已加载）
 */
function ensureConfigInitialized() {
  if (!configInitialized) {
    validateConfig();
    configInitialized = true;
  }
}

/**
 * 重新加载配置（当环境变量变化时调用）
 */
export function reloadConfig() {
  Object.keys(config).forEach(key => delete (config as any)[key]);
  validateConfig();
  configInitialized = true;
  return config;
}

export const validateConfig = () => {
  const missing: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      if (isProduction) {
        missing.push(varName);
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  for (const [key, defaultValue] of Object.entries(optionalEnvVars)) {
    const k = key as keyof Config;
    if (process.env[k] !== undefined) {
      if (process.env[k] === '' && defaultValue === null) {
        (config as any)[k] = null;
      } else {
        (config as any)[k] = process.env[k];
      }
    } else {
      (config as any)[k] = defaultValue;
    }
  }

  for (const varName of requiredEnvVars) {
    if (process.env[varName]) {
      (config as any)[varName] = process.env[varName];
    } else if (!isProduction) {
      if (varName === 'JWT_SECRET') {
        (config as any)[varName] = 'dev-secret-key-change-in-production';
      } else if (varName === 'MONGODB_URL') {
        (config as any)[varName] = 'mongodb://localhost:27017/apiadmin';
      } else {
        (config as any)[varName] = process.env[varName];
      }
    } else {
      (config as any)[varName] = process.env[varName];
    }
  }

  (config as any).ALLOW_PUBLIC_REGISTRATION =
    process.env.ALLOW_PUBLIC_REGISTRATION === 'true' ||
    (!isProduction && process.env.ALLOW_PUBLIC_REGISTRATION !== 'false');

  if (isProduction && isWeakJwtSecret(config.JWT_SECRET)) {
    throw new Error(
      'JWT_SECRET must be a strong random value (>=32 chars) in production'
    );
  }

  if (isProduction && (!config.CORS_ORIGIN || config.CORS_ORIGIN === '*')) {
    throw new Error(
      'CORS_ORIGIN must be set to explicit origin(s) in production (wildcard is not allowed)'
    );
  }

  if (isProduction && !config.REDIS_URL && process.env.REQUIRE_REDIS !== 'false') {
    throw new Error(
      'REDIS_URL is required in production for rate limiting and shared auth codes. Set REQUIRE_REDIS=false only for single-instance emergency mode.'
    );
  }

  if (isProduction && process.env.ALLOW_MOCK_SCRIPTS === 'true' && process.env.ALLOW_UNSAFE_MOCK_SCRIPTS !== 'true') {
    console.warn(
      'Warning: ALLOW_MOCK_SCRIPTS=true without ALLOW_UNSAFE_MOCK_SCRIPTS=true; custom mock scripts remain disabled in production.'
    );
  }

  return config;
};

const configProxy = new Proxy(config, {
  get(target, prop) {
    ensureConfigInitialized();
    return (target as any)[prop];
  },
  set(target, prop, value) {
    ensureConfigInitialized();
    (target as any)[prop] = value;
    return true;
  },
  has(target, prop) {
    ensureConfigInitialized();
    return prop in target;
  },
  ownKeys(target) {
    ensureConfigInitialized();
    return Object.keys(target);
  },
  getOwnPropertyDescriptor(target, prop) {
    ensureConfigInitialized();
    return Object.getOwnPropertyDescriptor(target, prop);
  },
});

export default configProxy;
