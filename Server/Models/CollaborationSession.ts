import mongoose, { Schema, Model } from 'mongoose';

export interface IActiveUser {
  user_id: Schema.Types.ObjectId;
  username: string;
  cursor_position: any;
  selection: any;
  joined_at: Date;
}

export interface ICollaborationSession {
  interface_id: Schema.Types.ObjectId;
  project_id: Schema.Types.ObjectId;
  active_users: IActiveUser[];
  last_activity: Date;
  is_active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CollaborationSessionModel = Model<ICollaborationSession>;

const collaborationSessionSchema = new Schema<ICollaborationSession>(
  {
    interface_id: {
      type: Schema.Types.ObjectId,
      ref: 'Interface',
      required: true,
      index: true,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    active_users: [
      {
        user_id: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        username: {
          type: String,
          required: true,
        },
        cursor_position: {
          type: Schema.Types.Mixed,
          default: null,
        },
        selection: {
          type: Schema.Types.Mixed,
          default: null,
        },
        joined_at: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    last_activity: {
      type: Date,
      default: Date.now,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

collaborationSessionSchema.index({ interface_id: 1, is_active: 1 });
collaborationSessionSchema.index({ project_id: 1, is_active: 1 });

const CollaborationSession = mongoose.model<ICollaborationSession, CollaborationSessionModel>('CollaborationSession', collaborationSessionSchema);

export default CollaborationSession;
