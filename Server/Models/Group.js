import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema(
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    member: [
      {
        type: mongoose.Schema.Types.ObjectId,
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

const Group = mongoose.model('Group', groupSchema);

export default Group;

