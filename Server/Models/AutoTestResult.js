import mongoose from 'mongoose';

const autoTestResultSchema = new mongoose.Schema(
  {
    task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AutoTestTask',
      required: true,
      index: true,
    },
    environment_id: {
      type: mongoose.Schema.Types.ObjectId,
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
          type: mongoose.Schema.Types.ObjectId,
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
            type: mongoose.Schema.Types.Mixed,
            default: {},
          },
          body: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
          },
          query: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
          },
        },
        response: {
          status_code: {
            type: Number,
            default: null,
          },
          headers: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
          },
          body: {
            type: mongoose.Schema.Types.Mixed,
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

autoTestResultSchema.index({ task_id: 1, started_at: -1 });
autoTestResultSchema.index({ status: 1, started_at: -1 });

const AutoTestResult = mongoose.model('AutoTestResult', autoTestResultSchema);

export default AutoTestResult;


