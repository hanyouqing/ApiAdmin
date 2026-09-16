import mongoose from 'mongoose';
import Redis from 'ioredis';
import { logger } from './logger.js';
import config from './config.js';

/**
 * 依赖检测结果状态
 */
export const DependencyStatus = {
  PENDING: 'pending',
  CHECKING: 'checking',
  READY: 'ready',
  FAILED: 'failed',
};

/**
 * 依赖检测结果
 */
let dependencyStatus = {
  mongodb: {
    status: DependencyStatus.PENDING,
    message: '',
    error: null,
    checked: false,
  },
  redis: {
    status: DependencyStatus.PENDING,
    message: '',
    error: null,
    checked: false,
    optional: process.env.NODE_ENV !== 'production' || process.env.REQUIRE_REDIS === 'false',
  },
};

/**
 * 检测 MongoDB 连接
 */
async function checkMongoDB() {
  const result = {
    status: DependencyStatus.CHECKING,
    message: '',
    error: null,
    checked: true,
  };

  try {
    const MONGODB_URL = config.MONGODB_URL;
    
    if (!MONGODB_URL) {
      result.status = DependencyStatus.FAILED;
      result.error = new Error('MONGODB_URL is not configured');
      result.message = 'MongoDB URL is not configured, please set MONGODB_URL in environment variables';
      logger.error({
        dependency: 'MongoDB',
        reason: 'MONGODB_URL not configured',
        hint: 'Please set MONGODB_URL environment variable',
        example: 'mongodb://username:password@localhost:27017/apiadmin?authSource=admin',
      }, '❌ MongoDB dependency check failed');
      return result;
    }

    // 检查是否已经连接
    if (mongoose.connection.readyState === 1) {
      // 执行一个简单的查询来验证连接
      try {
        await mongoose.connection.db.admin().ping();
        result.status = DependencyStatus.READY;
        result.message = 'MongoDB connection is ready';
        logger.info({
          dependency: 'MongoDB',
          url: MONGODB_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
          database: mongoose.connection.name,
        }, '✅ MongoDB dependency check passed (already connected)');
        return result;
      } catch (pingError) {
        // 如果 ping 失败，说明连接可能有问题，需要重新连接
        logger.warn({
          error: pingError.message,
        }, 'MongoDB connection exists but ping failed, will attempt to reconnect');
        // 继续执行连接逻辑
      }
    }

    // 如果已经连接但 ping 失败，或者正在连接，先断开
    if (mongoose.connection.readyState !== 0) {
      try {
        await mongoose.disconnect();
        logger.debug('Disconnected existing MongoDB connection for health check');
      } catch (disconnectError) {
        // 忽略断开连接的错误
        logger.debug({ error: disconnectError.message }, 'Error disconnecting MongoDB');
      }
    }

    // 尝试连接（使用与正式连接相同的选项，但更短的超时）
    const connectionOptions = {
      maxPoolSize: 1, // 检测时只使用一个连接
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    };

    // 处理 authSource（与 connectDB 保持一致）
    const authSourceMatch = MONGODB_URL.match(/[?&]authSource=([^&]+)/);
    if (authSourceMatch) {
      connectionOptions.authSource = authSourceMatch[1];
    } else if (MONGODB_URL.includes('@')) {
      // 如果 URL 中包含 @（表示有用户名密码），但没有指定 authSource，默认使用 admin
      connectionOptions.authSource = 'admin';
    }

    await mongoose.connect(MONGODB_URL, connectionOptions);
    
    // 等待连接完全就绪
    if (mongoose.connection.readyState !== 1) {
      // 等待连接状态变为 ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('MongoDB connection did not become ready in time'));
        }, 5000);

        const checkReady = () => {
          if (mongoose.connection.readyState === 1) {
            clearTimeout(timeout);
            mongoose.connection.removeListener('error', onError);
            resolve();
          }
        };

        const onError = (err) => {
          clearTimeout(timeout);
          mongoose.connection.removeListener('connected', checkReady);
          reject(err);
        };

        mongoose.connection.once('connected', checkReady);
        mongoose.connection.once('error', onError);
      });
    }
    
    // 执行 ping 测试（带重试）
    let pingSuccess = false;
    for (let i = 0; i < 3; i++) {
      try {
        await mongoose.connection.db.admin().ping();
        pingSuccess = true;
        break;
      } catch (pingError) {
        if (i === 2) {
          throw pingError;
        }
        // 等待一小段时间后重试
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!pingSuccess) {
      throw new Error('MongoDB ping test failed after retries');
    }
    
    // 不仅 ping 成功，还要测试实际的数据库查询权限
    // 这可以确保认证信息正确，而不仅仅是连接成功
    // 使用更宽松的验证方式：先尝试 listCollections，如果失败，尝试更简单的操作
    let permissionVerified = false;
    
    try {
      // 尝试列出集合，这需要认证权限
      // 注意：某些 MongoDB 驱动版本可能不支持 limit()，需要先转换为数组
      try {
        await mongoose.connection.db.listCollections().limit(1).toArray();
        permissionVerified = true;
      } catch (limitError) {
        // 如果 limit() 不支持，尝试不使用 limit
        try {
          await mongoose.connection.db.listCollections().toArray();
          permissionVerified = true;
        } catch (listError) {
          throw listError; // 如果都失败，抛出错误
        }
      }
    } catch (queryError) {
      // 如果 listCollections 失败，尝试更简单的操作
      try {
        // 尝试执行一个简单的 find 操作（只需要基本的 read 权限）
        const testCollection = mongoose.connection.db.collection('users');
        await testCollection.findOne({}).limit(1);
        permissionVerified = true;
        logger.debug('MongoDB permission verified via find operation');
      } catch (findError) {
        // 如果 find 也失败，检查是否是认证错误
        if (findError.code === 13 || findError.codeName === 'Unauthorized' ||
            queryError.code === 13 || queryError.codeName === 'Unauthorized') {
          // 这是认证错误（用户不存在或密码错误）
          logger.error({
            error: {
              code: findError.code || queryError.code,
              codeName: findError.codeName || queryError.codeName,
              message: findError.message || queryError.message,
            },
            hint: 'This usually means the username/password is incorrect or authSource is wrong',
          }, 'MongoDB authentication failed during dependency check');
          throw new Error('MongoDB authentication failed: please check username, password, and authSource');
        } else if (findError.code === 8000 || findError.message?.includes('not authorized') ||
                   queryError.code === 8000 || queryError.message?.includes('not authorized')) {
          // 这是权限错误（用户存在但权限不足），连接本身是有效的
          logger.warn({
            error: {
              code: findError.code || queryError.code,
              codeName: findError.codeName || queryError.codeName,
              message: findError.message || queryError.message,
            },
            note: 'Connection is valid but user may have limited permissions',
          }, 'MongoDB connection verified but permissions may be limited');
          // 不抛出错误，因为连接本身是有效的
        } else {
          // 其他错误（如集合不存在），不抛出，因为连接是有效的
          logger.debug({
            error: {
              code: findError.code || queryError.code,
              codeName: findError.codeName || queryError.codeName,
              message: findError.message || queryError.message,
            },
            note: 'Permission check failed but connection is valid (may be collection not exists)',
          }, 'MongoDB connection verified (permission check inconclusive)');
        }
      }
    }
    
    if (permissionVerified) {
      logger.debug('MongoDB permission fully verified');
    }
    
    // ========== 全面的数据库检测 ==========
    logger.info('🔍 Starting comprehensive MongoDB database check...');
    
    // 1. 提取数据库名称
    const dbNameMatch = MONGODB_URL.match(/\/([^?\/]+)(\?|$)/);
    const requiredDatabase = dbNameMatch ? dbNameMatch[1] : 'apiadmin';
    const currentDatabase = mongoose.connection.name;
    
    logger.info({
      step: '1. Database name extraction',
      requiredDatabase,
      currentDatabase,
      url: MONGODB_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
    }, '📋 Database name extracted from connection URL');
    
    // 2. 检查数据库是否存在
    let databaseExists = false;
    let databaseCheckError = null;
    try {
      const adminDb = mongoose.connection.db.admin();
      const dbList = await adminDb.listDatabases();
      const dbNames = dbList.databases.map(db => db.name);
      databaseExists = dbNames.includes(requiredDatabase);
      
      logger.info({
        step: '2. Database existence check',
        requiredDatabase,
        exists: databaseExists,
        allDatabases: dbNames,
      }, databaseExists ? '✅ Required database exists' : '⚠️  Required database does not exist');
    } catch (error) {
      databaseCheckError = error;
      logger.warn({
        step: '2. Database existence check',
        error: {
          code: error.code,
          codeName: error.codeName,
          message: error.message,
        },
        note: 'Cannot list databases, will check permissions instead',
      }, '⚠️  Cannot check database existence (may require permissions)');
    }
    
    // 3. 检查当前用户权限（是否可以创建数据库）
    let canCreateDatabase = false;
    let userInfo = null;
    let permissionCheckError = null;
    
    try {
      // 获取当前用户信息
      const adminDb = mongoose.connection.db.admin();
      
      // 尝试获取当前用户（需要权限）
      try {
        const usersInfo = await adminDb.command({ usersInfo: 1 });
        if (usersInfo.users && usersInfo.users.length > 0) {
          userInfo = usersInfo.users[0];
          logger.info({
            step: '3. User information',
            username: userInfo.user,
            roles: userInfo.roles,
          }, '👤 Current user information retrieved');
        }
      } catch (userInfoError) {
        // 如果无法获取用户信息，尝试其他方法
        logger.debug({
          error: userInfoError.message,
        }, 'Cannot retrieve user information, trying alternative method');
      }
      
      // 检查是否可以创建数据库（通过尝试创建一个临时集合）
      if (!databaseExists) {
        try {
          const testDb = mongoose.connection.client.db(requiredDatabase);
          // 尝试创建一个临时集合来测试权限
          await testDb.createCollection('__permission_test__', { capped: false });
          // 如果成功，删除测试集合
          await testDb.collection('__permission_test__').drop();
          canCreateDatabase = true;
          
          logger.info({
            step: '3. Database creation permission',
            requiredDatabase,
            canCreate: true,
          }, '✅ User has permission to create database');
        } catch (createError) {
          canCreateDatabase = false;
          permissionCheckError = createError;
          
          logger.warn({
            step: '3. Database creation permission',
            requiredDatabase,
            canCreate: false,
            error: {
              code: createError.code,
              codeName: createError.codeName,
              message: createError.message,
            },
          }, '❌ User does not have permission to create database');
        }
      } else {
        // 数据库已存在，检查是否有读写权限
        try {
          const testDb = mongoose.connection.db;
          
          // 尝试使用 listCollections 检查权限
          // 注意：某些 MongoDB 驱动版本可能不支持 limit()，需要先转换为数组
          let hasAccess = false;
          try {
            // 方法1：尝试使用 limit()（如果支持）
            const collections = await testDb.listCollections().limit(1).toArray();
            hasAccess = true;
          } catch (limitError) {
            // 如果 limit() 不支持，尝试不使用 limit
            try {
              const collections = await testDb.listCollections().toArray();
              hasAccess = true;
            } catch (listError) {
              // 如果 listCollections 完全失败，尝试简单的 find 操作
              try {
                const testCollection = testDb.collection('users');
                await testCollection.findOne({}).limit(1);
                hasAccess = true;
              } catch (findError) {
                throw findError; // 所有方法都失败，抛出最后一个错误
              }
            }
          }
          
          if (hasAccess) {
            canCreateDatabase = true;
            logger.info({
              step: '3. Database access permission',
              requiredDatabase,
              hasAccess: true,
            }, '✅ User has access to database');
          }
        } catch (accessError) {
          canCreateDatabase = false;
          permissionCheckError = accessError;
          
          logger.warn({
            step: '3. Database access permission',
            requiredDatabase,
            hasAccess: false,
            error: {
              code: accessError.code,
              codeName: accessError.codeName,
              message: accessError.message,
            },
          }, '❌ User does not have access to database');
        }
      }
    } catch (error) {
      permissionCheckError = error;
      logger.warn({
        step: '3. Permission check',
        error: {
          code: error.code,
          codeName: error.codeName,
          message: error.message,
        },
      }, '⚠️  Cannot check user permissions');
    }
    
    // 4. 输出详细的检测报告
    const checkReport = {
      connection: {
        status: 'success',
        url: MONGODB_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        database: currentDatabase,
      },
      database: {
        required: requiredDatabase,
        current: currentDatabase,
        exists: databaseExists,
        checkError: databaseCheckError ? {
          code: databaseCheckError.code,
          codeName: databaseCheckError.codeName,
          message: databaseCheckError.message,
        } : null,
      },
      permissions: {
        canCreateDatabase,
        userInfo: userInfo ? {
          username: userInfo.user,
          roles: userInfo.roles,
        } : null,
        checkError: permissionCheckError ? {
          code: permissionCheckError.code,
          codeName: permissionCheckError.codeName,
          message: permissionCheckError.message,
        } : null,
      },
      recommendations: [],
    };
    
    // 生成建议
    if (!databaseExists && !canCreateDatabase) {
      checkReport.recommendations.push({
        priority: 'high',
        issue: 'Database does not exist and user cannot create it',
        solution: `Please create the database "${requiredDatabase}" manually or grant the user permission to create databases`,
        commands: [
          `mongosh -u admin -p password --authenticationDatabase admin`,
          `use ${requiredDatabase}`,
          `db.createUser({ user: "apiadmin", pwd: "password", roles: [{ role: "readWrite", db: "${requiredDatabase}" }] })`,
        ],
      });
    } else if (!databaseExists && canCreateDatabase) {
      checkReport.recommendations.push({
        priority: 'info',
        issue: 'Database does not exist but will be created automatically',
        solution: 'The database will be created automatically when first used',
      });
    }
    
    if (permissionCheckError && (permissionCheckError.code === 13 || permissionCheckError.codeName === 'Unauthorized')) {
      checkReport.recommendations.push({
        priority: 'high',
        issue: 'Insufficient permissions',
        solution: 'Please grant the user readWrite permission on the database',
        commands: [
          `mongosh -u admin -p password --authenticationDatabase admin`,
          `use ${requiredDatabase}`,
          `db.grantRolesToUser("${userInfo?.user || 'username'}", [{ role: "readWrite", db: "${requiredDatabase}" }])`,
        ],
      });
    }
    
    // 输出完整的检测报告
    logger.info({
      checkReport,
    }, '📊 MongoDB comprehensive check completed');
    
    // 如果数据库不存在且无法创建，记录警告但不阻止启动（数据库会在首次使用时创建）
    if (!databaseExists && !canCreateDatabase) {
      logger.warn({
        requiredDatabase,
        canCreateDatabase,
        recommendation: 'Database will be created automatically on first use, or create it manually',
      }, '⚠️  Database does not exist and user may not have permission to create it');
    }
    
    result.status = DependencyStatus.READY;
    result.message = 'MongoDB connection is ready';
    result.details = {
      database: {
        required: requiredDatabase,
        exists: databaseExists,
        canCreate: canCreateDatabase,
      },
      user: userInfo ? {
        username: userInfo.user,
        roles: userInfo.roles,
      } : null,
    };
    
    logger.info({
      dependency: 'MongoDB',
      url: MONGODB_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
      database: currentDatabase,
      databaseExists,
      canCreateDatabase,
    }, '✅ MongoDB dependency check passed');
    
    // 注意：检测后不断开连接，让后续的 connectDB 复用这个连接
    // connectDB 会检查连接状态，如果已连接且有效则跳过，否则重新连接
    
    return result;
  } catch (error) {
    result.status = DependencyStatus.FAILED;
    result.error = error;
    
    // 根据错误类型提供详细的错误信息
    if (error.code === 13 || error.codeName === 'Unauthorized') {
      result.message = 'MongoDB authentication failed: please check username and password';
      logger.error({
        dependency: 'MongoDB',
        error: {
          code: error.code,
          codeName: error.codeName,
          message: error.message,
        },
        reason: 'Authentication failed',
        hint: 'Please check username and password in MONGODB_URL',
        format: 'mongodb://username:password@host:port/database?authSource=admin',
        example: 'mongodb://admin:password@localhost:27017/apiadmin?authSource=admin',
      }, '❌ MongoDB dependency check failed');
    } else if (error.name === 'MongoServerSelectionError' || error.message?.includes('ECONNREFUSED')) {
      result.message = 'MongoDB connection refused: please check if MongoDB service is running and connection address/port is correct';
      logger.error({
        dependency: 'MongoDB',
        error: {
          name: error.name,
          message: error.message,
        },
        reason: 'Connection refused',
        hint: 'Please check if MongoDB service is running and the connection URL is correct',
        commonCauses: [
          'MongoDB service is not started',
          'Incorrect host or port in MONGODB_URL',
          'Firewall blocking the connection',
        ],
      }, '❌ MongoDB dependency check failed');
    } else if (error.message?.includes('timeout')) {
      result.message = 'MongoDB connection timeout: please check network connectivity and MongoDB service status';
      logger.error({
        dependency: 'MongoDB',
        error: {
          message: error.message,
        },
        reason: 'Connection timeout',
        hint: 'Please check network connectivity and MongoDB service status',
      }, '❌ MongoDB dependency check failed');
    } else {
      result.message = `MongoDB connection failed: ${error.message || 'Unknown error'}`;
      logger.error({
        dependency: 'MongoDB',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        reason: 'Connection failed',
      }, '❌ MongoDB dependency check failed');
    }
    
    return result;
  }
}

/**
 * 检测 Redis 连接（可选）
 * 即使未配置 REDIS_URL，也会尝试检测默认地址，并给出明确结果
 */
async function checkRedis() {
  const result = {
    status: DependencyStatus.CHECKING,
    message: '',
    error: null,
    checked: true,
    optional: true, // Redis 是可选的，失败不影响服务启动
  };

  const REDIS_URL = config.REDIS_URL;
  
  // 检查是否配置了 REDIS_URL（排除 null、undefined 和空字符串）
  const isConfigured = REDIS_URL && REDIS_URL.trim() !== '';
  
  // 如果未配置 REDIS_URL，尝试使用默认地址进行检测
  const testUrl = isConfigured ? REDIS_URL : 'redis://localhost:6379';
  
  // 添加调试日志（仅在开发环境）
  if (process.env.NODE_ENV !== 'production') {
    logger.debug({
      redisUrl: REDIS_URL ? REDIS_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 'null',
      isConfigured,
      testUrl: testUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
    }, 'Redis dependency check: configuration status');
  }

  // 记录检测开始
  logger.debug({
    testUrl: testUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
    isConfigured,
  }, 'Starting Redis connection test...');

  try {
    const redis = new Redis(testUrl, {
      connectTimeout: 5000,
      commandTimeout: 5000,
      retryStrategy: () => null, // 检测时不重试
      lazyConnect: true, // 延迟连接，手动控制连接时机
      maxRetriesPerRequest: 1, // 每个请求最多重试1次
      enableReadyCheck: true, // 启用就绪检查
      enableOfflineQueue: false, // 禁用离线队列，连接失败时立即失败
    });

    // 等待连接建立或失败
    await new Promise((resolve, reject) => {
      let resolved = false;
      let timeoutId = null;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        // 移除所有事件监听器，避免内存泄漏
        redis.removeAllListeners('ready');
        redis.removeAllListeners('error');
        redis.removeAllListeners('end');
        redis.removeAllListeners('close');
        redis.removeAllListeners('connect');
      };

      const onReady = () => {
        if (resolved) return;
        if (process.env.NODE_ENV !== 'production') {
          logger.debug('Redis ready event fired');
        }
        resolved = true;
        cleanup();
        resolve();
      };

      const onError = (err) => {
        if (resolved) return;
        if (process.env.NODE_ENV !== 'production') {
          logger.debug({
            error: err.message,
            code: err.code,
            status: redis.status,
          }, 'Redis error event fired');
        }
        resolved = true;
        cleanup();
        redis.disconnect();
        reject(err);
      };

      const onEnd = () => {
        if (resolved) return;
        if (process.env.NODE_ENV !== 'production') {
          logger.debug('Redis end event fired');
        }
        resolved = true;
        cleanup();
        reject(new Error('Redis connection ended'));
      };

      // 设置超时
      timeoutId = setTimeout(() => {
        if (!resolved) {
          if (process.env.NODE_ENV !== 'production') {
            logger.debug({
              status: redis.status,
              testUrl: testUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
            }, 'Redis connection timeout');
          }
          resolved = true;
          cleanup();
          redis.disconnect();
          reject(new Error('Redis connection timeout'));
        }
      }, 5000);

      // 监听事件（使用 on 而不是 once，确保能捕获所有事件）
      redis.on('ready', onReady);
      redis.on('error', onError);
      redis.on('end', onEnd);

      // 开始连接
      if (process.env.NODE_ENV !== 'production') {
        logger.debug({
          status: redis.status,
          testUrl: testUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
        }, 'Attempting Redis connection...');
      }
      
      redis.connect().catch((err) => {
        // 如果 connect() 直接抛出错误，处理它
        if (!resolved) {
          if (process.env.NODE_ENV !== 'production') {
            logger.debug({
              error: err.message,
              code: err.code,
              status: redis.status,
            }, 'Redis connect() promise rejected');
          }
          onError(err);
        }
      });
    });

    // 执行 PING 测试（带超时和重试）
    let pong = null;
    let pingSuccess = false;
    
    if (process.env.NODE_ENV !== 'production') {
      logger.debug({
        status: redis.status,
      }, 'Starting Redis PING test...');
    }
    
    for (let i = 0; i < 3; i++) {
      try {
        if (process.env.NODE_ENV !== 'production' && i > 0) {
          logger.debug({
            attempt: i + 1,
            maxAttempts: 3,
          }, 'Retrying Redis PING...');
        }
        
        pong = await Promise.race([
          redis.ping(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis PING timeout')), 3000)
          ),
        ]);
        
        if (pong === 'PONG') {
          pingSuccess = true;
          if (process.env.NODE_ENV !== 'production') {
            logger.debug('Redis PING successful');
          }
          break;
        }
      } catch (pingError) {
        if (process.env.NODE_ENV !== 'production') {
          logger.debug({
            attempt: i + 1,
            error: pingError.message,
            status: redis.status,
          }, 'Redis PING failed');
        }
        if (i === 2) {
          // 最后一次重试失败，抛出错误
          throw pingError;
        }
        // 等待一小段时间后重试
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (!pingSuccess || pong !== 'PONG') {
      throw new Error('Redis PING test failed');
    }

    redis.disconnect();

    if (isConfigured) {
      result.status = DependencyStatus.READY;
      result.message = 'Redis connection is ready (configured)';
      logger.info({
        dependency: 'Redis',
        url: REDIS_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
        optional: true,
      }, '✅ Redis dependency check passed (configured)');
    } else {
      result.status = DependencyStatus.READY;
      result.message = 'Redis connection is ready (REDIS_URL not configured, default address tested but will use memory store)';
      logger.info({
        dependency: 'Redis',
        testedUrl: 'redis://localhost:6379',
        note: 'REDIS_URL not configured, but default Redis is available. Will use memory store unless REDIS_URL is set.',
        optional: true,
      }, '✅ Redis dependency check passed (default, optional)');
    }
    
    return result;
  } catch (error) {
    result.status = DependencyStatus.FAILED;
    result.error = error;
    
    // 记录详细的错误信息（开发环境）
    if (process.env.NODE_ENV !== 'production') {
      logger.debug({
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
          address: error.address,
          port: error.port,
          stack: error.stack,
        },
        testUrl: testUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
        isConfigured,
        redisStatus: 'unknown', // 无法获取，因为连接已断开
      }, 'Redis connection test failed');
    }
    
    if (!isConfigured) {
      // 未配置且连接失败，这是正常的（可选项）
      result.message = 'Redis not configured and default address unavailable (optional, will use memory store)';
      logger.info({
        dependency: 'Redis',
        reason: 'REDIS_URL not configured and default Redis not available',
        testedUrl: 'redis://localhost:6379',
        hint: 'Redis is optional. If not configured, rate limiting will use memory store. To use Redis, set REDIS_URL environment variable.',
        optional: true,
      }, 'ℹ️  Redis dependency check: not configured (optional, will use memory store)');
    } else if (error.message?.includes('ECONNREFUSED')) {
      result.message = 'Redis connection refused: please check if Redis service is running and connection address/port is correct (optional, service will continue)';
      logger.warn({
        dependency: 'Redis',
        error: {
          message: error.message,
        },
        reason: 'Connection refused',
        hint: 'Please check if Redis service is running and the connection URL is correct',
        commonCauses: [
          'Redis service is not started',
          'Incorrect host or port in REDIS_URL',
          'Firewall blocking the connection',
        ],
        optional: true,
        impact: 'Service will continue with memory store for rate limiting',
      }, '⚠️  Redis dependency check failed (optional, service will continue)');
    } else if (error.message?.includes('timeout')) {
      result.message = 'Redis connection timeout: please check network connectivity and Redis service status (optional, service will continue)';
      logger.warn({
        dependency: 'Redis',
        error: {
          message: error.message,
        },
        reason: 'Connection timeout',
        hint: 'Please check network connectivity and Redis service status',
        optional: true,
        impact: 'Service will continue with memory store for rate limiting',
      }, '⚠️  Redis dependency check failed (optional, service will continue)');
    } else if (error.message?.includes('NOAUTH') || error.message?.includes('password')) {
      result.message = 'Redis authentication failed: please check password (optional, service will continue)';
      logger.warn({
        dependency: 'Redis',
        error: {
          message: error.message,
        },
        reason: 'Authentication failed',
        hint: 'Please check password in REDIS_URL',
        format: 'redis://:password@host:port',
        example: 'redis://:password@localhost:6379',
        optional: true,
        impact: 'Service will continue with memory store for rate limiting',
      }, '⚠️  Redis dependency check failed (optional, service will continue)');
    } else {
      result.message = `Redis connection failed: ${error.message || 'Unknown error'} (optional, service will continue)`;
      logger.warn({
        dependency: 'Redis',
        error: {
          message: error.message,
        },
        reason: 'Connection failed',
        optional: true,
        impact: 'Service will continue with memory store for rate limiting',
      }, '⚠️  Redis dependency check failed (optional, service will continue)');
    }
    
    return result;
  }
}

/**
 * 执行所有依赖检测
 */
export async function checkDependencies() {
  logger.info('🔍 Starting dependency checks...');
  
  dependencyStatus.mongodb = await checkMongoDB();
  dependencyStatus.redis = await checkRedis();
  
  // 关键依赖（MongoDB）必须就绪
  const criticalReady = dependencyStatus.mongodb.status === DependencyStatus.READY;
  
  // 所有依赖就绪（可选项失败也算就绪，因为不影响服务）
  const allReady = criticalReady && (
    dependencyStatus.redis.status === DependencyStatus.READY || 
    (dependencyStatus.redis.optional && dependencyStatus.redis.status === DependencyStatus.FAILED)
  );
  
  if (criticalReady) {
    if (dependencyStatus.redis.status === DependencyStatus.READY) {
      logger.info({
        mongodb: {
          status: dependencyStatus.mongodb.status,
          message: dependencyStatus.mongodb.message,
        },
        redis: {
          status: dependencyStatus.redis.status,
          message: dependencyStatus.redis.message,
          optional: dependencyStatus.redis.optional,
        },
      }, '✅ All dependencies are ready');
    } else {
      logger.info({
        mongodb: {
          status: dependencyStatus.mongodb.status,
          message: dependencyStatus.mongodb.message,
        },
        redis: {
          status: dependencyStatus.redis.status,
          message: dependencyStatus.redis.message,
          optional: dependencyStatus.redis.optional,
          note: 'Redis is optional, service will continue with memory store',
        },
      }, '✅ Critical dependencies are ready (Redis optional, will use memory store)');
    }
  } else {
    logger.error({
      mongodb: {
        status: dependencyStatus.mongodb.status,
        message: dependencyStatus.mongodb.message,
      },
      redis: {
        status: dependencyStatus.redis.status,
        message: dependencyStatus.redis.message,
        optional: dependencyStatus.redis.optional,
      },
    }, '❌ Critical dependencies are not ready');
  }
  
  return {
    allReady,
    criticalReady,
    status: dependencyStatus,
  };
}

/**
 * 获取依赖状态
 */
export function getDependencyStatus() {
  return { ...dependencyStatus };
}

/**
 * 检查是否所有关键依赖都已就绪
 */
export function isReady() {
  const mongoOk = dependencyStatus.mongodb.status === DependencyStatus.READY;
  const redisRequired =
    process.env.NODE_ENV === 'production' && process.env.REQUIRE_REDIS !== 'false';
  if (!redisRequired) {
    return mongoOk;
  }
  return mongoOk && dependencyStatus.redis.status === DependencyStatus.READY;
}

/**
 * 等待依赖就绪（带重试）
 */
export async function waitForDependencies(maxRetries = 10, retryInterval = 5000) {
  let retries = 0;
  
  while (retries < maxRetries) {
    const result = await checkDependencies();
    
    if (result.criticalReady) {
      return result;
    }
    
    retries++;
    if (retries < maxRetries) {
      logger.warn({
        retry: retries,
        maxRetries,
        nextRetryIn: `${retryInterval / 1000}s`,
      }, 'Dependencies not ready, retrying...');
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }
  }
  
  throw new Error('Dependencies failed to become ready after maximum retries');
}

