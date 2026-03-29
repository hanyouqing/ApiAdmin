import mongoose, { Schema, Model } from 'mongoose';

export type TestRuleType = 'assertion' | 'request' | 'response';

export interface ITestRuleConfig {
  project_id: Schema.Types.ObjectId;
  name: string;
  type: TestRuleType;
  enabled: boolean;
  assertion_rules: {
    status_code_check: boolean;
    response_time_check: boolean;
    max_response_time: number;
    response_format_check: boolean;
    custom_assertions: Array<{
      name: string;
      script: string;
      description: string;
    }>;
  };
  request_config: {
    timeout: number;
    retry_count: number;
    retry_delay: number;
    follow_redirects: boolean;
    verify_ssl: boolean;
    default_headers: any;
  };
  response_config: {
    validate_schema: boolean;
    extract_variables: Array<{
      name: string;
      path: string;
      type: 'json' | 'header' | 'cookie';
    }>;
  };
  description: string;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITestRuleConfigStatics {
  getProjectRules(projectId: Schema.Types.ObjectId | string, type?: TestRuleType | null): Promise<mongoose.HydratedDocument<ITestRuleConfig>[]>;
}

export type TestRuleConfigModel = Model<ITestRuleConfig, {}, ITestRuleConfigStatics>;

const testRuleConfigSchema = new Schema<ITestRuleConfig, TestRuleConfigModel>(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['assertion', 'request', 'response'],
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    // 通用断言规则
    assertion_rules: {
      status_code_check: { type: Boolean, default: true },
      response_time_check: { type: Boolean, default: false },
      max_response_time: { type: Number, default: 5000 },
      response_format_check: { type: Boolean, default: true },
      custom_assertions: [
        {
          name: String,
          script: String,
          description: String,
        },
      ],
    },
    // 通用请求配置
    request_config: {
      timeout: { type: Number, default: 30000 },
      retry_count: { type: Number, default: 0 },
      retry_delay: { type: Number, default: 1000 },
      follow_redirects: { type: Boolean, default: true },
      verify_ssl: { type: Boolean, default: true },
      default_headers: { type: Schema.Types.Mixed, default: {} },
    },
    // 通用响应配置
    response_config: {
      validate_schema: { type: Boolean, default: false },
      extract_variables: [
        {
          name: String,
          path: String,
          type: {
            type: String,
            enum: ['json', 'header', 'cookie'],
          },
        },
      ],
    },
    description: {
      type: String,
      default: '',
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

testRuleConfigSchema.index({ project_id: 1, type: 1 });
testRuleConfigSchema.index({ project_id: 1, enabled: 1 });

testRuleConfigSchema.statics.getProjectRules = async function(projectId, type = null) {
  const query: any = { project_id: projectId, enabled: true };
  if (type) {
    query.type = type;
  }
  return await this.find(query).sort({ createdAt: -1 });
};

const TestRuleConfig = mongoose.model<ITestRuleConfig, TestRuleConfigModel>('TestRuleConfig', testRuleConfigSchema);

export default TestRuleConfig;
