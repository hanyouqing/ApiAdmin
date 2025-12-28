import mongoose from 'mongoose';

const whitelistConfigSchema = new mongoose.Schema(
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

const WhitelistConfig = mongoose.model('WhitelistConfig', whitelistConfigSchema);

export default WhitelistConfig;

