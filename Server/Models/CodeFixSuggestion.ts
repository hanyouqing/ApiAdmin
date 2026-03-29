import mongoose, { Schema, Model } from 'mongoose';

export type CodeFixStatus = 'pending' | 'reviewed' | 'applied' | 'rejected' | 'merged';

export interface ICodeFixSuggestion {
  test_result_id: Schema.Types.ObjectId;
  project_id: Schema.Types.ObjectId;
  file_path: string;
  original_code: string;
  fixed_code: string;
  analysis: string;
  suggestions: string[];
  confidence: number;
  status: CodeFixStatus;
  pr_url: string;
  pr_number: number | null;
  mr_url: string;
  mr_iid: number | null;
  created_by: Schema.Types.ObjectId;
  reviewed_by: Schema.Types.ObjectId | null;
  reviewed_at: Date | null;
  applied_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CodeFixSuggestionModel = Model<ICodeFixSuggestion>;

const codeFixSuggestionSchema = new Schema<ICodeFixSuggestion>(
  {
    test_result_id: {
      type: Schema.Types.ObjectId,
      ref: 'AutoTestResult',
      required: true,
      index: true,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    file_path: {
      type: String,
      required: true,
    },
    original_code: {
      type: String,
      required: true,
    },
    fixed_code: {
      type: String,
      required: true,
    },
    analysis: {
      type: String,
      required: true,
    },
    suggestions: {
      type: [String],
      default: [],
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'applied', 'rejected', 'merged'],
      default: 'pending',
      index: true,
    },
    pr_url: {
      type: String,
      default: '',
    },
    pr_number: {
      type: Number,
      default: null,
    },
    mr_url: {
      type: String,
      default: '',
    },
    mr_iid: {
      type: Number,
      default: null,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewed_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewed_at: {
      type: Date,
      default: null,
    },
    applied_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

codeFixSuggestionSchema.index({ test_result_id: 1, status: 1 });
codeFixSuggestionSchema.index({ project_id: 1, status: 1 });
codeFixSuggestionSchema.index({ created_at: -1 });

const CodeFixSuggestion = mongoose.model<ICodeFixSuggestion, CodeFixSuggestionModel>('CodeFixSuggestion', codeFixSuggestionSchema);

export default CodeFixSuggestion;
