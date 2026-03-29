import mongoose, { Schema, Model } from 'mongoose';

export interface ITestCollection {
  name: string;
  description: string;
  project_id: Schema.Types.ObjectId;
  test_cases: Schema.Types.ObjectId[];
  uid: Schema.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export type TestCollectionModel = Model<ITestCollection>;

const testCollectionSchema = new Schema<ITestCollection>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    test_cases: [
      {
        type: Schema.Types.ObjectId,
        ref: 'TestCase',
      },
    ],
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

testCollectionSchema.index({ project_id: 1, created_at: -1 });
testCollectionSchema.index({ uid: 1 });

const TestCollection = mongoose.model<ITestCollection, TestCollectionModel>('TestCollection', testCollectionSchema);

export default TestCollection;
