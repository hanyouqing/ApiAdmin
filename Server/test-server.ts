import { MongoMemoryServer } from 'mongodb-memory-server';
import { logger } from './Utils/logger.js';

async function startTestServer() {
  try {
    logger.info('🚀 Starting MongoDB Memory Server...');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    
    logger.info(`✅ MongoDB Memory Server started at: ${uri}`);
    process.env.MONGODB_URL = uri;
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key';
    
    // 动态导入 App.ts，确保它使用我们设置的环境变量
    await import('./App.js');
    
    logger.info('✅ Test Application Server started with in-memory database');
  } catch (error) {
    console.error('Failed to start test server:', error);
    process.exit(1);
  }
}

startTestServer();
