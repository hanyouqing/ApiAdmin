import mongoose, { Schema, Model } from 'mongoose';

export interface IReqQuery {
  name: string;
  type?: string;
  required?: boolean;
  default?: string;
  desc?: string;
  example?: string;
}

export interface IReqHeader {
  name: string;
  value?: string;
  required?: boolean;
  desc?: string;
}

export interface IReqBodyForm {
  name: string;
  type?: string;
  required?: boolean;
  default?: string;
  desc?: string;
}

export type InterfaceMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
export type ReqBodyType = 'form' | 'json' | 'file' | 'raw';
export type ResBodyType = 'json' | 'raw';
export type InterfaceStatus = 'developing' | 'developed' | 'tested' | 'online';

export interface IInterface {
  project_id: Schema.Types.ObjectId;
  catid: Schema.Types.ObjectId | null;
  title: string;
  path: string;
  method: InterfaceMethod;
  req_query: IReqQuery[];
  req_headers: IReqHeader[];
  req_body_type: ReqBodyType;
  req_body_form: IReqBodyForm[];
  req_body_other: string;
  req_body: string;
  res_body: string;
  res_body_type: ResBodyType;
  status: InterfaceStatus;
  tag: string[];
  desc: string;
  markdown: string;
  mock_script: string;
  uid: Schema.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
}

export type InterfaceModel = Model<IInterface>;

const interfaceSchema = new Schema<IInterface>(
  {
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    catid: {
      type: Schema.Types.ObjectId,
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
        name: { type: String },
        type: { type: String },
        required: { type: Boolean },
        default: { type: String },
        desc: { type: String },
        example: { type: String },
      },
    ],
    req_headers: [
      {
        name: { type: String },
        value: { type: String },
        required: { type: Boolean },
        desc: { type: String },
      },
    ],
    req_body_type: {
      type: String,
      enum: ['form', 'json', 'file', 'raw'],
      default: 'json',
    },
    req_body_form: [
      {
        name: { type: String },
        type: { type: String },
        required: { type: Boolean },
        default: { type: String },
        desc: { type: String },
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
      type: Schema.Types.ObjectId,
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

const Interface = mongoose.model<IInterface, InterfaceModel>('Interface', interfaceSchema);

export default Interface;
