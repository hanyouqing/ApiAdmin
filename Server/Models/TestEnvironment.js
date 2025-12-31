import mongoose from 'mongoose';

const testEnvironmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    base_url: {
      type: String,
      required: true,
    },
    variables: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    headers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    description: {
      type: String,
      default: '',
    },
    is_default: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// 确保每个项目只有一个默认环境
testEnvironmentSchema.index({ project_id: 1, is_default: 1 }, { unique: true, partialFilterExpression: { is_default: true } });
testEnvironmentSchema.index({ project_id: 1, name: 1 }, { unique: true });

const TestEnvironment = mongoose.model('TestEnvironment', testEnvironmentSchema);

export default TestEnvironment;


