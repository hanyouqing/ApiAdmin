import mongoose from 'mongoose';

const thirdPartyAuthConfigSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ['github', 'gitlab', 'google', 'wechat', 'phone', 'email'],
      required: true,
      unique: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    config: {
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

thirdPartyAuthConfigSchema.index({ provider: 1 });
thirdPartyAuthConfigSchema.index({ enabled: 1 });

const ThirdPartyAuthConfig = mongoose.model('ThirdPartyAuthConfig', thirdPartyAuthConfigSchema);

export default ThirdPartyAuthConfig;

