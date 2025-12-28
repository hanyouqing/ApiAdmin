import mongoose from 'mongoose';

const mockExpectationSchema = new mongoose.Schema(
  {
    interface_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interface',
      required: true,
      // 不使用 index: true，因为下面有复合索引包含 interface_id
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      // 不使用 index: true，因为下面有单独索引 project_id
    },
    name: {
      type: String,
      required: true,
    },
    ip_filter: {
      type: String,
      default: '',
    },
    query_filter: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    body_filter: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    response: {
      status_code: {
        type: Number,
        default: 200,
      },
      delay: {
        type: Number,
        default: 0,
      },
      headers: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
      body: {
        type: String,
        default: '{}',
      },
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 0,
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

mockExpectationSchema.index({ interface_id: 1, priority: -1, enabled: 1 });
mockExpectationSchema.index({ project_id: 1 });

const MockExpectation = mongoose.model('MockExpectation', mockExpectationSchema);

export default MockExpectation;

