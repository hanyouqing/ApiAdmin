import mongoose from 'mongoose';

const ssoProviderSchema = new mongoose.Schema(
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
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    roleMapping: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    autoCreateUser: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

ssoProviderSchema.index({ type: 1, enabled: 1 });
ssoProviderSchema.index({ name: 1 });

const SSOProvider = mongoose.model('SSOProvider', ssoProviderSchema);

export default SSOProvider;

