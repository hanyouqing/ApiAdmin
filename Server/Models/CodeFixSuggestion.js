import mongoose from 'mongoose';

const codeFixSuggestionSchema = new mongoose.Schema(
  {
    test_result_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AutoTestResult',
      required: true,
      index: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
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
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
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

const CodeFixSuggestion = mongoose.model('CodeFixSuggestion', codeFixSuggestionSchema);

export default CodeFixSuggestion;

