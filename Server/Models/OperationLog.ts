import mongoose, { Schema, Model } from 'mongoose';

export type OperationLogType = 'project' | 'interface' | 'user' | 'group' | 'test' | 'mock';

export interface IOperationLog {
  type: OperationLogType;
  action: string;
  targetId: Schema.Types.ObjectId;
  targetName: string;
  userId: Schema.Types.ObjectId;
  username: string;
  details: any;
  ip: string;
  userAgent: string;
  projectId: Schema.Types.ObjectId | null;
  uri: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OperationLogModel = Model<IOperationLog>;

const operationLogSchema = new Schema<IOperationLog>(
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
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetName: {
      type: String,
      default: '',
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
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
      type: Schema.Types.ObjectId,
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

const OperationLog = mongoose.model<IOperationLog, OperationLogModel>('OperationLog', operationLogSchema);

export default OperationLog;
