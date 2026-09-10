import mongoose from 'mongoose';

let isConnected = false;

mongoose.set('strictQuery', false);
mongoose.set('bufferTimeoutMS', 60000);
mongoose.set('bufferCommands', true);

export async function connectTestDB() {
  if (isConnected && mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.db.admin().ping();
      return;
    } catch {
      isConnected = false;
    }
  }

  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 99 || !isConnected) {
    const mongoUrl =
      process.env.MONGODB_URL ||
      process.env.TEST_MONGODB_URL ||
      'mongodb://127.0.0.1:27017/apiadmin_test';

    try {
      if (mongoose.connection.readyState !== 0) {
        try {
          await mongoose.disconnect();
        } catch {
          /* ignore */
        }
      }

      await mongoose.connect(mongoUrl, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
      });

      if (mongoose.connection.readyState !== 1) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Connection timeout after 15 seconds'));
          }, 15000);

          mongoose.connection.once('connected', () => {
            clearTimeout(timeout);
            resolve();
          });

          mongoose.connection.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
      }

      await mongoose.connection.db.admin().ping();
      isConnected = true;
    } catch (error) {
      isConnected = false;
      if (
        error.message?.includes('authentication') ||
        error.code === 18 ||
        error.codeName === 'AuthenticationFailed'
      ) {
        throw new Error('MongoDB authentication required');
      }
      throw error;
    }
  }
}

export async function disconnectTestDB() {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
    isConnected = false;
  }
}

export async function ensureConnection() {
  if (mongoose.connection.readyState !== 1) {
    await connectTestDB();
  }

  let retries = 3;
  while (retries > 0) {
    try {
      await mongoose.connection.db.admin().ping();
      return;
    } catch {
      retries--;
      if (retries === 0) {
        isConnected = false;
        await connectTestDB();
        await mongoose.connection.db.admin().ping();
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
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
    set: () => {},
  };
}
