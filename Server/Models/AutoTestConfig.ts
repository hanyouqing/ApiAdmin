import mongoose, { Schema, Model } from 'mongoose';

export type DataGenerationStrategy = 'mock' | 'example' | 'history';

export interface IAutoTestConfig {
  project_id: Schema.Types.ObjectId;
  enabled: boolean;
  autoGenerate: boolean;
  autoExecute: boolean;
  dataGenerationStrategy: DataGenerationStrategy;
  assertionTemplate: string | null;
  timeout: number;
  retryCount: number;
  updatedBy: Schema.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAutoTestConfigStatics {
  getConfig(projectId: Schema.Types.ObjectId | string): Promise<mongoose.HydratedDocument<IAutoTestConfig> | null>;
  getOrCreateConfig(projectId: Schema.Types.ObjectId | string, defaultConfig?: Partial<IAutoTestConfig>): Promise<mongoose.HydratedDocument<IAutoTestConfig>>;
}

export type AutoTestConfigModel = Model<IAutoTestConfig, {}, IAutoTestConfigStatics>;

const autoTestConfigSchema = new Schema<IAutoTestConfig, AutoTestConfigModel>(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      unique: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    autoGenerate: {
      type: Boolean,
      default: true,
    },
    autoExecute: {
      type: Boolean,
      default: false,
    },
    dataGenerationStrategy: {
      type: String,
      enum: ['mock', 'example', 'history'],
      default: 'mock',
    },
    assertionTemplate: {
      type: String,
      default: null,
    },
    timeout: {
      type: Number,
      default: 30000,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

autoTestConfigSchema.statics.getConfig = async function(projectId) {
  if (!projectId) {
    return null;
  }
  return await this.findOne({ project_id: projectId });
};

autoTestConfigSchema.statics.getOrCreateConfig = async function(projectId, defaultConfig = {}) {
  let config = await this.findOne({ project_id: projectId });
  if (!config) {
    config = new this({
      project_id: projectId,
      ...defaultConfig,
    });
    await config.save();
  }
  return config;
};

const AutoTestConfig = mongoose.model<IAutoTestConfig, AutoTestConfigModel>('AutoTestConfig', autoTestConfigSchema);

export default AutoTestConfig;
