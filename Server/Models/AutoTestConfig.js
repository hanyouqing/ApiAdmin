import mongoose from 'mongoose';

const autoTestConfigSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.ObjectId,
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

const AutoTestConfig = mongoose.model('AutoTestConfig', autoTestConfigSchema);

export default AutoTestConfig;

