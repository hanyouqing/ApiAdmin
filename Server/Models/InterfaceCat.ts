import mongoose, { Schema, Model } from 'mongoose';

export interface IInterfaceCat {
  project_id: Schema.Types.ObjectId;
  name: string;
  desc: string;
  index: number;
  uid: Schema.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export type InterfaceCatModel = Model<IInterfaceCat>;

const interfaceCatSchema = new Schema<IInterfaceCat>(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    desc: {
      type: String,
      default: '',
    },
    index: {
      type: Number,
      default: 0,
    },
    uid: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

interfaceCatSchema.index({ project_id: 1, index: 1 });
interfaceCatSchema.index({ project_id: 1, created_at: 1 });
interfaceCatSchema.index({ uid: 1 });

const InterfaceCat = mongoose.model<IInterfaceCat, InterfaceCatModel>('InterfaceCat', interfaceCatSchema);

export default InterfaceCat;
