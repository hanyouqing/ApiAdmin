import mongoose from 'mongoose';
import crypto from 'crypto';

const projectTokenSchema = new mongoose.Schema(
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

projectTokenSchema.index({ projectId: 1 });
projectTokenSchema.index({ token: 1 });

projectTokenSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
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

const ProjectToken = mongoose.model('ProjectToken', projectTokenSchema);

export default ProjectToken;

