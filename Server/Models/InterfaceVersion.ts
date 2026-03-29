import mongoose, { Schema, Model } from 'mongoose';
import { InterfaceMethod, ReqBodyType, ResBodyType, InterfaceStatus } from './Interface.js';

export type InterfaceChangeType = 'create' | 'update' | 'delete' | 'major' | 'minor' | 'patch';

export interface IInterfaceVersion {
  interface_id: Schema.Types.ObjectId;
  version: string;
  version_number: number;
  title: string;
  path: string;
  method: InterfaceMethod;
  description: string;
  req_query: any[];
  req_headers: any[];
  req_body_type: ReqBodyType;
  req_body: string;
  req_body_form: any[];
  res_body_type: ResBodyType;
  res_body: string;
  openapi_spec: any;
  graphql_schema: string | null;
  created_by: Schema.Types.ObjectId;
  change_summary: string;
  change_type: InterfaceChangeType;
  is_current: boolean;
  tags: any[];
  status: InterfaceStatus | 'testing' | 'completed' | 'deprecated';
  createdAt: Date;
  updatedAt: Date;
}

export type InterfaceVersionModel = Model<IInterfaceVersion>;

const interfaceVersionSchema = new Schema<IInterfaceVersion>(
  {
    interface_id: {
      type: Schema.Types.ObjectId,
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
      type: Array as any,
      default: [],
    },
    req_headers: {
      type: Array as any,
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
      type: Array as any,
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
      type: Schema.Types.Mixed,
      default: null,
    },
    graphql_schema: {
      type: String,
      default: null,
    },
    created_by: {
      type: Schema.Types.ObjectId,
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
      type: Array as any,
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

const InterfaceVersion = mongoose.model<IInterfaceVersion, InterfaceVersionModel>('InterfaceVersion', interfaceVersionSchema);

export default InterfaceVersion;
