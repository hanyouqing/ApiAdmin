import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: '/icons/icon-64x64.png',
    },
    role: {
      type: String,
      enum: ['super_admin', 'group_leader', 'project_leader', 'developer', 'guest'],
      default: 'guest',
    },
    ssoProvider: {
      type: String,
      enum: ['local', 'saml', 'oauth2', 'oidc', 'ldap', 'cas', 'wechat', 'google', 'github', 'gitlab', 'phone', 'email'],
      default: 'local',
    },
    ssoId: {
      type: String,
      default: '',
    },
    ssoAttributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const DEFAULT_AVATAR = '/icons/icon-64x64.png';
  
  try {
    const obj = this.toObject();
    delete obj.password;
    // 确保 _id 是字符串格式
    if (obj._id && typeof obj._id.toString === 'function') {
      obj._id = obj._id.toString();
    }
    // 如果没有头像或头像为空，使用默认头像
    if (!obj.avatar || obj.avatar === '') {
      obj.avatar = DEFAULT_AVATAR;
    }
    return obj;
  } catch (error) {
    // 如果 toObject() 失败，返回一个基本对象
    const avatar = this.avatar && this.avatar !== '' ? this.avatar : DEFAULT_AVATAR;
    return {
      _id: this._id ? this._id.toString() : null,
      username: this.username,
      email: this.email,
      avatar: avatar,
      role: this.role,
      ssoProvider: this.ssoProvider,
      ssoId: this.ssoId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
};

userSchema.index({ role: 1 });
userSchema.index({ ssoProvider: 1, ssoId: 1 });

const User = mongoose.model('User', userSchema);

export default User;

