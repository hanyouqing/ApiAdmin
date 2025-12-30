import mongoose from 'mongoose';

const pluginSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
    },
    version: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    author: {
      type: String,
      default: '',
    },
    license: {
      type: String,
      default: 'MIT',
    },
    icon: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['export', 'import', 'mock', 'test', 'integration', 'buildin', 'other'],
      default: 'other',
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    installed: {
      type: Boolean,
      default: true,
    },
    hasUpdate: {
      type: Boolean,
      default: false,
    },
    latestVersion: {
      type: String,
      default: '',
    },
    dependencies: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    entry: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    routes: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    hooks: {
      type: [String],
      default: [],
    },
    permissions: {
      type: [String],
      default: [],
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    configSchema: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    installedAt: {
      type: Date,
      default: Date.now,
    },
    installedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

pluginSchema.index({ category: 1, enabled: 1 });

const Plugin = mongoose.model('Plugin', pluginSchema);

export default Plugin;

