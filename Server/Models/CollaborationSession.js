import mongoose from 'mongoose';

/**
 * 实时协作会话模型
 * 用于管理多用户实时编辑会话
 */
const collaborationSessionSchema = new mongoose.Schema(
  {
    interface_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interface',
      required: true,
      index: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    active_users: [
      {
        user_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        username: {
          type: String,
          required: true,
        },
        cursor_position: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
        selection: {
          type: mongoose.Schema.Types.Mixed,
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

const CollaborationSession = mongoose.model('CollaborationSession', collaborationSessionSchema);

export default CollaborationSession;

