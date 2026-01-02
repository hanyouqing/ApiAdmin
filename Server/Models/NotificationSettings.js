import mongoose from 'mongoose';

const notificationSettingsSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    email: {
      interfaceChange: {
        type: Boolean,
        default: true,
      },
      testFailed: {
        type: Boolean,
        default: true,
      },
      projectUpdate: {
        type: Boolean,
        default: false,
      },
      system: {
        type: Boolean,
        default: true,
      },
    },
    inApp: {
      interfaceChange: {
        type: Boolean,
        default: true,
      },
      testFailed: {
        type: Boolean,
        default: true,
      },
      projectUpdate: {
        type: Boolean,
        default: true,
      },
      system: {
        type: Boolean,
        default: true,
      },
    },
    webhook: {
      enabled: {
        type: Boolean,
        default: false,
      },
      url: {
        type: String,
        default: '',
      },
    },
    feishu: {
      enabled: {
        type: Boolean,
        default: false,
      },
      webhookUrl: {
        type: String,
        default: '',
      },
      secret: {
        type: String,
        default: '',
      },
      interfaceChange: {
        type: Boolean,
        default: true,
      },
      testFailed: {
        type: Boolean,
        default: true,
      },
      projectUpdate: {
        type: Boolean,
        default: false,
      },
      system: {
        type: Boolean,
        default: true,
      },
    },
    dingtalk: {
      enabled: {
        type: Boolean,
        default: false,
      },
      webhookUrl: {
        type: String,
        default: '',
      },
      secret: {
        type: String,
        default: '',
      },
      interfaceChange: {
        type: Boolean,
        default: true,
      },
      testFailed: {
        type: Boolean,
        default: true,
      },
      projectUpdate: {
        type: Boolean,
        default: false,
      },
      system: {
        type: Boolean,
        default: true,
      },
    },
    slack: {
      enabled: {
        type: Boolean,
        default: false,
      },
      webhookUrl: {
        type: String,
        default: '',
      },
      channel: {
        type: String,
        default: '',
      },
      interfaceChange: {
        type: Boolean,
        default: true,
      },
      testFailed: {
        type: Boolean,
        default: true,
      },
      projectUpdate: {
        type: Boolean,
        default: false,
      },
      system: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

const NotificationSettings = mongoose.model('NotificationSettings', notificationSettingsSchema);

export default NotificationSettings;

