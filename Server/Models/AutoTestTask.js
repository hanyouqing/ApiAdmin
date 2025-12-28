import mongoose from 'mongoose';

const autoTestTaskSchema = new mongoose.Schema(
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
    description: {
      type: String,
      default: '',
    },
    test_cases: [
      {
        interface_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Interface',
          required: true,
        },
        order: {
          type: Number,
          required: true,
        },
        enabled: {
          type: Boolean,
          default: true,
        },
        custom_headers: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        custom_data: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        path_params: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        query_params: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        assertion_script: {
          type: String,
          default: '',
        },
      },
    ],
    environment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestEnvironment',
      default: null,
    },
    schedule: {
      enabled: {
        type: Boolean,
        default: false,
      },
      cron: {
        type: String,
        default: '',
      },
      timezone: {
        type: String,
        default: 'Asia/Shanghai',
      },
    },
    notification: {
      enabled: {
        type: Boolean,
        default: false,
      },
      on_success: {
        type: Boolean,
        default: false,
      },
      on_failure: {
        type: Boolean,
        default: true,
      },
      webhook_url: {
        type: String,
        default: '',
      },
    },
    enabled: {
      type: Boolean,
      default: true,
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

autoTestTaskSchema.index({ project_id: 1, enabled: 1 });
autoTestTaskSchema.index({ 'schedule.enabled': 1 });

const AutoTestTask = mongoose.model('AutoTestTask', autoTestTaskSchema);

export default AutoTestTask;

