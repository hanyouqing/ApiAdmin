import mongoose, { Schema, Model } from 'mongoose';

export type SSOType = 'saml' | 'oauth2' | 'oidc' | 'ldap' | 'cas';

export interface ISSOProvider {
  name: string;
  type: SSOType;
  enabled: boolean;
  description: string;
  config: any;
  roleMapping: any;
  autoCreateUser: boolean;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type SSOProviderModel = Model<ISSOProvider>;

const ssoProviderSchema = new Schema<ISSOProvider>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['saml', 'oauth2', 'oidc', 'ldap', 'cas'],
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      default: '',
    },
    config: {
      type: Schema.Types.Mixed,
      required: true,
    },
    roleMapping: {
      type: Schema.Types.Mixed,
      default: {},
    },
    autoCreateUser: {
      type: Boolean,
      default: true,
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

ssoProviderSchema.index({ type: 1, enabled: 1 });
ssoProviderSchema.index({ name: 1 });

const SSOProvider = mongoose.model<ISSOProvider, SSOProviderModel>('SSOProvider', ssoProviderSchema);

export default SSOProvider;
