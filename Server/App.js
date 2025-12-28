// 使用环境变量加载器（支持文件监听和自动刷新）
import { initEnvLoader, loadEnvFiles } from './Utils/envLoader.js';
import { fileURLToPath } from 'url';
import path from 'path';

// 获取 __dirname（ES 模块中需要手动获取）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初始化环境变量加载器（在 logger 初始化前）
// 注意：onReload 回调会在 logger 初始化后设置
let envLoader;
let loadedFiles = [];
let varSources = new Map();

// 先加载环境变量（不启用监听，等 logger 初始化后再启用）
// 必须在导入 config.js 之前加载，确保环境变量可用
const envLoadResult = loadEnvFiles();
loadedFiles = envLoadResult.loadedFiles;
varSources = envLoadResult.varSources;

import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import helmet from 'koa-helmet';
import serve from 'koa-static';
import mongoose from 'mongoose';
import router from './Router.js';
import { errorHandler } from './Middleware/errorHandler.js';
import { logger } from './Utils/logger.js';
import config, { reloadConfig } from './Utils/config.js';
import { swaggerWhitelistMiddleware } from './Middleware/swaggerWhitelist.js';
import { checkDependencies, waitForDependencies, isReady } from './Utils/dependencyChecker.js';
import './Models/index.js';

// 现在 logger 已初始化，重新初始化环境变量加载器并启用文件监听
// 同时重新加载配置以确保使用从 .env.local 加载的环境变量
reloadConfig();
envLoader = initEnvLoader({
  watch: process.env.NODE_ENV !== 'production', // 开发环境启用文件监听
  onReload: async (loadedFiles) => {
    // 环境变量重新加载时的回调
    logger.info({
      files: loadedFiles,
    }, '✅ Environment variables reloaded');
    
    // 重新加载配置
    const { reloadConfig } = await import('./Utils/config.js');
    reloadConfig();
    
    logger.info({
      files: loadedFiles,
    }, '✅ Configuration reloaded from environment variables');
  },
});

// 输出环境变量文件加载情况
if (loadedFiles.length === 0) {
  logger.warn({
    reason: 'No .env or .env.local file found, using system environment variables and defaults',
  }, '⚠️  Environment file not found');
} else if (loadedFiles.includes('.env.local') && !loadedFiles.includes('.env')) {
  logger.warn({
    envFiles: loadedFiles,
    reason: '.env file not found, using .env.local instead',
  }, '✅ Environment files loaded');
} else {
  logger.info({
    envFiles: loadedFiles,
    note: 'Priority: system env > .env.local > .env > defaults',
  }, '✅ Environment files loaded');
}

// 输出必需环境变量的来源信息
// 使用 envLoader.varSources 获取最新的来源信息（如果可用）
const finalVarSources = envLoader?.varSources || varSources;
const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URL'];
requiredEnvVars.forEach(varName => {
  const source = finalVarSources.get(varName);
  const value = process.env[varName];
  
  if (value) {
    // 环境变量已设置，显示来源
    const sourceText = source === 'system' ? '系统环境变量' : 
                       source === '.env.local' ? '.env.local 文件' : 
                       source === '.env' ? '.env 文件' : '环境变量';
    logger.info({
      varName,
      source,
      hasValue: true,
    }, `✅ 使用 ${sourceText} 已设置 ${varName}`);
  } else if (config.NODE_ENV !== 'production') {
    // 环境变量未设置，使用默认值
    logger.warn({
      varName,
      source: 'default',
      reason: 'env 中未设置，从代码中获取默认值',
      hint: varName === 'JWT_SECRET' 
        ? 'Set JWT_SECRET in .env or .env.local for production use'
        : 'If your MongoDB requires authentication, set MONGODB_URL in .env or .env.local',
    }, `⚠️  env 中未设置 ${varName}，从代码中获取默认值`);
  }
});

// 输出 Redis 配置状态（仅在开发环境）
if (config.NODE_ENV !== 'production') {
  const redisUrl = config.REDIS_URL;
  if (redisUrl) {
    logger.info({
      varName: 'REDIS_URL',
      configured: true,
      url: redisUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
    }, '✅ Redis configuration loaded');
  } else {
    logger.info({
      varName: 'REDIS_URL',
      configured: false,
      note: 'Redis is optional, will use memory store for rate limiting',
    }, 'ℹ️  Redis not configured (optional)');
  }
}

const app = new Koa();
app.proxy = true;

// CSP 配置：开发环境需要允许 eval（Vite HMR），生产环境更严格
const isDevelopment = config.NODE_ENV !== 'production';
app.use(helmet({
  contentSecurityPolicy: isDevelopment ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'http://localhost:3001', 'ws://localhost:3001'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'http://localhost:3000', 'http://localhost:3001', 'ws://localhost:3001', 'ws://localhost:3000'],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  } : {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

const corsOrigin = config.CORS_ORIGIN === '*' 
  ? '*' 
  : config.CORS_ORIGIN?.split(',').map(origin => origin.trim()) || '*';

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(bodyParser({
  jsonLimit: '10mb',
  formLimit: '10mb',
  textLimit: '10mb',
}));

app.use(errorHandler);

// 依赖就绪检查中间件：阻止业务逻辑执行直到依赖就绪
// 但允许健康检查和版本信息等系统端点
app.use(async (ctx, next) => {
  // 允许系统端点（健康检查、版本信息等）始终可访问
  if (ctx.path === '/api/health' || ctx.path === '/version' || ctx.path === '/api/version') {
    await next();
    return;
  }
  
  // 如果依赖未就绪，阻止业务逻辑执行
  if (!isReady()) {
    ctx.status = 503;
    ctx.body = {
      success: false,
      message: 'Service is not ready. Dependencies are still being checked.',
      status: 'not ready',
    };
    return;
  }
  
  await next();
});

const { prometheusMiddleware } = await import('./Middleware/prometheus.js');
app.use(prometheusMiddleware);

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  ctx.set('X-Response-Time', `${duration}ms`);
  
  if (ctx.url.startsWith('/api')) {
    const { logRequest } = await import('./Utils/logger.js');
    logRequest(ctx, duration);
  }
});

// 提供 swagger-ui-dist 静态文件（需要在路由之前）
const swaggerEnabled = config.SWAGGER_ENABLED === true || config.SWAGGER_ENABLED === 'true' || config.SWAGGER_ENABLED === '1';
if (swaggerEnabled) {
  const fs = await import('fs/promises');
  const swaggerUiDistPath = path.join(__dirname, 'node_modules/swagger-ui-dist');
  
  // 使用自定义中间件提供静态文件，确保正确的 MIME 类型
  app.use(async (ctx, next) => {
    if (ctx.path.startsWith('/swagger-ui-dist/')) {
      // 移除前缀并获取文件路径
      let filePath = ctx.path.replace('/swagger-ui-dist/', '');
      // 移除查询字符串
      filePath = filePath.split('?')[0];
      // 安全检查：防止路径遍历攻击
      if (filePath.includes('..') || filePath.startsWith('/')) {
        ctx.status = 403;
        return;
      }
      
      const fullPath = path.join(swaggerUiDistPath, filePath);
      
      try {
        // 确保文件在允许的目录内
        const resolvedPath = path.resolve(fullPath);
        const resolvedBase = path.resolve(swaggerUiDistPath);
        if (!resolvedPath.startsWith(resolvedBase)) {
          ctx.status = 403;
          return;
        }
        
        const stats = await fs.stat(fullPath);
        if (stats.isFile()) {
          const content = await fs.readFile(fullPath);
          
          // 设置正确的 MIME 类型
          if (filePath.endsWith('.css')) {
            ctx.type = 'text/css';
          } else if (filePath.endsWith('.js')) {
            ctx.type = 'application/javascript';
          } else if (filePath.endsWith('.png')) {
            ctx.type = 'image/png';
          } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            ctx.type = 'image/jpeg';
          } else if (filePath.endsWith('.svg')) {
            ctx.type = 'image/svg+xml';
          } else if (filePath.endsWith('.html')) {
            ctx.type = 'text/html';
          } else if (filePath.endsWith('.json')) {
            ctx.type = 'application/json';
          } else {
            ctx.type = 'application/octet-stream';
          }
          
          ctx.body = content;
          return;
        }
      } catch (err) {
        // 文件不存在或其他错误，继续到下一个中间件
        if (err.code !== 'ENOENT') {
          logger.debug({ error: err.message, path: ctx.path }, 'Error serving swagger-ui file');
        }
      }
    }
    await next();
  });
}

app.use(router.routes()).use(router.allowedMethods());

app.use(serve(path.join(__dirname, '../uploads'), { prefix: '/uploads' }));

const Router = (await import('koa-router')).default;
const swaggerRouter = new Router();

swaggerRouter.get('/swagger.json', swaggerWhitelistMiddleware, async (ctx) => {
  if (!swaggerEnabled) {
    ctx.status = 404;
    ctx.body = { error: 'Not Found' };
    return;
  }
  const swaggerDefinition = (await import('./Utils/swagger.js')).default;
  ctx.body = swaggerDefinition;
});

swaggerRouter.get('/swagger', swaggerWhitelistMiddleware, async (ctx) => {
  if (!swaggerEnabled) {
    ctx.status = 404;
    ctx.body = { error: 'Not Found' };
    return;
  }
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="/swagger-ui-dist/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/swagger-ui-dist/swagger-ui-bundle.js"></script>
  <script src="/swagger-ui-dist/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "/swagger.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>
  `;
  ctx.body = html;
  ctx.type = 'text/html';
});

swaggerRouter.get('/swagger-ui', swaggerWhitelistMiddleware, async (ctx) => {
  if (!swaggerEnabled) {
    ctx.status = 404;
    ctx.body = { error: 'Not Found' };
    return;
  }
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="/swagger-ui-dist/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/swagger-ui-dist/swagger-ui-bundle.js"></script>
  <script src="/swagger-ui-dist/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: "/swagger.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>
  `;
  ctx.body = html;
  ctx.type = 'text/html';
});

app.use(swaggerRouter.routes()).use(swaggerRouter.allowedMethods());

if (swaggerEnabled) {
  logger.info('Swagger UI enabled at /swagger and /swagger-ui');
} else {
  logger.info('Swagger UI disabled');
}

const { mockServer } = await import('./Middleware/mockServer.js');
app.use(mockServer);

app.use(serve(path.join(__dirname, '../Static')));

const PORT = config.PORT;
const MONGODB_URL = config.MONGODB_URL;

mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    // 如果已经连接，检查连接是否有效
    if (mongoose.connection.readyState === 1) {
      try {
        // 首先执行 ping 测试（最基本的连接验证）
        await mongoose.connection.db.admin().ping();
        
        // 然后尝试简单的数据库操作来验证权限
        // 使用更宽松的验证方式：先尝试 listCollections，如果失败，尝试更简单的操作
        let permissionVerified = false;
        try {
          // 尝试使用 listCollections 检查权限
          // 注意：某些 MongoDB 驱动版本可能不支持 limit()，需要先转换为数组
          try {
            await mongoose.connection.db.listCollections().limit(1).toArray();
            permissionVerified = true;
            logger.info('✅ MongoDB connection already established and verified (with collection access)');
          } catch (limitError) {
            // 如果 limit() 不支持，尝试不使用 limit
            await mongoose.connection.db.listCollections().toArray();
            permissionVerified = true;
            logger.info('✅ MongoDB connection already established and verified (with collection access, no limit)');
          }
        } catch (collectionError) {
          // 如果 listCollections 失败，尝试更简单的操作
          try {
            // 尝试执行一个简单的 find 操作（只需要基本的 read 权限）
            const testCollection = mongoose.connection.db.collection('users');
            await testCollection.findOne({}).limit(1);
            permissionVerified = true;
            logger.info('✅ MongoDB connection already established and verified (with read access)');
          } catch (findError) {
            // 如果 find 也失败，检查是否是认证错误
            if (findError.code === 13 || findError.codeName === 'Unauthorized' ||
                collectionError.code === 13 || collectionError.codeName === 'Unauthorized') {
              // 这是真正的认证错误，需要重新连接
              logger.warn({
                error: findError.message || collectionError.message,
                code: findError.code || collectionError.code,
                codeName: findError.codeName || collectionError.codeName,
              }, 'MongoDB connection authentication failed, will reconnect...');
              throw findError || collectionError; // 抛出错误，触发重新连接
            } else {
              // 其他权限错误（如权限不足或集合不存在），但连接本身是有效的
              logger.debug({
                error: findError.message || collectionError.message,
                code: findError.code || collectionError.code,
                codeName: findError.codeName || collectionError.codeName,
                note: 'Permission check failed but connection is valid (may be collection not exists)',
              }, 'MongoDB connection verified (ping OK, permission check inconclusive)');
            }
          }
        }
        
        return;
      } catch (pingError) {
        // 如果 ping 失败，说明连接确实有问题，需要重新连接
        logger.warn({
          error: pingError.message,
          code: pingError.code,
          codeName: pingError.codeName,
        }, 'Existing MongoDB connection failed verification, reconnecting...');
        try {
          await mongoose.disconnect();
        } catch (disconnectError) {
          // 忽略断开连接的错误
          logger.debug({ error: disconnectError.message }, 'Error disconnecting MongoDB');
        }
      }
    }

    const connectionOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };
    
    // 如果 MongoDB URL 中包含认证信息，从 URL 中提取 authSource
    // MongoDB URL 格式：mongodb://username:password@host:port/database?authSource=admin
    const authSourceMatch = MONGODB_URL.match(/[?&]authSource=([^&]+)/);
    if (authSourceMatch) {
      connectionOptions.authSource = authSourceMatch[1];
      logger.debug({
        authSource: authSourceMatch[1],
        source: 'URL parameter',
      }, 'MongoDB authSource extracted from URL');
    } else if (MONGODB_URL.includes('@')) {
      // 如果 URL 中包含 @（表示有用户名密码），但没有指定 authSource
      // 尝试从 URL 中提取用户名，如果用户名包含数据库名，使用该数据库作为 authSource
      // 否则默认使用 admin
      const userMatch = MONGODB_URL.match(/\/\/([^:]+):/);
      if (userMatch) {
        const username = userMatch[1];
        // 如果用户名看起来像数据库名（不包含特殊字符），可能该用户在该数据库中
        // 但为了安全，我们还是使用 admin 作为默认值
        connectionOptions.authSource = 'admin';
        logger.debug({
          username: username,
          authSource: 'admin',
          source: 'default (username found in URL)',
          note: 'authSource not specified in URL, using default "admin"',
        }, 'MongoDB authSource set to default');
      } else {
        connectionOptions.authSource = 'admin';
        logger.debug({
          authSource: 'admin',
          source: 'default',
        }, 'MongoDB authSource set to default');
      }
    } else {
      logger.debug('No authentication in MongoDB URL');
    }
    
    // 记录连接选项（隐藏敏感信息）
    logger.debug({
      maxPoolSize: connectionOptions.maxPoolSize,
      serverSelectionTimeoutMS: connectionOptions.serverSelectionTimeoutMS,
      socketTimeoutMS: connectionOptions.socketTimeoutMS,
      authSource: connectionOptions.authSource || 'none',
      url: MONGODB_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
    }, 'MongoDB connection options');
    
    try {
      await mongoose.connect(MONGODB_URL, connectionOptions);
    } catch (connectError) {
      // 如果是认证错误，提供更详细的错误信息
      if (connectError.code === 18 || connectError.codeName === 'AuthenticationFailed' || 
          connectError.message?.includes('authentication') || 
          connectError.message?.includes('Authentication failed')) {
        logger.error({
          error: {
            code: connectError.code,
            codeName: connectError.codeName,
            message: connectError.message,
          },
          connectionOptions: {
            authSource: connectionOptions.authSource,
            url: MONGODB_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
          },
          hints: [
            'Check if username and password are correct',
            'Verify authSource matches the database where the user is defined',
            'Common authSource values: "admin", database name, or the database where user was created',
            'URL format: mongodb://username:password@host:port/database?authSource=admin',
          ],
        }, '❌ MongoDB authentication failed during connection');
        throw connectError;
      }
      throw connectError;
    }
    logger.info('✅ MongoDB connected successfully');
    
    // 验证用户是否有权限访问目标数据库
    // 使用更宽松的验证方式：先尝试 listCollections，如果失败，尝试更简单的操作
    try {
      const dbNameMatch = MONGODB_URL.match(/\/([^?\/]+)(\?|$)/);
      const targetDatabase = dbNameMatch ? dbNameMatch[1] : 'apiadmin';
      const testDb = mongoose.connection.db;
      
      // 首先尝试 listCollections（需要特定权限）
      // 注意：某些 MongoDB 驱动版本可能不支持 limit()，需要先转换为数组
      try {
        try {
          await testDb.listCollections().limit(1).toArray();
          logger.info({
            database: targetDatabase,
            permission: 'verified (full access)',
          }, '✅ Database access permission verified');
        } catch (limitError) {
          // 如果 limit() 不支持，尝试不使用 limit
          const collections = await testDb.listCollections().toArray();
          logger.info({
            database: targetDatabase,
            permission: 'verified (limited access)',
            note: 'listCollections with limit failed, but full listCollections works',
          }, '✅ Database access permission verified (alternative method)');
        }
      } catch (listError) {
        // 如果 listCollections 完全失败，尝试更简单的操作
        // 如果都失败，尝试执行一个简单的 find 操作
        // 这只需要基本的 read 权限
        try {
          const testCollection = testDb.collection('__connection_test__');
          await testCollection.findOne({});
          logger.info({
            database: targetDatabase,
            permission: 'verified (read access)',
            note: 'listCollections failed, but basic read works',
          }, '✅ Database access permission verified (read access confirmed)');
        } catch (readError) {
          // 如果所有操作都失败，检查是否是认证错误
          if (readError.code === 13 || readError.codeName === 'Unauthorized' || 
              readError.message?.includes('requires authentication') ||
              readError.message?.includes('not authorized')) {
            const userMatch = MONGODB_URL.match(/\/\/([^:]+):/);
            const username = userMatch ? userMatch[1] : 'unknown';
            
            logger.error({
              error: {
                code: readError.code,
                codeName: readError.codeName,
                message: readError.message,
              },
              database: targetDatabase,
              username: username,
              authSource: connectionOptions.authSource,
              solution: [
                `The user "${username}" does not have permission to access database "${targetDatabase}"`,
                `Grant permissions:`,
                `  mongosh --host localhost -u "admin" -p "change-me-in-production" --authenticationDatabase "admin"`,
                `  use ${targetDatabase}`,
                `  db.grantRolesToUser("${username}", [{ role: "readWrite", db: "${targetDatabase}" }])`,
              ],
            }, '❌ MongoDB database access permission denied');
            
            logger.warn('⚠️  Application will continue but database operations may fail. Please fix MongoDB permissions.');
          } else {
            // 其他错误，可能是数据库不存在或权限不足，但不一定是认证失败
            logger.warn({
              error: {
                code: readError.code,
                codeName: readError.codeName,
                message: readError.message,
              },
              note: 'Could not verify full database permissions, but connection is established',
            }, '⚠️  Database permission check failed (non-critical)');
          }
        }
      }
    } catch (permError) {
      // 意外的错误，记录但不阻止启动
      logger.warn({
        error: {
          code: permError.code,
          codeName: permError.codeName,
          message: permError.message,
        },
      }, '⚠️  Could not verify database permissions, but connection is established');
    }
    
    // ========== 全面的数据库检测 ==========
    logger.info('🔍 Performing comprehensive MongoDB database check after connection...');
    
    // 1. 提取数据库名称
    const dbNameMatch = MONGODB_URL.match(/\/([^?\/]+)(\?|$)/);
    const requiredDatabase = dbNameMatch ? dbNameMatch[1] : 'apiadmin';
    const currentDatabase = mongoose.connection.name;
    
    logger.info({
      step: '1. Database name',
      required: requiredDatabase,
      current: currentDatabase,
      match: requiredDatabase === currentDatabase,
    }, '📋 Database name check');
    
    // 2. 检查数据库是否存在
    let databaseExists = false;
    try {
      const adminDb = mongoose.connection.db.admin();
      const dbList = await adminDb.listDatabases();
      const dbNames = dbList.databases.map(db => db.name);
      databaseExists = dbNames.includes(requiredDatabase);
      
      logger.info({
        step: '2. Database existence',
        required: requiredDatabase,
        exists: databaseExists,
        allDatabases: dbNames,
      }, databaseExists ? '✅ Database exists' : '⚠️  Database does not exist (will be created on first use)');
    } catch (error) {
      logger.warn({
        step: '2. Database existence',
        error: {
          code: error.code,
          codeName: error.codeName,
          message: error.message,
        },
        note: 'Cannot list databases, database will be created on first use',
      }, '⚠️  Cannot check database existence');
    }
    
    // 3. 检查当前用户权限
    let userInfo = null;
    try {
      const adminDb = mongoose.connection.db.admin();
      const usersInfo = await adminDb.command({ usersInfo: 1 });
      if (usersInfo.users && usersInfo.users.length > 0) {
        userInfo = usersInfo.users[0];
        logger.info({
          step: '3. User information',
          username: userInfo.user,
          roles: userInfo.roles,
        }, '👤 Current user information');
      }
    } catch (error) {
      logger.debug({
        step: '3. User information',
        error: error.message,
      }, 'Cannot retrieve user information (this is normal for some configurations)');
    }
    
    // 4. 测试数据库访问权限
    try {
      const testDb = mongoose.connection.db;
      // 注意：某些 MongoDB 驱动版本可能不支持 limit()，需要先转换为数组
      let collections;
      try {
        collections = await testDb.listCollections().limit(1).toArray();
      } catch (limitError) {
        // 如果 limit() 不支持，尝试不使用 limit
        collections = await testDb.listCollections().toArray();
      }
      logger.info({
        step: '4. Database access',
        canAccess: true,
        collectionsCount: collections.length,
      }, '✅ Database access verified');
    } catch (error) {
      logger.warn({
        step: '4. Database access',
        error: {
          code: error.code,
          codeName: error.codeName,
          message: error.message,
        },
      }, '⚠️  Cannot access database (may need permissions)');
    }
    
    // 输出完整的检测摘要
    logger.info({
      connection: {
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        database: currentDatabase,
      },
      database: {
        required: requiredDatabase,
        exists: databaseExists,
      },
      user: userInfo ? {
        username: userInfo.user,
        roles: userInfo.roles,
      } : null,
    }, '📊 MongoDB connection check summary');
    
    // 清理重复索引（仅在开发环境）
    if (config.NODE_ENV !== 'production') {
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        for (const collection of collections) {
          const coll = mongoose.connection.db.collection(collection.name);
          const indexes = await coll.indexes();
          
          // 检查是否有重复的 project_id 索引
          const projectIdIndexes = indexes.filter(idx => 
            idx.key && idx.key.project_id === 1 && Object.keys(idx.key).length === 1
          );
          
          if (projectIdIndexes.length > 1) {
            logger.warn({
              collection: collection.name,
              duplicateIndexes: projectIdIndexes.length,
            }, 'Found duplicate project_id indexes, consider cleaning up manually');
          }
        }
      } catch (indexErr) {
        // 忽略索引检查错误，不影响启动
        logger.debug({ err: indexErr }, 'Index check failed');
      }
    }
  } catch (err) {
    logger.error({ err }, 'MongoDB connection error');
    process.exit(1);
  }
};

mongoose.connection.on('error', (err) => {
  logger.error({ err }, 'MongoDB connection error');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

process.on('SIGINT', async () => {
  // 停止环境变量文件监听
  if (envLoader) {
    envLoader.stopWatching();
  }
  await mongoose.connection.close();
  logger.info('MongoDB connection closed through app termination');
  process.exit(0);
});

// 全局状态：服务是否就绪
let serviceReady = false;

// 启动服务
async function startServer() {
  try {
    // 执行依赖检测
    logger.info('🔍 Performing dependency checks before starting service...');
    const checkResult = await checkDependencies();
    
    if (!checkResult.criticalReady) {
      logger.error({
        mongodb: {
          status: checkResult.status.mongodb.status,
          message: checkResult.status.mongodb.message,
        },
        redis: {
          status: checkResult.status.redis.status,
          message: checkResult.status.redis.message,
          optional: checkResult.status.redis.optional,
        },
      }, '❌ Critical dependencies are not ready. Service will not start.');
      
      // 尝试等待依赖就绪（带重试）
      logger.info('⏳ Attempting to wait for dependencies to become ready...');
      try {
        await waitForDependencies(10, 5000); // 最多重试10次，每次间隔5秒
        logger.info('✅ Dependencies are now ready after retries');
      } catch (waitError) {
        logger.error({
          error: waitError.message,
        }, '❌ Failed to wait for dependencies. Exiting...');
        process.exit(1);
      }
    }
    
    // 无论依赖检测是否已连接，都调用 connectDB 确保连接选项一致
    // connectDB 会检查连接状态，如果已连接且有效则跳过，否则重新连接
    logger.info('🔌 Establishing MongoDB connection with production options...');
    await connectDB();
    
    // 标记服务就绪
    serviceReady = true;
    
    // 启动 HTTP 服务器
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${config.NODE_ENV} mode`);
      logger.info('✅ Service is ready to handle requests');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// 导出服务就绪状态
export { serviceReady, isReady };

// 启动服务
startServer();

app.on('error', (err, ctx) => {
  logger.error({ err, ctx }, 'Application error');
});

export default app;

