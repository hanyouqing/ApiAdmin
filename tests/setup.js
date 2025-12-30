// Test setup file - runs before all tests
// This ensures Mongoose configuration is set before any models are imported
import mongoose from 'mongoose';

// Configure Mongoose for tests BEFORE any models are imported
mongoose.set('strictQuery', false);
// Increase buffer timeout for tests (default is 10000ms, increase to 60000ms)
mongoose.set('bufferTimeoutMS', 60000);
// Enable buffering for commands when not connected
mongoose.set('bufferCommands', true);

// Export mongoose instance for use in tests
export { mongoose };

