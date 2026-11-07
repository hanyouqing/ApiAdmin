import mongoose, { Schema, Model } from 'mongoose';

export type AutoTestStepType = 'request' | 'wait' | 'if' | 'endif';

export interface IAutoTestTestCase {
  step_type: AutoTestStepType;
  step_name: string;
  interface_id?: Schema.Types.ObjectId | null;
  order: number;
  enabled: boolean;
  custom_headers: any;
  custom_data: any;
  path_params: any;
  query_params: any;
  assertion_script: string;
  pre_request_script: string;
  wait_ms: number;
  condition: string;
  loop_count: number;
}

export interface IAutoTestPassThreshold {
  min_pass_rate: number;
  treat_error_as_fail: boolean;
}

export interface IAutoTestTask {
  name: string;
  project_id: Schema.Types.ObjectId;
  description: string;
  test_cases: IAutoTestTestCase[];
  environment_id: Schema.Types.ObjectId | null;
  common_headers: any;
  base_url: string;
  pass_threshold: IAutoTestPassThreshold;
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
        step_type: {
          type: String,
          enum: ['request', 'wait', 'if', 'endif'],
          default: 'request',
        },
        step_name: {
          type: String,
          default: '',
          trim: true,
        },
        interface_id: {
          type: Schema.Types.ObjectId,
          ref: 'Interface',
          required: false,
          default: null,
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
        pre_request_script: {
          type: String,
          default: '',
        },
        wait_ms: {
          type: Number,
          default: 0,
        },
        condition: {
          type: String,
          default: '',
        },
        loop_count: {
          type: Number,
          default: 1,
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
    pass_threshold: {
      min_pass_rate: {
        type: Number,
        default: 100,
        min: 0,
        max: 100,
      },
      treat_error_as_fail: {
        type: Boolean,
        default: true,
      },
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

const AutoTestTask = mongoose.model<IAutoTestTask, AutoTestTaskModel>(
  'AutoTestTask',
  autoTestTaskSchema
);

export default AutoTestTask;
