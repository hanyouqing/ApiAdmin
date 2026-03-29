import mongoose, { Schema, Model } from 'mongoose';

export interface ITestCaseRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  path: string;
  query: any;
  body: any;
  headers: any;
  path_params: any;
}

export interface ITestCase {
  collection_id: Schema.Types.ObjectId;
  interface_id: Schema.Types.ObjectId;
  name: string;
  description: string;
  request: ITestCaseRequest;
  assertion_script: string;
  order: number;
  enabled: boolean;
  uid: Schema.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export type TestCaseModel = Model<ITestCase>;

const testCaseSchema = new Schema<ITestCase>(
  {
    collection_id: {
      type: Schema.Types.ObjectId,
      ref: 'TestCollection',
      required: true,
    },
    interface_id: {
      type: Schema.Types.ObjectId,
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
        type: Schema.Types.Mixed,
        default: {},
      },
      body: {
        type: Schema.Types.Mixed,
        default: {},
      },
      headers: {
        type: Schema.Types.Mixed,
        default: {},
      },
      path_params: {
        type: Schema.Types.Mixed,
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
      type: Schema.Types.ObjectId,
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

const TestCase = mongoose.model<ITestCase, TestCaseModel>('TestCase', testCaseSchema);

export default TestCase;
