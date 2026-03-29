import mongoose, { Schema, Model } from 'mongoose';

export interface IMockExpectation {
  interface_id: Schema.Types.ObjectId;
  project_id: Schema.Types.ObjectId;
  name: string;
  ip_filter: string;
  query_filter: any;
  body_filter: any;
  response: {
    status_code: number;
    delay: number;
    headers: any;
    body: string;
  };
  enabled: boolean;
  priority: number;
  uid: Schema.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export type MockExpectationModel = Model<IMockExpectation>;

const mockExpectationSchema = new Schema<IMockExpectation>(
  {
    interface_id: {
      type: Schema.Types.ObjectId,
      ref: 'Interface',
      required: true,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    ip_filter: {
      type: String,
      default: '',
    },
    query_filter: {
      type: Schema.Types.Mixed,
      default: {},
    },
    body_filter: {
      type: Schema.Types.Mixed,
      default: {},
    },
    response: {
      status_code: {
        type: Number,
        default: 200,
      },
      delay: {
        type: Number,
        default: 0,
      },
      headers: {
        type: Schema.Types.Mixed,
        default: {},
      },
      body: {
        type: String,
        default: '{}',
      },
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    priority: {
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

mockExpectationSchema.index({ interface_id: 1, priority: -1, enabled: 1 });
mockExpectationSchema.index({ project_id: 1 });

const MockExpectation = mongoose.model<IMockExpectation, MockExpectationModel>('MockExpectation', mockExpectationSchema);

export default MockExpectation;
