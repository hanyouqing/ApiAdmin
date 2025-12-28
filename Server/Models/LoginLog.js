import mongoose from 'mongoose';

const loginLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      default: '',
    },
    loginType: {
      type: String,
      enum: ['password', 'phone', 'email', 'sso', 'github', 'gitlab', 'gmail', 'wechat', 'other'],
      default: 'password',
      index: true,
    },
    provider: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['success', 'failed'],
      required: true,
      index: true,
    },
    failureReason: {
      type: String,
      default: '',
    },
    ip: {
      type: String,
      default: '',
      index: true,
    },
    userAgent: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

loginLogSchema.index({ userId: 1, createdAt: -1 });
loginLogSchema.index({ status: 1, createdAt: -1 });
loginLogSchema.index({ loginType: 1, createdAt: -1 });
loginLogSchema.index({ createdAt: -1 });

const LoginLog = mongoose.model('LoginLog', loginLogSchema);

export default LoginLog;

