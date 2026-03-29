import mongoose, { Schema, Model } from 'mongoose';

export type WhitelistPlatform = 'github' | 'gitlab' | 'gmail' | 'wechat' | 'phone' | 'email';

export interface IWhitelist {
  platform: WhitelistPlatform;
  value: string;
  description: string;
  enabled: boolean;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type WhitelistModel = Model<IWhitelist>;

const whitelistSchema = new Schema<IWhitelist>(
  {
    platform: {
      type: String,
      enum: ['github', 'gitlab', 'gmail', 'wechat', 'phone', 'email'],
      required: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

whitelistSchema.index({ platform: 1, value: 1 }, { unique: true });
whitelistSchema.index({ platform: 1, enabled: 1 });

const Whitelist = mongoose.model<IWhitelist, WhitelistModel>('Whitelist', whitelistSchema);

export default Whitelist;
