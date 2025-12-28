import mongoose from 'mongoose';

const projectFollowSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

projectFollowSchema.index({ userId: 1, projectId: 1 }, { unique: true });

const ProjectFollow = mongoose.model('ProjectFollow', projectFollowSchema);

export default ProjectFollow;

