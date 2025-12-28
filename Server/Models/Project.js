import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    project_name: {
      type: String,
      required: true,
      trim: true,
    },
    project_desc: {
      type: String,
      default: '',
    },
    group_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    uid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    icon: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '#1890ff',
    },
    basepath: {
      type: String,
      default: '',
    },
    member: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    env: [
      {
        name: String,
        host: String,
        variables: mongoose.Schema.Types.Mixed,
      },
    ],
    tag: [
      {
        name: String,
        desc: String,
      },
    ],
    mock_strict: {
      type: Boolean,
      default: false,
    },
    enable_json5: {
      type: Boolean,
      default: false,
    },
    token: {
      type: String,
      default: '',
    },
    mock_script: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

projectSchema.index({ uid: 1 });
projectSchema.index({ member: 1 });
projectSchema.index({ created_at: -1 });
projectSchema.index({ project_name: 1 });

const Project = mongoose.model('Project', projectSchema);

export default Project;

