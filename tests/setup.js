import mongoose from 'mongoose';
import { beforeAll, afterAll } from 'vitest';

mongoose.set('strictQuery', false);
mongoose.set('bufferTimeoutMS', 60000);
mongoose.set('bufferCommands', true);

let mongoServer = null;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'test-jwt-secret-key-at-least-32-chars';
  process.env.ALLOW_MOCK_SCRIPTS = process.env.ALLOW_MOCK_SCRIPTS || 'true';

  if (!process.env.MONGODB_URL && !process.env.TEST_MONGODB_URL) {
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
