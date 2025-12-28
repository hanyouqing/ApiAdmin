import mongoose from 'mongoose';

const groupMemberSchema = new mongoose.Schema(
  {
    group_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
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
      enum: ['owner', 'admin', 'member'],
      default: 'member',
      required: true,
    },
    permissions: {
      // 分组级别权限
      view_group: {
        type: Boolean,
        default: true,
      },
      edit_group: {
        type: Boolean,
        default: false,
      },
      delete_group: {
        type: Boolean,
        default: false,
      },
      manage_members: {
        type: Boolean,
        default: false,
      },
      // 项目权限
      create_project: {
        type: Boolean,
        default: false,
      },
      view_all_projects: {
        type: Boolean,
        default: true,
      },
      manage_all_projects: {
        type: Boolean,
        default: false,
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

// 确保每个用户在分组中只有一条记录
groupMemberSchema.index({ group_id: 1, user_id: 1 }, { unique: true });
groupMemberSchema.index({ user_id: 1, role: 1 });

// 根据角色设置默认权限
groupMemberSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('role')) {
    const rolePermissions = {
      owner: {
        view_group: true,
        edit_group: true,
        delete_group: true,
        manage_members: true,
        create_project: true,
        view_all_projects: true,
        manage_all_projects: true,
      },
      admin: {
        view_group: true,
        edit_group: true,
        delete_group: false,
        manage_members: true,
        create_project: true,
        view_all_projects: true,
        manage_all_projects: true,
      },
      member: {
        view_group: true,
        edit_group: false,
        delete_group: false,
        manage_members: false,
        create_project: false,
        view_all_projects: true,
        manage_all_projects: false,
      },
    };

    const defaultPerms = rolePermissions[this.role] || rolePermissions.member;
    Object.assign(this.permissions, defaultPerms);
  }
  next();
});

const GroupMember = mongoose.model('GroupMember', groupMemberSchema);

export default GroupMember;

