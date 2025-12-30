import mongoose from 'mongoose';

let isConnected = false;

// Configure Mongoose for tests
mongoose.set('strictQuery', false);
// Increase buffer timeout for tests (default is 10000ms, increase to 60000ms)
mongoose.set('bufferTimeoutMS', 60000);
// Enable buffering for commands when not connected
mongoose.set('bufferCommands', true);

export async function connectTestDB() {
  // Check if already connected and working
  if (isConnected && mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.db.admin().ping();
      return;
    } catch (e) {
      isConnected = false;
    }
  }

  // If not connected or connection is broken, establish new connection
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 99 || !isConnected) {
    const mongoUrl = process.env.MONGODB_URL || process.env.TEST_MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test';
    
    try {
      // Disconnect if there's a stale connection
      if (mongoose.connection.readyState !== 0) {
        try {
          await mongoose.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      }

      // Connect with proper options including bufferTimeoutMS
      await mongoose.connect(mongoUrl, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        bufferTimeoutMS: 60000, // Explicitly set in connection options
        bufferCommands: true, // Enable command buffering
      });
      
      // Wait for connection to be fully established
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
      
      // Verify connection with ping (wait a bit for connection to stabilize)
      await new Promise(resolve => setTimeout(resolve, 100));
      await mongoose.connection.db.admin().ping();
      isConnected = true;
    } catch (error) {
      isConnected = false;
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
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    try {
      await mongoose.disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
    isConnected = false;
  }
}

// Helper function to ensure connection is ready before operations
export async function ensureConnection() {
  // Ensure we're connected
  if (mongoose.connection.readyState !== 1) {
    await connectTestDB();
  }
  
  // Wait a bit for connection to stabilize
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Double-check with ping
  let retries = 3;
  while (retries > 0) {
    try {
      await mongoose.connection.db.admin().ping();
      // Connection is ready
      return;
    } catch (e) {
      retries--;
      if (retries === 0) {
        // If ping fails after retries, reconnect
        isConnected = false;
        await connectTestDB();
        // Wait again after reconnection
        await new Promise(resolve => setTimeout(resolve, 100));
        await mongoose.connection.db.admin().ping();
      } else {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 100));
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
    set: (key, value) => {},
  };
}

