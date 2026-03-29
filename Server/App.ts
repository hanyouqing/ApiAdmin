// 使用环境变量加载器（支持文件监听和自动刷新）
import { initEnvLoader, loadEnvFiles } from './Utils/envLoader.js';
import { fileURLToPath } from 'url';
import path from 'path';

// 获取 __dirname（ES 模块中需要手动获取）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初始化环境变量加载器（在 logger 初始化前）
// 注意：onReload 回调会在 logger 初始化后设置
let envLoader: any;
let loadedFiles: string[] = [];
let varSources = new Map<string, string>();

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
import { pluginManager } from './Utils/pluginManager.js';
import { registerPluginRoutes } from './Utils/pluginRouter.js';
import { pluginHookMiddleware } from './Middleware/pluginHook.js';
import './Models/index.js';

// 现在 logger 已初始化，重新初始化环境变量加载器并启用文件监听
// 同时重新加载配置以确保使用从 .env.local 加载的环境变量
reloadConfig();
envLoader = initEnvLoader({
  watch: process.env.NODE_ENV !== 'production', // 开发环境启用文件监听
  onReload: async (newLoadedFiles: string[]) => {
    // 环境变量重新加载时的回调
    logger.info({
      files: newLoadedFiles,
    }, '✅ Environment variables reloaded');
    
    // 重新加载配置
    const { reloadConfig: reload } = await import('./Utils/config.js');
    reload();
    
    logger.info({
      files: newLoadedFiles,
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
    }, `⚠️  未设置 ${varName}，使用代码默认值（仅限开发环境）`);
  }
});

// 创建 Koa 实例
const app = new Koa();

// 信任代理（用于获取真实 IP）
app.proxy = true;

// 错误处理中间层（最外层）
app.use(errorHandler);

// 依赖检测中间件
// 如果依赖未就绪，业务 API 返回 503 Service Unavailable
app.use(async (ctx, next) => {
  // 排除系统端点（健康检查、版本信息、Swagger）
  const isSystemEndpoint = 
    ctx.path === '/api/health' || 
    ctx.path === '/api/version' || 
    ctx.path === '/version' || 
    ctx.path.startsWith('/swagger') || 
    ctx.path === '/swagger.json';

  if (!isReady() && !isSystemEndpoint) {
    ctx.status = 503;
    ctx.body = {
      success: false,
      message: 'Service is starting, please try again later',
      status: 'starting'
    };
    return;
  }
  await next();
});

// 插件 Hook 中间件（请求前）
app.use(pluginHookMiddleware as any);

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: false, // 如果需要自定义 CSP，请在此配置
}));

// CORS 配置
if (config.CORS_ORIGIN && config.CORS_ORIGIN !== '*') {
  const origins = config.CORS_ORIGIN.split(',').map((origin: string) => origin.trim()).filter((origin: string) => origin.length > 0);
  
  app.use(cors({
    origin: (ctx: Koa.Context) => {
      const requestOrigin = ctx.get('Origin');
      if (origins.includes(requestOrigin)) {
        return requestOrigin;
      }
      // 如果只有一个 Origin，默认使用它
      if (origins.length === 1) {
        return origins[0];
      }
      return ''; // 不允许访问
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-Project-Token'],
  }));
} else {
  // 默认允许所有域名（仅建议开发环境使用）
  app.use(cors({
    origin: '*',
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-Project-Token'],
  }));
}

// 基础中间件
app.use(bodyParser({
  enableTypes: ['json', 'form', 'text'],
  jsonLimit: '10mb',
  formLimit: '10mb',
  textLimit: '10mb',
}));

// 静态资源服务
app.use(serve(path.join(__dirname, '../Static')));
app.use(serve(path.join(__dirname, '../uploads'), { defer: true }));

// Swagger 集成
const swaggerEnabled = config.SWAGGER_ENABLED === true || config.SWAGGER_ENABLED === 'true' || config.SWAGGER_ENABLED === '1';

if (swaggerEnabled) {
  // Swagger 路径白名单检查中间件
  app.use(swaggerWhitelistMiddleware as any);

  // 1. Swagger JSON 端点
  app.use(async (ctx, next) => {
    if (ctx.path === '/swagger.json' || ctx.path === '/api-docs') {
      try {
        const swaggerDefinition = (await import('./Utils/swagger.js')).default;
        ctx.body = swaggerDefinition;
      } catch (err: any) {
        logger.error({ error: err.message }, 'Error generating swagger spec');
        ctx.status = 500;
        ctx.body = { error: 'Internal Server Error' };
      }
      return;
    }
    await next();
  });

  // 2. Swagger UI 静态文件服务
  app.use(async (ctx, next) => {
    if (ctx.path === '/swagger' || ctx.path === '/swagger/') {
      ctx.redirect('/swagger/index.html');
      return;
    }

    if (ctx.path.startsWith('/swagger/')) {
      const fileName = ctx.path.replace('/swagger/', '');
      const filePath = path.join(__dirname, 'node_modules/swagger-ui-dist', fileName);
      
      try {
        const fs = await import('fs/promises');
        const content = await fs.readFile(filePath);
        const ext = path.extname(fileName);
        
        // 设置 Content-Type
        if (ext === '.html') ctx.type = 'text/html';
        else if (ext === '.css') ctx.type = 'text/css';
        else if (ext === '.js') ctx.type = 'application/javascript';
        else if (ext === '.png') ctx.type = 'image/png';
        
        // 如果是 index.html，替换 Swagger JSON URL
        if (fileName === 'index.html') {
          let html = content.toString();
          html = html.replace(
            'url: "https://petstore.swagger.io/v2/swagger.json"',
            'url: "/swagger.json"'
          );
          ctx.body = html;
        } else {
          ctx.body = content;
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          logger.debug({ error: err.message, path: ctx.path }, 'Error serving swagger-ui file');
        }
        await next();
      }
      return;
    }
    await next();
  });
}

// 路由
app.use(router.routes()).use(router.allowedMethods());

// 文件上传静态资源服务（带前缀）
app.use(serve(path.join(__dirname, '../uploads'), { prefix: '/uploads' } as any));

// Swagger 路由
import Router from 'koa-router';
const swaggerRouter = new Router();

swaggerRouter.get('/swagger.json', swaggerWhitelistMiddleware as any, async (ctx) => {
  if (!swaggerEnabled) {
    ctx.status = 404;
    ctx.body = { error: 'Not Found' };
    return;
  }
  const swaggerDefinition = (await import('./Utils/swagger.js')).default;
  ctx.body = swaggerDefinition;
});

const swaggerHtml = `
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

swaggerRouter.get('/swagger', swaggerWhitelistMiddleware as any, async (ctx) => {
  if (!swaggerEnabled) {
    ctx.status = 404;
    ctx.body = { error: 'Not Found' };
    return;
  }
  ctx.body = swaggerHtml;
  ctx.type = 'text/html';
});

swaggerRouter.get('/swagger-ui', swaggerWhitelistMiddleware as any, async (ctx) => {
  if (!swaggerEnabled) {
    ctx.status = 404;
    ctx.body = { error: 'Not Found' };
    return;
  }
  ctx.body = swaggerHtml;
  ctx.type = 'text/html';
});

app.use(swaggerRouter.routes()).use(swaggerRouter.allowedMethods());

if (swaggerEnabled) {
  logger.info('Swagger UI enabled at /swagger and /swagger-ui');
} else {
  logger.info('Swagger UI disabled');
}

// Mock 服务
const { mockServer } = await import('./Middleware/mockServer.js');
app.use(mockServer);

const PORT = config.PORT;
const MONGODB_URL = config.MONGODB_URL;

mongoose.set('strictQuery', false);

const connectDB = async () => {
  try {
    // 如果已经连接，检查连接是否有效
    if (mongoose.connection.readyState === 1) {
      try {
        // 首先执行 ping 测试（最基本的连接验证）
        await (mongoose.connection.db as any).admin().ping();
        
        // 然后尝试简单的数据库操作来验证权限
        let permissionVerified = false;
        try {
          // 尝试使用 listCollections 检查权限
          try {
            await (mongoose.connection.db as any).listCollections().limit(1).toArray();
            permissionVerified = true;
            logger.info('✅ MongoDB connection already established and verified (with collection access)');
          } catch (limitError) {
            // 如果 limit() 不支持，尝试不使用 limit
            await (mongoose.connection.db as any).listCollections().toArray();
            permissionVerified = true;
            logger.info('✅ MongoDB connection already established and verified (with collection access, no limit)');
          }
        } catch (collectionError: any) {
          // 如果 listCollections 失败，尝试更简单的操作
          try {
            // 尝试执行一个简单的 find 操作（只需要基本的 read 权限）
            const testCollection = (mongoose.connection.db as any).collection('users');
            await (testCollection.findOne({}) as any).limit(1);
            permissionVerified = true;
            logger.info('✅ MongoDB connection already established and verified (with read access)');
          } catch (findError: any) {
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
        
        if (permissionVerified) return;
        return;
      } catch (pingError: any) {
        // 如果 ping 失败，说明连接确实有问题，需要重新连接
        logger.warn({
          error: pingError.message,
          code: pingError.code,
          codeName: pingError.codeName,
        }, 'Existing MongoDB connection failed verification, reconnecting...');
        try {
          await mongoose.disconnect();
        } catch (disconnectError: any) {
          // 忽略断开连接的错误
          logger.debug({ error: disconnectError.message }, 'Error disconnecting MongoDB');
        }
      }
    }

    const connectionOptions: any = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };
    
    // 如果 MongoDB URL 中包含认证信息，从 URL 中提取 authSource
    const authSourceMatch = MONGODB_URL.match(/[?&]authSource=([^&]+)/);
    if (authSourceMatch) {
      connectionOptions.authSource = authSourceMatch[1];
      logger.debug({
        authSource: authSourceMatch[1],
        source: 'URL parameter',
      }, 'MongoDB authSource extracted from URL');
    } else if (MONGODB_URL.includes('@')) {
      const userMatch = MONGODB_URL.match(/\/\/([^:]+):/);
      if (userMatch) {
        const username = userMatch[1];
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
    } catch (connectError: any) {
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
    try {
      const dbNameMatch = MONGODB_URL.match(/\/([^?\/]+)(\?|$)/);
      const targetDatabase = dbNameMatch ? dbNameMatch[1] : 'apiadmin';
      const testDb = mongoose.connection.db;
      
      try {
        try {
          await (testDb as any).listCollections().limit(1).toArray();
          logger.info({
            database: targetDatabase,
            permission: 'verified (full access)',
          }, '✅ Database access permission verified');
        } catch (limitError) {
          await (testDb as any).listCollections().toArray();
          logger.info({
            database: targetDatabase,
            permission: 'verified (limited access)',
            note: 'listCollections with limit failed, but full listCollections works',
          }, '✅ Database access permission verified (alternative method)');
        }
      } catch (listError: any) {
        try {
          const testCollection = (testDb as any).collection('__connection_test__');
          await testCollection.findOne({});
          logger.info({
            database: targetDatabase,
            permission: 'verified (read access)',
            note: 'listCollections failed, but basic read works',
          }, '✅ Database access permission verified (read access confirmed)');
        } catch (readError: any) {
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
            }, '❌ MongoDB database access permission denied');
            
            logger.warn('⚠️  Application will continue but database operations may fail. Please fix MongoDB permissions.');
          } else {
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
    } catch (permError: any) {
      logger.warn({
        error: {
          code: permError.code,
          codeName: permError.codeName,
          message: permError.message,
        },
      }, '⚠️  Could not verify database permissions, but connection is established');
    }
    
    logger.info('🔍 Performing comprehensive MongoDB database check after connection...');
    
    const dbNameMatch = MONGODB_URL.match(/\/([^?\/]+)(\?|$)/);
    const requiredDatabase = dbNameMatch ? dbNameMatch[1] : 'apiadmin';
    const currentDatabase = mongoose.connection.name;
    
    logger.info({
      step: '1. Database name',
      required: requiredDatabase,
      current: currentDatabase,
      match: requiredDatabase === currentDatabase,
    }, '📋 Database name check');
    
    try {
      const adminDb = (mongoose.connection.db as any).admin();
      const dbList = await adminDb.listDatabases();
      const dbNames = dbList.databases.map((db: any) => db.name);
      const databaseExists = dbNames.includes(requiredDatabase);
      
      logger.info({
        step: '2. Database existence',
        required: requiredDatabase,
        exists: databaseExists,
        allDatabases: dbNames,
      }, databaseExists ? '✅ Database exists' : '⚠️  Database does not exist (will be created on first use)');
    } catch (error: any) {
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
    
    try {
      const testDb = mongoose.connection.db;
      let collections;
      try {
        collections = await (testDb as any).listCollections().limit(1).toArray();
      } catch (limitError) {
        collections = await (testDb as any).listCollections().toArray();
      }
      logger.info({
        step: '4. Database access',
        canAccess: true,
        collectionsCount: collections.length,
      }, '✅ Database access verified');
    } catch (error: any) {
      logger.warn({
        step: '4. Database access',
        error: {
          code: error.code,
          codeName: error.codeName,
          message: error.message,
        },
      }, '⚠️  Cannot access database (may need permissions)');
    }
    
    if (config.NODE_ENV !== 'production') {
      try {
        const collections = await (mongoose.connection.db as any).listCollections().toArray();
        for (const collection of collections) {
          const coll = (mongoose.connection.db as any).collection(collection.name);
          const indexes = await coll.indexes();
          const projectIdIndexes = indexes.filter((idx: any) => 
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
        logger.debug({ err: indexErr }, 'Index check failed');
      }
    }
  } catch (err: any) {
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
  if (envLoader) {
    envLoader.stopWatching();
  }
  await mongoose.connection.close();
  logger.info('MongoDB connection closed through app termination');
  process.exit(0);
});

let serviceReady = false;

async function startServer() {
  try {
    logger.info('🔍 Performing dependency checks before starting service...');
    const checkResult: any = await checkDependencies();
    
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
      
      logger.info('⏳ Attempting to wait for dependencies to become ready...');
      try {
        await waitForDependencies(10, 5000);
        logger.info('✅ Dependencies are now ready after retries');
      } catch (waitError: any) {
        logger.error({
          error: waitError.message,
        }, '❌ Failed to wait for dependencies. Exiting...');
        process.exit(1);
      }
    }
    
    logger.info('🔌 Establishing MongoDB connection with production options...');
    await connectDB();
    
    logger.info('🔌 Initializing plugin system...');
    await pluginManager.init();
    
    logger.info('🔌 Registering plugin routes...');
    await registerPluginRoutes(router);
    
    logger.info('⏰ Starting task scheduler...');
    const scheduler = (await import('./Utils/scheduler.js')).default;
    await (scheduler as any).startAllTasks();
    
    serviceReady = true;
    
    const PORT_NUM = typeof PORT === 'string' ? parseInt(PORT, 10) : (PORT as number);
    app.listen(PORT_NUM, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${PORT_NUM} in ${config.NODE_ENV} mode`);
      logger.info(`🌐 Server listening on http://0.0.0.0:${PORT_NUM} (accessible via http://localhost:${PORT_NUM})`);
      logger.info('✅ Service is ready to handle requests');
    });
  } catch (error: any) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

export { serviceReady, isReady };

startServer();

app.on('error', (err, ctx) => {
  logger.error({ err, ctx }, 'Application error');
});

export default app;
