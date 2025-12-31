import mongoose from 'mongoose';

/**
 * 文档版本模型
 * 用于管理交互式文档的版本
 */
const documentVersionSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    version: {
      type: String,
      required: true,
      default: '1.0.0',
    },
    version_number: {
      type: Number,
      required: true,
      default: 1,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    openapi_spec: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    published: {
      type: Boolean,
      default: false,
    },
    published_at: {
      type: Date,
      default: null,
    },
    published_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    is_current: {
      type: Boolean,
      default: false,
    },
    change_summary: {
      type: String,
      default: '',
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

documentVersionSchema.index({ project_id: 1, version_number: -1 });
documentVersionSchema.index({ project_id: 1, is_current: 1 });
documentVersionSchema.index({ project_id: 1, published: 1 });

const DocumentVersion = mongoose.model('DocumentVersion', documentVersionSchema);

export default DocumentVersion;


