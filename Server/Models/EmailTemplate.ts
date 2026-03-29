import mongoose, { Schema, Model } from 'mongoose';

export type EmailTemplateType = 'verification' | 'welcome' | 'password-reset' | 'interface-change' | 'custom';

export interface IEmailTemplate {
  name: string;
  type: EmailTemplateType;
  subject: string;
  html: string;
  text: string;
  variables: string[];
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type EmailTemplateModel = Model<IEmailTemplate>;

const emailTemplateSchema = new Schema<IEmailTemplate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['verification', 'welcome', 'password-reset', 'interface-change', 'custom'],
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    html: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      default: '',
    },
    variables: {
      type: [String],
      default: [],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

emailTemplateSchema.index({ type: 1 });
emailTemplateSchema.index({ name: 1 });

const EmailTemplate = mongoose.model<IEmailTemplate, EmailTemplateModel>('EmailTemplate', emailTemplateSchema);

export default EmailTemplate;
