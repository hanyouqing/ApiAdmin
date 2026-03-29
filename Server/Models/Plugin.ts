import mongoose, { Schema, Model } from 'mongoose';

export type PluginCategory = 'export' | 'import' | 'mock' | 'test' | 'integration' | 'buildin' | 'other';

export interface IPlugin {
  name: string;
  displayName: string;
  version: string;
  description: string;
  author: string;
  license: string;
  icon: string;
  category: PluginCategory;
  enabled: boolean;
  installed: boolean;
  hasUpdate: boolean;
  latestVersion: string;
  dependencies: any;
  entry: any;
  routes: any[];
  hooks: string[];
  permissions: string[];
  config: any;
  configSchema: any;
  installedAt: Date;
  installedBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type PluginModel = Model<IPlugin>;

const pluginSchema = new Schema<IPlugin>(
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
      type: Schema.Types.Mixed,
      default: {},
    },
    entry: {
      type: Schema.Types.Mixed,
      default: {},
    },
    routes: {
      type: [Schema.Types.Mixed] as any,
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
      type: Schema.Types.Mixed,
      default: {},
    },
    configSchema: {
      type: Schema.Types.Mixed,
      default: {},
    },
    installedAt: {
      type: Date,
      default: Date.now,
    },
    installedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

pluginSchema.index({ category: 1, enabled: 1 });

const Plugin = mongoose.model<IPlugin, PluginModel>('Plugin', pluginSchema);

export default Plugin;
