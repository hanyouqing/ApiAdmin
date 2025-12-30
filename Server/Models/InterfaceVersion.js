import mongoose from 'mongoose';

/**
 * 接口版本模型
 * 用于存储接口的历史版本，支持版本对比和回滚
 */
const interfaceVersionSchema = new mongoose.Schema(
  {
    interface_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interface',
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
    path: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    req_query: {
      type: Array,
      default: [],
    },
    req_headers: {
      type: Array,
      default: [],
    },
    req_body_type: {
      type: String,
      enum: ['json', 'form', 'file', 'raw'],
      default: 'json',
    },
    req_body: {
      type: String,
      default: '',
    },
    req_body_form: {
      type: Array,
      default: [],
    },
    res_body_type: {
      type: String,
      enum: ['json', 'raw'],
      default: 'json',
    },
    res_body: {
      type: String,
      default: '',
    },
    openapi_spec: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    graphql_schema: {
      type: String,
      default: null,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    change_summary: {
      type: String,
      default: '',
    },
    change_type: {
      type: String,
      enum: ['create', 'update', 'delete', 'major', 'minor', 'patch'],
      default: 'update',
    },
    is_current: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: Array,
      default: [],
    },
    status: {
      type: String,
      enum: ['developing', 'testing', 'completed', 'deprecated'],
      default: 'developing',
    },
  },
  {
    timestamps: true,
  }
);

interfaceVersionSchema.index({ interface_id: 1, version_number: -1 });
interfaceVersionSchema.index({ interface_id: 1, is_current: 1 });
interfaceVersionSchema.index({ created_by: 1 });

const InterfaceVersion = mongoose.model('InterfaceVersion', interfaceVersionSchema);

export default InterfaceVersion;

