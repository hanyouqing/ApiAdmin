import mongoose, { Schema, Model } from 'mongoose';
import crypto from 'crypto';

export interface IPasswordReset {
  userId: Schema.Types.ObjectId;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPasswordResetStatics {
  generateToken(): string;
  createResetToken(userId: Schema.Types.ObjectId): Promise<string>;
  validateToken(token: string): Promise<mongoose.HydratedDocument<IPasswordReset> | null>;
}

export type PasswordResetModel = Model<IPasswordReset, {}, IPasswordResetStatics>;

const passwordResetSchema = new Schema<IPasswordReset, PasswordResetModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
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
  // @ts-ignore
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

const PasswordReset = mongoose.model<IPasswordReset, PasswordResetModel>('PasswordReset', passwordResetSchema);

export default PasswordReset;
