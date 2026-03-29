import mongoose, { Schema, Model } from 'mongoose';

export interface INotificationToggle {
  interfaceChange: boolean;
  testFailed: boolean;
  projectUpdate: boolean;
  system: boolean;
}

export interface INotificationSettings {
  user_id: Schema.Types.ObjectId;
  email: INotificationToggle;
  inApp: INotificationToggle;
  webhook: {
    enabled: boolean;
    url: string;
  };
  feishu: {
    enabled: boolean;
    webhookUrl: string;
    secret: string;
  } & INotificationToggle;
  dingtalk: {
    enabled: boolean;
    webhookUrl: string;
    secret: string;
  } & INotificationToggle;
  slack: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
  } & INotificationToggle;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationSettingsModel = Model<INotificationSettings>;

const notificationSettingsSchema = new Schema<INotificationSettings>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    email: {
      interfaceChange: { type: Boolean, default: true },
      testFailed: { type: Boolean, default: true },
      projectUpdate: { type: Boolean, default: false },
      system: { type: Boolean, default: true },
    },
    inApp: {
      interfaceChange: { type: Boolean, default: true },
      testFailed: { type: Boolean, default: true },
      projectUpdate: { type: Boolean, default: true },
      system: { type: Boolean, default: true },
    },
    webhook: {
      enabled: { type: Boolean, default: false },
      url: { type: String, default: '' },
    },
    feishu: {
      enabled: { type: Boolean, default: false },
      webhookUrl: { type: String, default: '' },
      secret: { type: String, default: '' },
      interfaceChange: { type: Boolean, default: true },
      testFailed: { type: Boolean, default: true },
      projectUpdate: { type: Boolean, default: false },
      system: { type: Boolean, default: true },
    },
    dingtalk: {
      enabled: { type: Boolean, default: false },
      webhookUrl: { type: String, default: '' },
      secret: { type: String, default: '' },
      interfaceChange: { type: Boolean, default: true },
      testFailed: { type: Boolean, default: true },
      projectUpdate: { type: Boolean, default: false },
      system: { type: Boolean, default: true },
    },
    slack: {
      enabled: { type: Boolean, default: false },
      webhookUrl: { type: String, default: '' },
      channel: { type: String, default: '' },
      interfaceChange: { type: Boolean, default: true },
      testFailed: { type: Boolean, default: true },
      projectUpdate: { type: Boolean, default: false },
      system: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

const NotificationSettings = mongoose.model<INotificationSettings, NotificationSettingsModel>('NotificationSettings', notificationSettingsSchema);

export default NotificationSettings;
