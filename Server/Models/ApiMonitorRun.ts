import mongoose, { Schema, Model } from 'mongoose';

export interface IApiMonitorRun {
  monitor_id: Schema.Types.ObjectId;
  project_id: Schema.Types.ObjectId;
  status: 'passing' | 'failing' | 'error';
  request: any;
  response: any;
  assertions: any;
  message: string;
  duration: number;
  run_at: Date;
}

export type ApiMonitorRunModel = Model<IApiMonitorRun>;

const apiMonitorRunSchema = new Schema<IApiMonitorRun>(
  {
    monitor_id: {
      type: Schema.Types.ObjectId,
      ref: 'ApiMonitor',
      required: true,
      index: true,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['passing', 'failing', 'error'],
      required: true,
    },
    request: { type: Schema.Types.Mixed, default: {} },
    response: { type: Schema.Types.Mixed, default: {} },
    assertions: { type: Schema.Types.Mixed, default: {} },
    message: { type: String, default: '' },
    duration: { type: Number, default: 0 },
    run_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

apiMonitorRunSchema.index({ monitor_id: 1, run_at: -1 });

const ApiMonitorRun = mongoose.model<IApiMonitorRun, ApiMonitorRunModel>(
  'ApiMonitorRun',
  apiMonitorRunSchema
);

export default ApiMonitorRun;
