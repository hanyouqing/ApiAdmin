import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema(
  {
    collection_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestCollection',
      required: true,
      // 不使用 index: true，因为下面有复合索引包含 collection_id
    },
    interface_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interface',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    request: {
      method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
        required: true,
      },
      path: {
        type: String,
        required: true,
      },
      query: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      body: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      headers: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      path_params: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    assertion_script: {
      type: String,
      default: '',
    },
    order: {
      type: Number,
      default: 0,
    },
    enabled: {
      type: Boolean,
      default: true,
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

testCaseSchema.index({ collection_id: 1, order: 1 });
testCaseSchema.index({ interface_id: 1 });

const TestCase = mongoose.model('TestCase', testCaseSchema);

export default TestCase;

