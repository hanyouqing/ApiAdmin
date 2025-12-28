import mongoose from 'mongoose';

const interfaceCatSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.ObjectId,
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

const InterfaceCat = mongoose.model('InterfaceCat', interfaceCatSchema);

export default InterfaceCat;

