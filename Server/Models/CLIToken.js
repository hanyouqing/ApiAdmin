import mongoose from 'mongoose';
import crypto from 'crypto';

const cliTokenSchema = new mongoose.Schema(
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
      type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.ObjectId,
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

const CLIToken = mongoose.model('CLIToken', cliTokenSchema);

export default CLIToken;


