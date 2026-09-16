import mongoose from 'mongoose';
import { beforeAll, afterAll } from 'vitest';

mongoose.set('strictQuery', false);
mongoose.set('bufferTimeoutMS', 60000);
mongoose.set('bufferCommands', true);

let mongoServer = null;

function shouldUseMemoryMongo() {
  if (process.env.USE_EXTERNAL_MONGO === 'true') {
    return false;
  }
  if (process.env.USE_MEMORY_MONGO === 'true') {
    return true;
  }
  // Default for unit tests: in-memory unless an explicit non-localhost URI is provided
  const url = process.env.MONGODB_URL || process.env.TEST_MONGODB_URL || '';
  if (!url) {
    return true;
  }
  try {
    const host = new URL(url).hostname;
    return host === '127.0.0.1' || host === 'localhost';
  } catch {
    return true;
  }
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'test-jwt-secret-key-at-least-32-chars';
  process.env.ALLOW_MOCK_SCRIPTS = process.env.ALLOW_MOCK_SCRIPTS || 'true';

  if (shouldUseMemoryMongo()) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri('apiadmin_test');
    process.env.MONGODB_URL = uri;
    process.env.TEST_MONGODB_URL = uri;
  } else if (!process.env.MONGODB_URL && process.env.TEST_MONGODB_URL) {
    process.env.MONGODB_URL = process.env.TEST_MONGODB_URL;
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URL, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
  }
}, 120000);

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch {
    /* ignore */
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}, 60000);

export { mongoose };
