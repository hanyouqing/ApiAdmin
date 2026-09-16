import mongoose, { Schema, Model } from 'mongoose';

export type MonitorOverallStatus = 'idle' | 'passing' | 'failing' | 'error';

export interface IApiMonitor {
  name: string;
  project_id: Schema.Types.ObjectId;
  description: string;
  request: {
    method: string;
    url: string;
    headers: Record<string, any>;
    body: any;
  };
  assertions: {
    status_code: number | null;
    body_contains: string;
    max_response_time_ms: number | null;
  };
  environment_id: Schema.Types.ObjectId | null;
  schedule: {
    enabled: boolean;
    cron: string;
    timezone: string;
  };
  notification: {
    enabled: boolean;
    on_failure: boolean;
    on_success: boolean;
    webhook_url: string;
    email_addresses: string[];
  };
  enabled: boolean;
  last_run_at: Date | null;
  last_status: MonitorOverallStatus;
  last_duration: number;
  last_message: string;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ApiMonitorModel = Model<IApiMonitor>;

const apiMonitorSchema = new Schema<IApiMonitor>(
  {
    name: { type: String, required: true, trim: true },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    description: { type: String, default: '' },
    request: {
      method: {
        type: String,
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
        default: 'GET',
      },
      url: { type: String, required: true },
      headers: { type: Schema.Types.Mixed, default: {} },
      body: { type: Schema.Types.Mixed, default: null },
    },
    assertions: {
      status_code: { type: Number, default: 200 },
      body_contains: { type: String, default: '' },
      max_response_time_ms: { type: Number, default: 5000 },
    },
    environment_id: {
      type: Schema.Types.ObjectId,
      ref: 'TestEnvironment',
      default: null,
    },
    schedule: {
      enabled: { type: Boolean, default: false },
      cron: { type: String, default: '*/5 * * * *' },
      timezone: { type: String, default: 'Asia/Shanghai' },
    },
    notification: {
      enabled: { type: Boolean, default: false },
      on_failure: { type: Boolean, default: true },
      on_success: { type: Boolean, default: false },
      webhook_url: { type: String, default: '' },
      email_addresses: { type: [String], default: [] },
    },
    enabled: { type: Boolean, default: true, index: true },
    last_run_at: { type: Date, default: null },
    last_status: {
      type: String,
      enum: ['idle', 'passing', 'failing', 'error'],
      default: 'idle',
      index: true,
    },
    last_duration: { type: Number, default: 0 },
    last_message: { type: String, default: '' },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

apiMonitorSchema.index({ project_id: 1, name: 1 }, { unique: true });
apiMonitorSchema.index({ 'schedule.enabled': 1, enabled: 1 });

const ApiMonitor = mongoose.model<IApiMonitor, ApiMonitorModel>('ApiMonitor', apiMonitorSchema);

export default ApiMonitor;
