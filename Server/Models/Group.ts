import mongoose, { Schema, Model } from 'mongoose';

export interface IGroup {
  group_name: string;
  group_desc: string;
  uid: Schema.Types.ObjectId;
  member: Schema.Types.ObjectId[];
  created_at: Date;
  updated_at: Date;
}

export type GroupModel = Model<IGroup>;

const groupSchema = new Schema<IGroup>(
  {
    group_name: {
      type: String,
      required: true,
      trim: true,
    },
    group_desc: {
      type: String,
      default: '',
    },
    uid: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    member: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

groupSchema.index({ uid: 1 });
groupSchema.index({ member: 1 });
groupSchema.index({ created_at: -1 });

const Group = mongoose.model<IGroup, GroupModel>('Group', groupSchema);

export default Group;
