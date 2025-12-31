import mongoose from 'mongoose';

const emailConfigSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['smtp', 'sendgrid', 'ses', 'aliyun', 'resend', 'oci'],
      default: 'smtp',
    },
    smtp: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sendgrid: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ses: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    aliyun: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    resend: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    oci: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    from: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
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

emailConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({
      provider: 'smtp',
      smtp: {},
      from: {
        name: 'ApiAdmin',
        email: '',
      },
    });
  }
  return config;
};

emailConfigSchema.statics.updateConfig = async function (updates, userId = null) {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({
      ...updates,
      updatedBy: userId,
    });
  } else {
    Object.assign(config, updates);
    if (userId) {
      config.updatedBy = userId;
    }
    await config.save();
  }
  return config;
};

const EmailConfig = mongoose.model('EmailConfig', emailConfigSchema);

export default EmailConfig;

