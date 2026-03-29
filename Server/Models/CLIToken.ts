import mongoose, { Schema, Model } from 'mongoose';
import crypto from 'crypto';

export interface ICLIToken {
  token: string;
  name: string;
  projectId: Schema.Types.ObjectId | null;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICLITokenMethods {
  isExpired(): boolean;
  updateLastUsed(): Promise<void>;
}

export interface ICLITokenStatics {
  generateToken(): string;
}

export type CLITokenModel = Model<ICLIToken, {}, ICLITokenMethods> & ICLITokenStatics;

const cliTokenSchema = new Schema<ICLIToken, CLITokenModel, ICLITokenMethods>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

cliTokenSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

cliTokenSchema.methods.isExpired = function () {
  if (!this.expiresAt) {
    return false;
  }
  return new Date() > this.expiresAt;
};

cliTokenSchema.methods.updateLastUsed = async function () {
  this.lastUsedAt = new Date();
  await this.save();
};

const CLIToken = mongoose.model<ICLIToken, CLITokenModel>('CLIToken', cliTokenSchema);

export default CLIToken;
