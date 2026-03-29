import mongoose, { Schema, Model } from 'mongoose';

export type CodeRepositoryProvider = 'github' | 'gitlab' | 'gitee' | 'bitbucket' | 'custom';
export type CodeRepositoryAuthType = 'token' | 'ssh';

export interface ICodeRepository {
  project_id: Schema.Types.ObjectId;
  provider: CodeRepositoryProvider;
  repository_url: string;
  branch: string;
  auth_type: CodeRepositoryAuthType;
  access_token: string;
  ssh_private_key: string;
  ssh_private_key_password?: string;
  ssh_public_key?: string;
  username: string;
  enabled: boolean;
  webhook_secret: string;
  auto_sync: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CodeRepositoryModel = Model<ICodeRepository>;

const codeRepositorySchema = new Schema<ICodeRepository>(
  {
    project_id: {
      type: Schema.Types.ObjectId,
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

const CodeRepository = mongoose.model<ICodeRepository, CodeRepositoryModel>('CodeRepository', codeRepositorySchema);

export default CodeRepository;
