import mongoose, { Schema, Model } from 'mongoose';
import crypto from 'crypto';
import { hashToken } from '../Utils/security.js';

export interface IProjectToken {
  token?: string;
  tokenHash: string;
  tokenPrefix: string;
  name: string;
  projectId: Schema.Types.ObjectId;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectTokenMethods {
  isExpired(): boolean;
  updateLastUsed(): Promise<void>;
}

export interface IProjectTokenStatics {
  generateToken(): string;
  hashToken(token: string): string;
}

export type ProjectTokenModel = Model<IProjectToken, {}, IProjectTokenMethods> & IProjectTokenStatics;

const projectTokenSchema = new Schema<IProjectToken, ProjectTokenModel, IProjectTokenMethods>(
  {
    // Legacy plaintext field (optional, for migration only; new tokens omit this)
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
      required: true,
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

projectTokenSchema.index({ projectId: 1 });

projectTokenSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

projectTokenSchema.statics.hashToken = function (token: string) {
  return hashToken(token);
};

projectTokenSchema.methods.isExpired = function () {
  if (!this.expiresAt) {
    return false;
  }
  return new Date() > this.expiresAt;
};

projectTokenSchema.methods.updateLastUsed = async function () {
  this.lastUsedAt = new Date();
  await this.save();
};

const ProjectToken = mongoose.model<IProjectToken, ProjectTokenModel>('ProjectToken', projectTokenSchema);

export default ProjectToken;
