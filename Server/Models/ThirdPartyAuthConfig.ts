import mongoose, { Schema, Model } from 'mongoose';

export type ThirdPartyProvider = 'github' | 'gitlab' | 'google' | 'wechat' | 'phone' | 'email';

export interface IThirdPartyAuthConfig {
  provider: ThirdPartyProvider;
  enabled: boolean;
  config: any;
  updatedBy: Schema.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ThirdPartyAuthConfigModel = Model<IThirdPartyAuthConfig>;

const thirdPartyAuthConfigSchema = new Schema<IThirdPartyAuthConfig>(
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

thirdPartyAuthConfigSchema.index({ enabled: 1 });

const ThirdPartyAuthConfig = mongoose.model<IThirdPartyAuthConfig, ThirdPartyAuthConfigModel>('ThirdPartyAuthConfig', thirdPartyAuthConfigSchema);

export default ThirdPartyAuthConfig;
