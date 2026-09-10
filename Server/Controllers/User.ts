import Koa from 'koa';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../Models/User.js';
import { BaseController } from './Base.js';
import { validateEmail, validatePassword, sanitizeInput } from '../Utils/validation.js';
import config from '../Utils/config.js';
import { logger } from '../Utils/logger.js';
import { logLogin } from '../Utils/loginLogger.js';
import { logOperation } from '../Utils/operationLogger.js';

// 定义经过认证的 Context 扩展
interface AuthenticatedContext extends Koa.Context {
  state: {
    user: any; // 可以是 User 模型实例或普通对象
  };
}

// 在运行时获取 JWT_SECRET 和 JWT_EXPIRES_IN，确保使用最新的配置
function getJWTSecret() {
  const secret = config.JWT_SECRET;
  if (!secret || secret === 'your-secret-key') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
  }
  return secret;
}

function getJWTExpiresIn() {
  return config.JWT_EXPIRES_IN || '7d';
}

class UserController extends BaseController {
  static async register(ctx: Koa.Context) {
    try {
      if (!(config as any).ALLOW_PUBLIC_REGISTRATION) {
        ctx.status = 403;
        ctx.body = UserController.error('公开注册已关闭，请联系管理员');
        return;
      }

      let { email, password, username } = ctx.request.body as any;

      if (!email || !password || !username) {
        ctx.status = 400;
        ctx.body = UserController.error('邮箱、密码和用户名不能为空');
        return;
      }

      email = sanitizeInput(email);
      username = sanitizeInput(username);

      if (!validateEmail(email)) {
        ctx.status = 400;
        ctx.body = UserController.error('邮箱格式不正确');
        return;
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        ctx.status = 400;
        ctx.body = UserController.error(passwordValidation.message);
        return;
      }

      if (username.length < 3 || username.length > 20) {
        ctx.status = 400;
        ctx.body = UserController.error('用户名长度必须在3-20个字符之间');
        return;
      }

      const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { username }],
      });

      if (existingUser) {
        ctx.status = 400;
        ctx.body = UserController.error('邮箱或用户名已存在');
        return;
      }

      const user = new User({
        email: email.toLowerCase(),
        password,
        username,
        role: 'guest',
      });

      await user.save();

      const token = jwt.sign({ userId: user._id }, getJWTSecret(), {
        expiresIn: getJWTExpiresIn() as any,
      });

      ctx.body = UserController.success(
        {
          user: (user as any).toJSON(),
          token,
        },
        'Registration successful'
      );
    } catch (error: any) {
      logger.error({ error }, 'User registration error');
      ctx.status = 500;
      ctx.body = UserController.error(
        process.env.NODE_ENV === 'production' ? 'Registration failed' : error.message
      );
    }
  }

  static async login(ctx: Koa.Context) {
    try {
      const { email, password } = ctx.request.body as any;

      if (!email || !password) {
        ctx.status = 400;
        ctx.body = UserController.error('邮箱和密码不能为空');
        return;
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      const userAgent = ctx.headers['user-agent'] || '';
      const ip = ctx.ip || '';

      if (!user) {
        // @ts-ignore
        // @ts-ignore
      await logLogin({
          username: email.split('@')[0] || email,
          email: email.toLowerCase(),
          loginType: 'password',
          status: 'failed',
          failureReason: '用户不存在',
          ip,
          userAgent,
        });
        ctx.status = 401;
        ctx.body = UserController.error('邮箱或密码错误');
        return;
      }

      const isPasswordValid = await (user as any).comparePassword(password);

      if (!isPasswordValid) {
        // @ts-ignore
        // @ts-ignore
      await logLogin({
          userId: user._id as any,
          username: user.username,
          email: user.email,
          loginType: 'password',
          status: 'failed',
          failureReason: '密码错误',
          ip,
          userAgent,
        });
        ctx.status = 401;
        ctx.body = UserController.error('邮箱或密码错误');
        return;
      }

      const token = jwt.sign({ userId: user._id }, getJWTSecret(), {
        expiresIn: getJWTExpiresIn() as any,
      });

      // @ts-ignore
      await logLogin({
        userId: user._id as any,
        username: user.username,
        email: user.email,
        loginType: 'password',
        status: 'success',
        ip,
        userAgent,
      });

      ctx.body = UserController.success(
        {
          user: (user as any).toJSON(),
          token,
        },
        '登录成功'
      );
    } catch (error: any) {
      logger.error({ error }, 'User login error');
      ctx.status = 500;
      ctx.body = UserController.error(
        process.env.NODE_ENV === 'production' ? '登录失败' : error.message
      );
    }
  }

  static async logout(ctx: Koa.Context) {
    ctx.body = UserController.success(null, '退出成功');
  }

  static async getInfo(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      if (!user) {
        ctx.status = 401;
        ctx.body = UserController.error('用户未认证');
        return;
      }

      let userObj = user;
      if (typeof user === 'string') {
        userObj = await User.findById(user).lean();
        if (!userObj) {
          ctx.status = 404;
          ctx.body = UserController.error('用户不存在');
          return;
        }
      }

      // 确保密码被移除，_id 为字符串
      const serializedUser = JSON.parse(JSON.stringify(userObj));
      delete serializedUser.password;
      if (serializedUser._id) serializedUser._id = serializedUser._id.toString();
      if (!serializedUser.avatar) serializedUser.avatar = '/icons/icon-64x64.png';

      ctx.body = UserController.success(serializedUser);
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = UserController.error(error.message || '获取用户信息失败');
    }
  }

  static async updateInfo(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      let { username, avatar } = ctx.request.body as any;

      const userDoc = await User.findById(user._id);
      if (!userDoc) {
        ctx.status = 404;
        ctx.body = UserController.error('用户不存在');
        return;
      }

      if (username) {
        username = sanitizeInput(username);
        const existingUser = await User.findOne({
          username,
          _id: { $ne: user._id },
        });

        if (existingUser) {
          ctx.status = 400;
          ctx.body = UserController.error('用户名已存在');
          return;
        }
        userDoc.username = username;
      }

      if (avatar !== undefined) {
        userDoc.avatar = sanitizeInput(avatar);
      }

      await userDoc.save();
      ctx.body = UserController.success((userDoc as any).toJSON(), '更新成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = UserController.error(error.message || '更新失败');
    }
  }

  static async requestPasswordReset(ctx: Koa.Context) {
    try {
      const { email } = ctx.request.body as any;
      if (!email || !validateEmail(email)) {
        ctx.status = 400;
        ctx.body = UserController.error('请输入有效的邮箱地址');
        return;
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        ctx.body = UserController.success(null, '如果该邮箱存在，重置链接已发送');
        return;
      }

      const PasswordReset = (await import('../Models/PasswordReset.js')).default;
      const resetToken = await (PasswordReset as any).createResetToken(user._id);

      const resetUrl = `${config.APP_URL || 'http://localhost:3000'}/reset-password`;
      const { sendPasswordResetEmail } = await import('../Utils/emailService.js');

      try {
        await sendPasswordResetEmail(user.email, resetToken, resetUrl);
        ctx.body = UserController.success(null, '如果该邮箱存在，重置链接已发送');
      } catch (error) {
        ctx.status = 500;
        ctx.body = UserController.error('发送重置邮件失败，请稍后重试');
      }
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = UserController.error(error.message || '请求失败');
    }
  }

  static async resetPassword(ctx: Koa.Context) {
    try {
      const { token, password } = ctx.request.body as any;
      if (!token || !password) {
        ctx.status = 400;
        ctx.body = UserController.error('重置令牌和新密码不能为空');
        return;
      }

      const PasswordReset = (await import('../Models/PasswordReset.js')).default;
      const resetToken = await (PasswordReset as any).validateToken(token);

      if (!resetToken) {
        ctx.status = 400;
        ctx.body = UserController.error('无效或已过期的重置令牌');
        return;
      }

      const user = await User.findById(resetToken.userId);
      if (!user) {
        ctx.status = 404;
        ctx.body = UserController.error('用户不存在');
        return;
      }

      user.password = password;
      await user.save();

      resetToken.used = true;
      await resetToken.save();

      ctx.body = UserController.success(null, '密码重置成功，请使用新密码登录');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = UserController.error(error.message || '重置失败');
    }
  }

  // Admin APIs
  static async listUsers(ctx: AuthenticatedContext) {
    try {
      if (ctx.state.user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = UserController.error('只有超级管理员可以查看用户列表');
        return;
      }

      const users = await User.find({}).select('-password').sort({ createdAt: -1 });
      ctx.body = UserController.success(users);
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = UserController.error(error.message || '获取用户列表失败');
    }
  }

  static async createUser(ctx: AuthenticatedContext) {
    try {
      if (ctx.state.user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = UserController.error('只有超级管理员可以创建用户');
        return;
      }

      let { email, password, username, role } = ctx.request.body as any;
      if (!email || !password || !username) {
        ctx.status = 400;
        ctx.body = UserController.error('邮箱、密码和用户名不能为空');
        return;
      }

      email = sanitizeInput(email);
      username = sanitizeInput(username);
      if (!validateEmail(email)) {
        ctx.status = 400;
        ctx.body = UserController.error('邮箱格式不正确');
        return;
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        ctx.status = 400;
        ctx.body = UserController.error(passwordValidation.message);
        return;
      }

      const allowedRoles = ['super_admin', 'group_leader', 'project_leader', 'developer', 'guest'];
      const userRole = allowedRoles.includes(role) ? role : 'guest';

      const existing = await User.findOne({ $or: [{ email }, { username }] });
      if (existing) {
        ctx.status = 400;
        ctx.body = UserController.error('邮箱或用户名已存在');
        return;
      }

      const user = new User({ email, password, username, role: userRole });
      await user.save();

      const serialized = user.toObject();
      delete (serialized as any).password;
      ctx.body = UserController.success(serialized, '用户创建成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = UserController.error(error.message || '创建用户失败');
    }
  }

  static async updateUser(ctx: AuthenticatedContext) {
    try {
      if (ctx.state.user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = UserController.error('只有超级管理员可以更新用户');
        return;
      }

      const { _id, username, email, role, password } = ctx.request.body as any;
      if (!_id || !mongoose.Types.ObjectId.isValid(_id)) {
        ctx.status = 400;
        ctx.body = UserController.error('无效的用户ID');
        return;
      }

      const user = await User.findById(_id);
      if (!user) {
        ctx.status = 404;
        ctx.body = UserController.error('用户不存在');
        return;
      }

      if (username) user.username = sanitizeInput(username);
      if (email) {
        if (!validateEmail(email)) {
          ctx.status = 400;
          ctx.body = UserController.error('邮箱格式不正确');
          return;
        }
        user.email = sanitizeInput(email);
      }
      if (role) {
        const allowedRoles = ['super_admin', 'group_leader', 'project_leader', 'developer', 'guest'];
        if (!allowedRoles.includes(role)) {
          ctx.status = 400;
          ctx.body = UserController.error('无效的角色');
          return;
        }
        user.role = role;
      }
      if (password) {
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
          ctx.status = 400;
          ctx.body = UserController.error(passwordValidation.message);
          return;
        }
        user.password = password;
      }

      await user.save();
      const serialized = user.toObject();
      delete (serialized as any).password;
      ctx.body = UserController.success(serialized, '用户更新成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = UserController.error(error.message || '更新用户失败');
    }
  }

  static async deleteUser(ctx: AuthenticatedContext) {
    try {
      if (ctx.state.user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = UserController.error('只有超级管理员可以删除用户');
        return;
      }

      const _id = (ctx.query._id || (ctx.request.body as any)?._id) as string;
      if (!_id || !mongoose.Types.ObjectId.isValid(_id)) {
        ctx.status = 400;
        ctx.body = UserController.error('无效的用户ID');
        return;
      }

      if (_id === ctx.state.user._id.toString()) {
        ctx.status = 400;
        ctx.body = UserController.error('不能删除当前登录用户');
        return;
      }

      const user = await User.findByIdAndDelete(_id);
      if (!user) {
        ctx.status = 404;
        ctx.body = UserController.error('用户不存在');
        return;
      }

      ctx.body = UserController.success(null, '用户删除成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = UserController.error(error.message || '删除用户失败');
    }
  }

  static async changePassword(ctx: AuthenticatedContext) {
    try {
      const { oldPassword, newPassword } = ctx.request.body as any;
      if (!oldPassword || !newPassword) {
        ctx.status = 400;
        ctx.body = UserController.error('旧密码和新密码不能为空');
        return;
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        ctx.status = 400;
        ctx.body = UserController.error(passwordValidation.message);
        return;
      }

      const user = await User.findById(ctx.state.user._id);
      if (!user) {
        ctx.status = 404;
        ctx.body = UserController.error('用户不存在');
        return;
      }

      const valid = await (user as any).comparePassword(oldPassword);
      if (!valid) {
        ctx.status = 400;
        ctx.body = UserController.error('旧密码不正确');
        return;
      }

      user.password = newPassword;
      await user.save();
      ctx.body = UserController.success(null, '密码修改成功');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = UserController.error(error.message || '修改密码失败');
    }
  }
}

export default UserController;
