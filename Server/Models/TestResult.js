import mongoose from 'mongoose';

const testResultSchema = new mongoose.Schema(
  {
    collection_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestCollection',
      required: true,
      // 不使用 index: true，因为下面有复合索引包含 collection_id
    },
    test_case_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestCase',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'passed', 'failed', 'error'],
      default: 'pending',
    },
    request: {
      url: String,
      method: String,
      headers: mongoose.Schema.Types.Mixed,
      body: mongoose.Schema.Types.Mixed,
    },
    response: {
      status_code: Number,
      headers: mongoose.Schema.Types.Mixed,
      body: mongoose.Schema.Types.Mixed,
      duration: Number,
    },
    assertion_result: {
      passed: Boolean,
      message: String,
      errors: [String],
    },
    error: {
      message: String,
      stack: String,
    },
    duration: {
      type: Number,
      default: 0,
    },
    run_at: {
      type: Date,
      default: Date.now,
      // 不使用 index: true，因为下面有复合索引包含 run_at
    },
    uid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

testResultSchema.index({ collection_id: 1, run_at: -1 });
testResultSchema.index({ test_case_id: 1, run_at: -1 });

const TestResult = mongoose.model('TestResult', testResultSchema);

export default TestResult;

