import mongoose from 'mongoose';

const aiConfigSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['openai', 'deepseek', 'doubao', 'gemini', 'kimi', 'aliyun', 'custom'],
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    api_key: {
      type: String,
      default: '',
      trim: true,
    },
    api_endpoint: {
      type: String,
      default: '',
      trim: true,
    },
    model: {
      type: String,
      default: '',
      trim: true,
    },
    max_tokens: {
      type: Number,
      default: 2000,
    },
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 2,
    },
    timeout: {
      type: Number,
      default: 30000,
    },
    // 提供商特定配置
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // 使用统计
    usage_count: {
      type: Number,
      default: 0,
    },
    last_used_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

aiConfigSchema.index({ provider: 1, enabled: 1 });

const AIConfig = mongoose.model('AIConfig', aiConfigSchema);

export default AIConfig;

