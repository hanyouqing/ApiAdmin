import mongoose from 'mongoose';

mongoose.set('bufferCommands', false);

let isConnected = false;

export async function connectTestDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.db.admin().ping();
      return;
    } catch (e) {
      isConnected = false;
    }
  }

  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 99) {
    const mongoUrl = process.env.MONGODB_URL || process.env.TEST_MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test';
    
    try {
      const connectPromise = mongoose.connect(mongoUrl, {
        serverSelectionTimeoutMS: 5000,
      });
      
      const connectedPromise = new Promise((resolve, reject) => {
        if (mongoose.connection.readyState === 1) {
          resolve();
        } else {
          mongoose.connection.once('connected', resolve);
          mongoose.connection.once('error', reject);
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        }
      });
      
      await Promise.all([connectPromise, connectedPromise]);
      
      await mongoose.connection.db.admin().ping();
      isConnected = true;
    } catch (error) {
      if (error.message?.includes('authentication') || error.code === 18 || error.codeName === 'AuthenticationFailed') {
        console.warn('⚠️  MongoDB requires authentication. Tests requiring database will be skipped.');
        console.warn('   Set TEST_MONGODB_URL environment variable with credentials if needed.');
        throw new Error('MongoDB authentication required');
      }
      throw error;
    }
  }
}

export async function disconnectTestDB() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
    isConnected = false;
  }
}

export function createMockCtx(params = {}, query = {}, body = {}, user = null, projectId = null) {
  return {
    params,
    query,
    request: { body },
    state: {
      user: user || { _id: new mongoose.Types.ObjectId(), role: 'guest' },
      projectId: projectId || new mongoose.Types.ObjectId(),
    },
    status: 200,
    body: null,
    set: (key, value) => {},
  };
}

