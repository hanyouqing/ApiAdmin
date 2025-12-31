import mongoose from 'mongoose';

const projectMemberSchema = new mongoose.Schema(
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
    role: {
      type: String,
      enum: ['owner', 'admin', 'developer', 'viewer'],
      default: 'viewer',
      required: true,
    },
    permissions: {
      // 项目级别权限
      view_project: {
        type: Boolean,
        default: true,
      },
      edit_project: {
        type: Boolean,
        default: false,
      },
      delete_project: {
        type: Boolean,
        default: false,
      },
      manage_members: {
        type: Boolean,
        default: false,
      },
      // 接口权限
      view_interface: {
        type: Boolean,
        default: true,
      },
      add_interface: {
        type: Boolean,
        default: false,
      },
      edit_interface: {
        type: Boolean,
        default: false,
      },
      delete_interface: {
        type: Boolean,
        default: false,
      },
      // Mock 权限
      view_mock: {
        type: Boolean,
        default: true,
      },
      manage_mock: {
        type: Boolean,
        default: false,
      },
      // 测试权限
      view_test: {
        type: Boolean,
        default: true,
      },
      run_test: {
        type: Boolean,
        default: false,
      },
      manage_test: {
        type: Boolean,
        default: false,
      },
      // 导入导出权限
      import_data: {
        type: Boolean,
        default: false,
      },
      export_data: {
        type: Boolean,
        default: true,
      },
    },
    invited_by: {
      type: mongoose.Schema.Types.ObjectId,
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

// 确保每个用户在项目中只有一条记录
projectMemberSchema.index({ project_id: 1, user_id: 1 }, { unique: true });
projectMemberSchema.index({ user_id: 1, role: 1 });

// 根据角色设置默认权限
projectMemberSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('role')) {
    const rolePermissions = {
      owner: {
        view_project: true,
        edit_project: true,
        delete_project: true,
        manage_members: true,
        view_interface: true,
        add_interface: true,
        edit_interface: true,
        delete_interface: true,
        view_mock: true,
        manage_mock: true,
        view_test: true,
        run_test: true,
        manage_test: true,
        import_data: true,
        export_data: true,
      },
      admin: {
        view_project: true,
        edit_project: true,
        delete_project: false,
        manage_members: true,
        view_interface: true,
        add_interface: true,
        edit_interface: true,
        delete_interface: true,
        view_mock: true,
        manage_mock: true,
        view_test: true,
        run_test: true,
        manage_test: true,
        import_data: true,
        export_data: true,
      },
      developer: {
        view_project: true,
        edit_project: false,
        delete_project: false,
        manage_members: false,
        view_interface: true,
        add_interface: true,
        edit_interface: true,
        delete_interface: false,
        view_mock: true,
        manage_mock: false,
        view_test: true,
        run_test: true,
        manage_test: false,
        import_data: false,
        export_data: true,
      },
      viewer: {
        view_project: true,
        edit_project: false,
        delete_project: false,
        manage_members: false,
        view_interface: true,
        add_interface: false,
        edit_interface: false,
        delete_interface: false,
        view_mock: true,
        manage_mock: false,
        view_test: true,
        run_test: false,
        manage_test: false,
        import_data: false,
        export_data: true,
      },
    };

    const defaultPerms = rolePermissions[this.role] || rolePermissions.viewer;
    Object.assign(this.permissions, defaultPerms);
  }
  next();
});

const ProjectMember = mongoose.model('ProjectMember', projectMemberSchema);

export default ProjectMember;


