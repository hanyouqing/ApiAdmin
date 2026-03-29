import mongoose, { Schema, Model } from 'mongoose';

export type TestStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error';

export interface ITestResult {
  collection_id: Schema.Types.ObjectId;
  test_case_id: Schema.Types.ObjectId;
  status: TestStatus;
  request: {
    url: string;
    method: string;
    headers: any;
    body: any;
  };
  response: {
    status_code: number;
    headers: any;
    body: any;
    duration: number;
  };
  assertion_result: {
    passed: boolean;
    message: string;
    errors: string[];
  };
  error: {
    message: string;
    stack: string;
  };
  duration: number;
  run_at: Date;
  uid: Schema.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export type TestResultModel = Model<ITestResult>;

const testResultSchema = new Schema<ITestResult>(
  {
    collection_id: {
      type: Schema.Types.ObjectId,
      ref: 'TestCollection',
      required: true,
    },
    test_case_id: {
      type: Schema.Types.ObjectId,
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
      headers: Schema.Types.Mixed,
      body: Schema.Types.Mixed,
    },
    response: {
      status_code: Number,
      headers: Schema.Types.Mixed,
      body: Schema.Types.Mixed,
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

testResultSchema.index({ collection_id: 1, run_at: -1 });
testResultSchema.index({ test_case_id: 1, run_at: -1 });

const TestResult = mongoose.model<ITestResult, TestResultModel>('TestResult', testResultSchema);

export default TestResult;
