import mongoose from 'mongoose';

const interfaceSchema = new mongoose.Schema(
  {
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      // 不使用 index: true，因为下面有复合索引包含 project_id
    },
    catid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterfaceCat',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    path: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
      required: true,
    },
    req_query: [
      {
        name: String,
        type: String,
        required: Boolean,
        default: String,
        desc: String,
        example: String,
      },
    ],
    req_headers: [
      {
        name: String,
        value: String,
        required: Boolean,
        desc: String,
      },
    ],
    req_body_type: {
      type: String,
      enum: ['form', 'json', 'file', 'raw'],
      default: 'json',
    },
    req_body_form: [
      {
        name: String,
        type: String,
        required: Boolean,
        default: String,
        desc: String,
      },
    ],
    req_body_other: {
      type: String,
      default: '',
    },
    req_body: {
      type: String,
      default: '',
    },
    res_body: {
      type: String,
      default: '',
    },
    res_body_type: {
      type: String,
      enum: ['json', 'raw'],
      default: 'json',
    },
    status: {
      type: String,
      enum: ['developing', 'developed', 'tested', 'online'],
      default: 'developing',
    },
    tag: [
      {
        type: String,
      },
    ],
    desc: {
      type: String,
      default: '',
    },
    markdown: {
      type: String,
      default: '',
    },
    mock_script: {
      type: String,
      default: '',
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

interfaceSchema.index({ project_id: 1, catid: 1 });
interfaceSchema.index({ project_id: 1, title: 1 });
interfaceSchema.index({ project_id: 1, method: 1 });
interfaceSchema.index({ uid: 1 });
interfaceSchema.index({ created_at: -1 });
interfaceSchema.index({ status: 1 });

const Interface = mongoose.model('Interface', interfaceSchema);

export default Interface;

