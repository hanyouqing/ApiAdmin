import mongoose, { Schema, Model } from 'mongoose';

export interface IProjectEnv {
  name: string;
  host: string;
  variables?: any;
}

export interface IProjectTag {
  name: string;
  desc?: string;
}

export interface IProject {
  project_name: string;
  project_desc: string;
  group_id: Schema.Types.ObjectId;
  uid: Schema.Types.ObjectId;
  icon: string;
  color: string;
  basepath: string;
  member: Schema.Types.ObjectId[];
  env: IProjectEnv[];
  tag: IProjectTag[];
  mock_strict: boolean;
  enable_json5: boolean;
  token: string;
  mock_script: string;
  created_at: Date;
  updated_at: Date;
}

export type ProjectModel = Model<IProject>;

const projectSchema = new Schema<IProject>(
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
      type: Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true,
    },
    uid: {
      type: Schema.Types.ObjectId,
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
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    env: [
      {
        name: String,
        host: String,
        variables: Schema.Types.Mixed,
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

const Project = mongoose.model<IProject, ProjectModel>('Project', projectSchema);

export default Project;
