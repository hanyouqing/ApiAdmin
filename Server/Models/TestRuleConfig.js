import mongoose from 'mongoose';

const testRuleConfigSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
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
      status_code_check: {
        type: Boolean,
        default: true,
      },
      response_time_check: {
        type: Boolean,
        default: false,
      },
      max_response_time: {
        type: Number,
        default: 5000,
      },
      response_format_check: {
        type: Boolean,
        default: true,
      },
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
      timeout: {
        type: Number,
        default: 30000,
      },
      retry_count: {
        type: Number,
        default: 0,
      },
      retry_delay: {
        type: Number,
        default: 1000,
      },
      follow_redirects: {
        type: Boolean,
        default: true,
      },
      verify_ssl: {
        type: Boolean,
        default: true,
      },
      default_headers: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    // 通用响应配置
    response_config: {
      validate_schema: {
        type: Boolean,
        default: false,
      },
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// 复合索引：项目ID + 类型
testRuleConfigSchema.index({ project_id: 1, type: 1 });
testRuleConfigSchema.index({ project_id: 1, enabled: 1 });

testRuleConfigSchema.statics.getProjectRules = async function(projectId, type = null) {
  const query = { project_id: projectId, enabled: true };
  if (type) {
    query.type = type;
  }
  return await this.find(query).sort({ createdAt: -1 });
};

const TestRuleConfig = mongoose.model('TestRuleConfig', testRuleConfigSchema);

export default TestRuleConfig;

