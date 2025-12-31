import mongoose from 'mongoose';
import crypto from 'crypto';

const passwordResetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

passwordResetSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

passwordResetSchema.statics.createResetToken = async function (userId) {
  const token = this.generateToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);

  const resetToken = new this({
    userId,
    token,
    expiresAt,
  });

  await resetToken.save();
  return token;
};

passwordResetSchema.statics.validateToken = async function (token) {
  const resetToken = await this.findOne({
    token,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!resetToken) {
    return null;
  }

  return resetToken;
};

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

export default PasswordReset;


