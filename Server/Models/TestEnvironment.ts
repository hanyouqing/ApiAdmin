import mongoose, { Schema, Model } from 'mongoose';

export interface ITestEnvironment {
  name: string;
  project_id: Schema.Types.ObjectId;
  base_url: string;
  variables: any;
  headers: any;
  description: string;
  is_default: boolean;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type TestEnvironmentModel = Model<ITestEnvironment>;

const testEnvironmentSchema = new Schema<ITestEnvironment>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    base_url: {
      type: String,
      required: true,
    },
    variables: {
      type: Schema.Types.Mixed,
      default: {},
    },
    headers: {
      type: Schema.Types.Mixed,
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
      type: Schema.Types.ObjectId,
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

const TestEnvironment = mongoose.model<ITestEnvironment, TestEnvironmentModel>('TestEnvironment', testEnvironmentSchema);

export default TestEnvironment;
