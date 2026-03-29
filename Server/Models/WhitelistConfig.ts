import mongoose, { Schema, Model } from 'mongoose';
import { WhitelistPlatform } from './Whitelist.js';

export interface IWhitelistConfig {
  enabled: boolean;
  platforms: WhitelistPlatform[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IWhitelistConfigStatics {
  getConfig(): Promise<mongoose.HydratedDocument<IWhitelistConfig>>;
  updateConfig(updates: Partial<IWhitelistConfig>): Promise<mongoose.HydratedDocument<IWhitelistConfig>>;
}

export type WhitelistConfigModel = Model<IWhitelistConfig, {}, IWhitelistConfigStatics>;

const whitelistConfigSchema = new Schema<IWhitelistConfig, WhitelistConfigModel>(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    platforms: {
      type: [String],
      enum: ['github', 'gitlab', 'gmail', 'wechat', 'phone', 'email'],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

whitelistConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({
      enabled: false,
      platforms: [],
    });
  }
  return config;
};

whitelistConfigSchema.statics.updateConfig = async function (updates) {
  let config = await this.findOne();
  if (!config) {
    config = await this.create(updates);
  } else {
    Object.assign(config, updates);
    await config.save();
  }
  return config;
};

const WhitelistConfig = mongoose.model<IWhitelistConfig, WhitelistConfigModel>('WhitelistConfig', whitelistConfigSchema);

export default WhitelistConfig;
