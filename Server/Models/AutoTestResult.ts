import mongoose, { Schema, Model } from 'mongoose';

export type AutoTestOverallStatus = 'running' | 'passed' | 'failed' | 'error' | 'cancelled';
export type AutoTestStepStatus = 'pending' | 'running' | 'passed' | 'failed' | 'error' | 'skipped';
export type AutoTestTriggerSource = 'manual' | 'schedule' | 'webhook';

export interface IAutoTestStepResult {
  interface_id: Schema.Types.ObjectId;
  interface_name: string;
  order: number;
  status: AutoTestStepStatus;
  request: {
    method: string;
    url: string;
    headers: any;
    body: any;
    query: any;
  };
  response: {
    status_code: number | null;
    headers: any;
    body: any;
    duration: number;
  };
  error: {
    message: string;
    stack: string;
    code: string;
  };
  assertion_result: {
    passed: boolean;
    message: string;
    errors: string[];
  };
  duration: number;
  started_at: Date | null;
  completed_at: Date | null;
}

export interface IAutoTestResult {
  task_id: Schema.Types.ObjectId;
  environment_id: Schema.Types.ObjectId | null;
  status: AutoTestOverallStatus;
  summary: {
    total: number;
    passed: number;
    failed: number;
    error: number;
    skipped: number;
  };
  results: IAutoTestStepResult[];
  duration: number;
  started_at: Date;
  completed_at: Date | null;
  triggered_by: AutoTestTriggerSource;
  triggered_by_user: Schema.Types.ObjectId | null;
  ai_analysis: any;
  createdAt: Date;
  updatedAt: Date;
}

export type AutoTestResultModel = Model<IAutoTestResult>;

const autoTestResultSchema = new Schema<IAutoTestResult>(
  {
    task_id: {
      type: Schema.Types.ObjectId,
      ref: 'AutoTestTask',
      required: true,
      index: true,
    },
    environment_id: {
      type: Schema.Types.ObjectId,
      ref: 'TestEnvironment',
      default: null,
    },
    status: {
      type: String,
      enum: ['running', 'passed', 'failed', 'error', 'cancelled'],
      default: 'running',
      index: true,
    },
    summary: {
      total: {
        type: Number,
        default: 0,
      },
      passed: {
        type: Number,
        default: 0,
      },
      failed: {
        type: Number,
        default: 0,
      },
      error: {
        type: Number,
        default: 0,
      },
      skipped: {
        type: Number,
        default: 0,
      },
    },
    results: [
      {
        interface_id: {
          type: Schema.Types.ObjectId,
          ref: 'Interface',
          required: true,
        },
        interface_name: {
          type: String,
          required: true,
        },
        order: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          enum: ['pending', 'running', 'passed', 'failed', 'error', 'skipped'],
          default: 'pending',
        },
        request: {
          method: {
            type: String,
            required: true,
          },
          url: {
            type: String,
            required: true,
          },
          headers: {
            type: Schema.Types.Mixed,
            default: {},
          },
          body: {
            type: Schema.Types.Mixed,
            default: null,
          },
          query: {
            type: Schema.Types.Mixed,
            default: {},
          },
        },
        response: {
          status_code: {
            type: Number,
            default: null,
          },
          headers: {
            type: Schema.Types.Mixed,
            default: {},
          },
          body: {
            type: Schema.Types.Mixed,
            default: null,
          },
          duration: {
            type: Number,
            default: 0,
          },
        },
        error: {
          message: {
            type: String,
            default: '',
          },
          stack: {
            type: String,
            default: '',
          },
          code: {
            type: String,
            default: '',
          },
        },
        assertion_result: {
          passed: {
            type: Boolean,
            default: false,
          },
          message: {
            type: String,
            default: '',
          },
          errors: {
            type: [String],
            default: [],
          },
        },
        duration: {
          type: Number,
          default: 0,
        },
        started_at: {
          type: Date,
          default: null,
        },
        completed_at: {
          type: Date,
          default: null,
        },
      },
    ],
    duration: {
      type: Number,
      default: 0,
    },
    started_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completed_at: {
      type: Date,
      default: null,
    },
    triggered_by: {
      type: String,
      enum: ['manual', 'schedule', 'webhook'],
      default: 'manual',
    },
    triggered_by_user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    ai_analysis: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

autoTestResultSchema.index({ task_id: 1, started_at: -1 });
autoTestResultSchema.index({ status: 1, started_at: -1 });

const AutoTestResult = mongoose.model<IAutoTestResult, AutoTestResultModel>('AutoTestResult', autoTestResultSchema);

export default AutoTestResult;
