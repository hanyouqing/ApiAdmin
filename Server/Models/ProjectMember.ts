import mongoose, { Schema, Model } from 'mongoose';

export type ProjectMemberRole = 'owner' | 'admin' | 'developer' | 'viewer';

export interface IProjectPermissions {
  view_project: boolean;
  edit_project: boolean;
  delete_project: boolean;
  manage_members: boolean;
  view_interface: boolean;
  add_interface: boolean;
  edit_interface: boolean;
  delete_interface: boolean;
  view_mock: boolean;
  manage_mock: boolean;
  view_test: boolean;
  run_test: boolean;
  manage_test: boolean;
  import_data: boolean;
  export_data: boolean;
}

export interface IProjectMember {
  project_id: Schema.Types.ObjectId;
  user_id: Schema.Types.ObjectId;
  role: ProjectMemberRole;
  permissions: IProjectPermissions;
  invited_by: Schema.Types.ObjectId | null;
  joined_at: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectMemberModel = Model<IProjectMember>;

const projectMemberSchema = new Schema<IProjectMember>(
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
    role: {
      type: String,
      enum: ['owner', 'admin', 'developer', 'viewer'],
      default: 'viewer',
      required: true,
    },
    permissions: {
      view_project: { type: Boolean, default: true },
      edit_project: { type: Boolean, default: false },
      delete_project: { type: Boolean, default: false },
      manage_members: { type: Boolean, default: false },
      view_interface: { type: Boolean, default: true },
      add_interface: { type: Boolean, default: false },
      edit_interface: { type: Boolean, default: false },
      delete_interface: { type: Boolean, default: false },
      view_mock: { type: Boolean, default: true },
      manage_mock: { type: Boolean, default: false },
      view_test: { type: Boolean, default: true },
      run_test: { type: Boolean, default: false },
      manage_test: { type: Boolean, default: false },
      import_data: { type: Boolean, default: false },
      export_data: { type: Boolean, default: true },
    },
    invited_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    joined_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

projectMemberSchema.index({ project_id: 1, user_id: 1 }, { unique: true });
projectMemberSchema.index({ user_id: 1, role: 1 });

projectMemberSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('role')) {
    const rolePermissions: Record<ProjectMemberRole, IProjectPermissions> = {
      owner: {
        view_project: true, edit_project: true, delete_project: true, manage_members: true,
        view_interface: true, add_interface: true, edit_interface: true, delete_interface: true,
        view_mock: true, manage_mock: true, view_test: true, run_test: true, manage_test: true,
        import_data: true, export_data: true,
      },
      admin: {
        view_project: true, edit_project: true, delete_project: false, manage_members: true,
        view_interface: true, add_interface: true, edit_interface: true, delete_interface: true,
        view_mock: true, manage_mock: true, view_test: true, run_test: true, manage_test: true,
        import_data: true, export_data: true,
      },
      developer: {
        view_project: true, edit_project: false, delete_project: false, manage_members: false,
        view_interface: true, add_interface: true, edit_interface: true, delete_interface: false,
        view_mock: true, manage_mock: false, view_test: true, run_test: true, manage_test: false,
        import_data: false, export_data: true,
      },
      viewer: {
        view_project: true, edit_project: false, delete_project: false, manage_members: false,
        view_interface: true, add_interface: false, edit_interface: false, delete_interface: false,
        view_mock: true, manage_mock: false, view_test: true, run_test: false, manage_test: false,
        import_data: false, export_data: true,
      },
    };

    const defaultPerms = rolePermissions[this.role as ProjectMemberRole] || rolePermissions.viewer;
    Object.assign(this.permissions, defaultPerms);
  }
  next();
});

const ProjectMember = mongoose.model<IProjectMember, ProjectMemberModel>('ProjectMember', projectMemberSchema);

export default ProjectMember;
