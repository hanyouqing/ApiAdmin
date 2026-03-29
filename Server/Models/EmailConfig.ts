import mongoose, { Schema, Model } from 'mongoose';

export type EmailProvider = 'smtp' | 'sendgrid' | 'ses' | 'aliyun' | 'resend' | 'oci';

export interface IEmailConfig {
  provider: EmailProvider;
  smtp: any;
  sendgrid: any;
  ses: any;
  aliyun: any;
  resend: any;
  oci: any;
  from: any;
  updatedBy: Schema.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailConfigStatics {
  getConfig(): Promise<mongoose.HydratedDocument<IEmailConfig>>;
  updateConfig(updates: Partial<IEmailConfig>, userId?: Schema.Types.ObjectId | null): Promise<mongoose.HydratedDocument<IEmailConfig>>;
}

export type EmailConfigModel = Model<IEmailConfig, {}, IEmailConfigStatics>;

const emailConfigSchema = new Schema<IEmailConfig, EmailConfigModel>(
  {
    provider: {
      type: String,
      enum: ['smtp', 'sendgrid', 'ses', 'aliyun', 'resend', 'oci'],
      default: 'smtp',
    },
    smtp: {
      type: Schema.Types.Mixed,
      default: {},
    },
    sendgrid: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ses: {
      type: Schema.Types.Mixed,
      default: {},
    },
    aliyun: {
      type: Schema.Types.Mixed,
      default: {},
    },
    resend: {
      type: Schema.Types.Mixed,
      default: {},
    },
    oci: {
      type: Schema.Types.Mixed,
      default: {},
    },
    from: {
      type: Schema.Types.Mixed,
      default: {},
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
      (config as any).updatedBy = userId;
    }
    await config.save();
  }
  return config;
};

const EmailConfig = mongoose.model<IEmailConfig, EmailConfigModel>('EmailConfig', emailConfigSchema);

export default EmailConfig;
