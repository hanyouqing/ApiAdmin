import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'project.created',
        'project.updated',
        'project.deleted',
        'interface.created',
        'interface.updated',
        'interface.deleted',
        'interface.run',
        'member.added',
        'member.removed',
        'environment.added',
        'environment.updated',
        'environment.deleted',
      ],
    },
    target_type: {
      type: String,
      enum: ['project', 'interface', 'member', 'environment'],
    },
    target_id: {
      type: mongoose.Schema.Types.ObjectId,
    },
    description: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

activitySchema.index({ project_id: 1, created_at: -1 });
activitySchema.index({ user_id: 1, created_at: -1 });

const Activity = mongoose.model('Activity', activitySchema);

export default Activity;

