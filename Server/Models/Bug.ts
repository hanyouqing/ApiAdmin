import mongoose, { Schema, Model } from 'mongoose';

export type BugStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';
export type BugSeverity = 'critical' | 'major' | 'minor' | 'trivial';
export type BugPriority = 'p0' | 'p1' | 'p2' | 'p3';

export interface IBugComment {
  user_id: Schema.Types.ObjectId;
  username: string;
  content: string;
  createdAt: Date;
}

export interface IBug {
  project_id: Schema.Types.ObjectId;
  number: number;
  title: string;
  description: string;
  status: BugStatus;
  severity: BugSeverity;
  priority: BugPriority;
  tags: string[];
  assignee_id: Schema.Types.ObjectId | null;
  reporter_id: Schema.Types.ObjectId;
  interface_id: Schema.Types.ObjectId | null;
  test_case_id: Schema.Types.ObjectId | null;
  auto_test_result_id: Schema.Types.ObjectId | null;
  monitor_id: Schema.Types.ObjectId | null;
  monitor_run_id: Schema.Types.ObjectId | null;
  external_url: string;
  comments: IBugComment[];
  deleted_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type BugModel = Model<IBug>;

const bugCommentSchema = new Schema<IBugComment>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, default: '' },
    content: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const bugSchema = new Schema<IBug>(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    number: { type: Number, required: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed', 'reopened'],
      default: 'open',
      index: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'major', 'minor', 'trivial'],
      default: 'major',
      index: true,
    },
    priority: {
      type: String,
      enum: ['p0', 'p1', 'p2', 'p3'],
      default: 'p2',
      index: true,
    },
    tags: { type: [String], default: [] },
    assignee_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reporter_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    interface_id: { type: Schema.Types.ObjectId, ref: 'Interface', default: null },
    test_case_id: { type: Schema.Types.ObjectId, ref: 'TestCase', default: null },
    auto_test_result_id: { type: Schema.Types.ObjectId, ref: 'AutoTestResult', default: null },
    monitor_id: { type: Schema.Types.ObjectId, ref: 'ApiMonitor', default: null },
    monitor_run_id: { type: Schema.Types.ObjectId, ref: 'ApiMonitorRun', default: null },
    external_url: { type: String, default: '' },
    comments: { type: [bugCommentSchema], default: [] },
    deleted_at: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

bugSchema.index({ project_id: 1, number: 1 }, { unique: true });
bugSchema.index({ project_id: 1, status: 1, updatedAt: -1 });
bugSchema.index({ project_id: 1, deleted_at: 1, updatedAt: -1 });
bugSchema.index({ assignee_id: 1, status: 1 });

const Bug = mongoose.model<IBug, BugModel>('Bug', bugSchema);

export default Bug;
