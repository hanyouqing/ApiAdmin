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
  },
  {
    timestamps: true,
  }
);

const NotificationSettings = mongoose.model('NotificationSettings', notificationSettingsSchema);

export default NotificationSettings;

