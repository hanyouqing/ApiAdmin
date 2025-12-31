import mongoose from 'mongoose';

const whitelistSchema = new mongoose.Schema(
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

whitelistSchema.index({ platform: 1, value: 1 }, { unique: true });
whitelistSchema.index({ platform: 1, enabled: 1 });

const Whitelist = mongoose.model('Whitelist', whitelistSchema);

export default Whitelist;


