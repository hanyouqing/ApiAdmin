import mongoose, { Schema, Model } from 'mongoose';

export interface IDocumentVersion {
  project_id: Schema.Types.ObjectId;
  version: string;
  version_number: number;
  title: string;
  description: string;
  content: any;
  openapi_spec: any;
  published: boolean;
  published_at: Date | null;
  published_by: Schema.Types.ObjectId | null;
  is_current: boolean;
  change_summary: string;
  created_by: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentVersionModel = Model<IDocumentVersion>;

const documentVersionSchema = new Schema<IDocumentVersion>(
  {
    project_id: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.Mixed,
      required: true,
    },
    openapi_spec: {
      type: Schema.Types.Mixed,
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
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
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

const DocumentVersion = mongoose.model<IDocumentVersion, DocumentVersionModel>('DocumentVersion', documentVersionSchema);

export default DocumentVersion;
