import mongoose, { Schema, Model } from 'mongoose';

export type AIProvider = 'openai' | 'deepseek' | 'doubao' | 'gemini' | 'kimi' | 'aliyun' | 'custom';

export interface IAIConfig {
  provider: AIProvider;
  name: string;
  enabled: boolean;
  api_key: string;
  api_endpoint: string;
  model: string;
  max_tokens: number;
  temperature: number;
  timeout: number;
  config: any;
  usage_count: number;
  last_used_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AIConfigModel = Model<IAIConfig>;

const aiConfigSchema = new Schema<IAIConfig>(
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
      type: Schema.Types.Mixed,
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

const AIConfig = mongoose.model<IAIConfig, AIConfigModel>('AIConfig', aiConfigSchema);

export default AIConfig;
