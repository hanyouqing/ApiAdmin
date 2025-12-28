import mongoose from 'mongoose';

const operationLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['project', 'interface', 'user', 'group', 'test', 'mock'],
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetName: {
      type: String,
      default: '',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    uri: {
      type: String,
      default: '',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

operationLogSchema.index({ type: 1, createdAt: -1 });
operationLogSchema.index({ userId: 1, createdAt: -1 });
operationLogSchema.index({ projectId: 1, createdAt: -1 });
operationLogSchema.index({ action: 1, createdAt: -1 });

const OperationLog = mongoose.model('OperationLog', operationLogSchema);

export default OperationLog;

