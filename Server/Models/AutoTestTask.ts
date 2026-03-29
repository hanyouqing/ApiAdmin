import mongoose, { Schema, Model } from 'mongoose';

export interface IAutoTestTestCase {
  interface_id: Schema.Types.ObjectId;
  order: number;
  enabled: boolean;
  custom_headers: any;
  custom_data: any;
  path_params: any;
  query_params: any;
  assertion_script: string;
}

export interface IAutoTestTask {
  name: string;
  project_id: Schema.Types.ObjectId;
  description: string;
  test_cases: IAutoTestTestCase[];
  environment_id: Schema.Types.ObjectId | null;
  common_headers: any;
  base_url: string;
  schedule: {
    enabled: boolean;
    cron: string;
    timezone: string;
  };
  notification: {
    enabled: boolean;
    on_success: boolean;
    on_failure: boolean;
    webhook_url: string;
    email_enabled: boolean;
    email_addresses: string[];
  };
  enabled: boolean;
  code_repository_id: Schema.Types.ObjectId | null;
  ai_config_provider: string | null;
  ai_analysis_enabled: boolean;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type AutoTestTaskModel = Model<IAutoTestTask>;

const autoTestTaskSchema = new Schema<IAutoTestTask>(
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
    description: {
      type: String,
      default: '',
    },
    test_cases: [
      {
        interface_id: {
          type: Schema.Types.ObjectId,
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
          type: Schema.Types.Mixed,
          default: {},
        },
        custom_data: {
          type: Schema.Types.Mixed,
          default: {},
        },
        path_params: {
          type: Schema.Types.Mixed,
          default: {},
        },
        query_params: {
          type: Schema.Types.Mixed,
          default: {},
        },
        assertion_script: {
          type: String,
          default: '',
        },
      },
    ],
    environment_id: {
      type: Schema.Types.ObjectId,
      ref: 'TestEnvironment',
      default: null,
    },
    common_headers: {
      type: Schema.Types.Mixed,
      default: {},
    },
    base_url: {
      type: String,
      default: '',
      trim: true,
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
      email_enabled: {
        type: Boolean,
        default: false,
      },
      email_addresses: {
        type: [String],
        default: [],
      },
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    code_repository_id: {
      type: Schema.Types.ObjectId,
      ref: 'CodeRepository',
      default: null,
    },
    ai_config_provider: {
      type: String,
      default: null,
      trim: true,
    },
    ai_analysis_enabled: {
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

autoTestTaskSchema.index({ project_id: 1, enabled: 1 });
autoTestTaskSchema.index({ 'schedule.enabled': 1 });

const AutoTestTask = mongoose.model<IAutoTestTask, AutoTestTaskModel>('AutoTestTask', autoTestTaskSchema);

export default AutoTestTask;
