import mongoose, { Schema, Model } from 'mongoose';

export type ActivityAction = 
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'interface.created'
  | 'interface.updated'
  | 'interface.deleted'
  | 'interface.run'
  | 'member.added'
  | 'member.removed'
  | 'environment.added'
  | 'environment.updated'
  | 'environment.deleted';

export type ActivityTargetType = 'project' | 'interface' | 'member' | 'environment';

export interface IActivity {
  project_id: Schema.Types.ObjectId;
  user_id: Schema.Types.ObjectId;
  action: ActivityAction;
  target_type: ActivityTargetType;
  target_id: Schema.Types.ObjectId;
  description: string;
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

export type ActivityModel = Model<IActivity>;

const activitySchema = new Schema<IActivity>(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
    },
    description: {
      type: String,
      default: '',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

activitySchema.index({ project_id: 1, created_at: -1 });
activitySchema.index({ user_id: 1, created_at: -1 });

const Activity = mongoose.model<IActivity, ActivityModel>('Activity', activitySchema);

export default Activity;
