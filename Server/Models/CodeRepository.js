import mongoose from 'mongoose';

const codeRepositorySchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      unique: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['github', 'gitlab', 'gitee', 'bitbucket', 'custom'],
      required: true,
    },
    repository_url: {
      type: String,
      required: true,
      trim: true,
    },
    branch: {
      type: String,
      default: 'main',
      trim: true,
    },
    auth_type: {
      type: String,
      enum: ['token', 'ssh'],
      default: 'token',
    },
    access_token: {
      type: String,
      default: '',
      trim: true,
    },
    ssh_private_key: {
      type: String,
      default: '',
      trim: true,
    },
    ssh_private_key_password: {
      type: String,
      default: '',
      trim: true,
    },
    ssh_public_key: {
      type: String,
      default: '',
      trim: true,
    },
    username: {
      type: String,
      default: '',
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    webhook_secret: {
      type: String,
      default: '',
    },
    auto_sync: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

codeRepositorySchema.index({ project_id: 1 });

const CodeRepository = mongoose.model('CodeRepository', codeRepositorySchema);

export default CodeRepository;

