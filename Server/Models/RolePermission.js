import mongoose from 'mongoose';

const rolePermissionSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['super_admin', 'group_leader', 'project_leader', 'developer', 'guest'],
      required: true,
      unique: true,
    },
    permissions: {
      // 系统管理权限
      manage_users: {
        type: Boolean,
        default: false,
      },
      manage_system: {
        type: Boolean,
        default: false,
      },
      view_all_groups: {
        type: Boolean,
        default: false,
      },
      manage_all_groups: {
        type: Boolean,
        default: false,
      },
      view_all_projects: {
        type: Boolean,
        default: false,
      },
      manage_all_projects: {
        type: Boolean,
        default: false,
      },
      // SSO 和第三方登录
      manage_sso: {
        type: Boolean,
        default: false,
      },
      manage_whitelist: {
        type: Boolean,
        default: false,
      },
      // 邮件和通知
      manage_email: {
        type: Boolean,
        default: false,
      },
      // 插件系统
      manage_plugins: {
        type: Boolean,
        default: false,
      },
      // 监控和日志
      view_monitor: {
        type: Boolean,
        default: false,
      },
      view_logs: {
        type: Boolean,
        default: false,
      },
      // CI/CD
      manage_cicd: {
        type: Boolean,
        default: false,
      },
      // 项目相关权限
      manage_projects: {
        type: Boolean,
        default: false,
      },
      view_projects: {
        type: Boolean,
        default: true,
      },
      // 接口相关权限
      manage_interfaces: {
        type: Boolean,
        default: false,
      },
      view_interfaces: {
        type: Boolean,
        default: true,
      },
      // 环境相关权限
      manage_environments: {
        type: Boolean,
        default: false,
      },
      // 数据导入导出权限
      import_data: {
        type: Boolean,
        default: false,
      },
      export_data: {
        type: Boolean,
        default: false,
      },
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// 初始化默认角色权限
rolePermissionSchema.statics.initDefaultPermissions = async function () {
  const defaultPermissions = {
    super_admin: {
      manage_users: true,
      manage_system: true,
      view_all_groups: true,
      manage_all_groups: true,
      view_all_projects: true,
      manage_all_projects: true,
      manage_sso: true,
      manage_whitelist: true,
      manage_email: true,
      manage_plugins: true,
      view_monitor: true,
      view_logs: true,
      manage_cicd: true,
      manage_projects: true,
      view_projects: true,
      manage_interfaces: true,
      view_interfaces: true,
      manage_environments: true,
      import_data: true,
      export_data: true,
      description: '超级管理员，拥有所有权限',
    },
    group_leader: {
      manage_users: false,
      manage_system: false,
      view_all_groups: true,
      manage_all_groups: false,
      view_all_projects: true,
      manage_all_projects: false,
      manage_sso: false,
      manage_whitelist: false,
      manage_email: false,
      manage_plugins: false,
      view_monitor: true,
      view_logs: true,
      manage_cicd: false,
      manage_projects: true,
      view_projects: true,
      manage_interfaces: true,
      view_interfaces: true,
      manage_environments: true,
      import_data: true,
      export_data: true,
      description: '分组负责人，可以管理自己分组内的项目和成员',
    },
    project_leader: {
      manage_users: false,
      manage_system: false,
      view_all_groups: false,
      manage_all_groups: false,
      view_all_projects: false,
      manage_all_projects: false,
      manage_sso: false,
      manage_whitelist: false,
      manage_email: false,
      manage_plugins: false,
      view_monitor: false,
      view_logs: false,
      manage_cicd: false,
      manage_projects: true,
      view_projects: true,
      manage_interfaces: true,
      view_interfaces: true,
      manage_environments: true,
      import_data: true,
      export_data: true,
      description: '项目负责人，可以管理自己负责的项目',
    },
    developer: {
      manage_users: false,
      manage_system: false,
      view_all_groups: false,
      manage_all_groups: false,
      view_all_projects: false,
      manage_all_projects: false,
      manage_sso: false,
      manage_whitelist: false,
      manage_email: false,
      manage_plugins: false,
      view_monitor: false,
      view_logs: false,
      manage_cicd: false,
      manage_projects: false,
      view_projects: true,
      manage_interfaces: true,
      view_interfaces: true,
      manage_environments: false,
      import_data: true,
      export_data: true,
      description: '开发者，可以查看和编辑自己参与的项目',
    },
    guest: {
      manage_users: false,
      manage_system: false,
      view_all_groups: false,
      manage_all_groups: false,
      view_all_projects: false,
      manage_all_projects: false,
      manage_sso: false,
      manage_whitelist: false,
      manage_email: false,
      manage_plugins: false,
      view_monitor: false,
      view_logs: false,
      manage_cicd: false,
      manage_projects: false,
      view_projects: true,
      manage_interfaces: false,
      view_interfaces: true,
      manage_environments: false,
      import_data: false,
      export_data: false,
      description: '访客，只能查看公开内容',
    },
  };

  for (const [role, perms] of Object.entries(defaultPermissions)) {
    await this.findOneAndUpdate(
      { role },
      { $set: { role, ...perms } },
      { upsert: true, new: true }
    );
  }
};

const RolePermission = mongoose.model('RolePermission', rolePermissionSchema);

export default RolePermission;

