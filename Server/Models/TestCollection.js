import mongoose from 'mongoose';

const testCollectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      // 不使用 index: true，因为下面有复合索引包含 project_id
    },
    test_cases: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestCase',
      },
    ],
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

testCollectionSchema.index({ project_id: 1, created_at: -1 });
testCollectionSchema.index({ uid: 1 });

const TestCollection = mongoose.model('TestCollection', testCollectionSchema);

export default TestCollection;

