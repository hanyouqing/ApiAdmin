import mongoose, { Schema, Model } from 'mongoose';
import crypto from 'crypto';
import { hashToken } from '../Utils/security.js';

export interface ICLIToken {
  token?: string;
  tokenHash: string;
  tokenPrefix: string;
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
  hashToken(token: string): string;
}

export type CLITokenModel = Model<ICLIToken, {}, ICLITokenMethods> & ICLITokenStatics;

const cliTokenSchema = new Schema<ICLIToken, CLITokenModel, ICLITokenMethods>(
  {
    token: {
      type: String,
      required: false,
      sparse: true,
      unique: true,
      select: false,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenPrefix: {
      type: String,
      required: true,
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

cliTokenSchema.index({ projectId: 1 });

cliTokenSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

cliTokenSchema.statics.hashToken = function (token: string) {
  return hashToken(token);
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
