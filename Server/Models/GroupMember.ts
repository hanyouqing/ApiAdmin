import mongoose, { Schema, Model } from 'mongoose';

export type GroupMemberRole = 'owner' | 'admin' | 'member';

export interface IGroupPermissions {
  view_group: boolean;
  edit_group: boolean;
  delete_group: boolean;
  manage_members: boolean;
  create_project: boolean;
  view_all_projects: boolean;
  manage_all_projects: boolean;
}

export interface IGroupMember {
  group_id: Schema.Types.ObjectId;
  user_id: Schema.Types.ObjectId;
  role: GroupMemberRole;
  permissions: IGroupPermissions;
  invited_by: Schema.Types.ObjectId | null;
  joined_at: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type GroupMemberModel = Model<IGroupMember>;

const groupMemberSchema = new Schema<IGroupMember>(
  {
    group_id: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
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
      enum: ['owner', 'admin', 'member'],
      default: 'member',
      required: true,
    },
    permissions: {
      view_group: { type: Boolean, default: true },
      edit_group: { type: Boolean, default: false },
      delete_group: { type: Boolean, default: false },
      manage_members: { type: Boolean, default: false },
      create_project: { type: Boolean, default: false },
      view_all_projects: { type: Boolean, default: true },
      manage_all_projects: { type: Boolean, default: false },
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

groupMemberSchema.index({ group_id: 1, user_id: 1 }, { unique: true });
groupMemberSchema.index({ user_id: 1, role: 1 });

groupMemberSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('role')) {
    const rolePermissions: Record<GroupMemberRole, IGroupPermissions> = {
      owner: {
        view_group: true, edit_group: true, delete_group: true, manage_members: true,
        create_project: true, view_all_projects: true, manage_all_projects: true,
      },
      admin: {
        view_group: true, edit_group: true, delete_group: false, manage_members: true,
        create_project: true, view_all_projects: true, manage_all_projects: true,
      },
      member: {
        view_group: true, edit_group: false, delete_group: false, manage_members: false,
        create_project: false, view_all_projects: true, manage_all_projects: false,
      },
    };

    const defaultPerms = rolePermissions[this.role as GroupMemberRole] || rolePermissions.member;
    Object.assign(this.permissions, defaultPerms);
  }
  next();
});

const GroupMember = mongoose.model<IGroupMember, GroupMemberModel>('GroupMember', groupMemberSchema);

export default GroupMember;
