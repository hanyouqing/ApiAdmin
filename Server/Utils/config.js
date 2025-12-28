const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URL',
];

const optionalEnvVars = {
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

export const config = {};

let configInitialized = false;

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
  // 清空当前配置
  Object.keys(config).forEach(key => delete config[key]);
  
  // 重新验证和加载配置
  validateConfig();
  configInitialized = true;
  
  return config;
}

export const validateConfig = () => {
  const missing = [];
  const isProduction = process.env.NODE_ENV === 'production';

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      if (isProduction) {
        missing.push(varName);
      }
      // 在开发环境中，validateConfig 会在 config.js 加载时被调用，此时 logger 可能还未初始化
      // 警告会在 App.js 中通过 logger 统一输出，这里不输出警告
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  for (const [key, defaultValue] of Object.entries(optionalEnvVars)) {
    // 环境变量优先，如果不存在则使用默认值
    // 注意：空字符串也会被当作有效值，但需要处理空字符串的情况
    if (process.env[key] !== undefined) {
      // 如果环境变量是空字符串，且默认值是 null，则保持为 null（表示未配置）
      // 否则使用环境变量的值（即使是空字符串）
      if (process.env[key] === '' && defaultValue === null) {
        config[key] = null;
      } else {
        config[key] = process.env[key];
      }
    } else {
      config[key] = defaultValue;
    }
  }

  for (const varName of requiredEnvVars) {
    if (process.env[varName]) {
      config[varName] = process.env[varName];
    } else if (!isProduction) {
      if (varName === 'JWT_SECRET') {
        config[varName] = 'dev-secret-key-change-in-production';
      } else if (varName === 'MONGODB_URL') {
        // 默认使用无认证的本地 MongoDB（仅开发环境）
        // 如果 MongoDB 需要认证，请在 .env 或 .env.local 中设置完整的连接字符串
        // 格式：mongodb://username:password@localhost:27017/apiadmin?authSource=admin
        config[varName] = 'mongodb://localhost:27017/apiadmin';
      } else {
        config[varName] = process.env[varName];
      }
    } else {
      config[varName] = process.env[varName];
    }
  }

  if (isProduction && config.JWT_SECRET === 'your-secret-key') {
    throw new Error(
      'JWT_SECRET must be set to a secure value in production'
    );
  }

  if (isProduction && config.CORS_ORIGIN === '*') {
    console.warn(
      'Warning: CORS_ORIGIN is set to "*" in production. This is insecure.'
    );
  }

  return config;
};

// 使用 Proxy 来延迟初始化配置
// 当第一次访问 config 对象时，才执行 validateConfig
// 这样可以确保环境变量已经加载（通过 App.js 中的 loadEnvFiles）
const configProxy = new Proxy(config, {
  get(target, prop) {
    ensureConfigInitialized();
    return target[prop];
  },
  set(target, prop, value) {
    ensureConfigInitialized();
    target[prop] = value;
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

// 不立即执行 validateConfig，而是延迟到第一次访问 config 对象时
// 这样可以确保 App.js 中的 loadEnvFiles() 已经执行
// App.js 会在环境变量加载后调用 reloadConfig() 来初始化配置

export default configProxy;

