import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../Models/User.js';
import { BaseController } from './Base.js';
import { validateEmail, validatePassword, sanitizeInput } from '../Utils/validation.js';
import config from '../Utils/config.js';
import { logger } from '../Utils/logger.js';
import { logLogin } from '../Utils/loginLogger.js';
import { logOperation } from '../Utils/operationLogger.js';

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
  static async register(ctx) {
    try {
      let { email, password, username } = ctx.request.body;

      email = sanitizeInput(email);
      username = sanitizeInput(username);

      if (!email || !password || !username) {
        ctx.status = 400;
        ctx.body = UserController.error('邮箱、密码和用户名不能为空');
        return;
      }

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

      // 检查 MongoDB 连接状态和可用性
      if (mongoose.connection.readyState !== 1) {
        logger.error('MongoDB connection is not ready');
        ctx.status = 503;
        ctx.body = UserController.error('数据库连接未就绪，请稍后重试');
        return;
      }
      
      // 验证连接是否真正可用（不仅检查状态，还要测试实际查询）
      try {
        await mongoose.connection.db.admin().ping();
      } catch (pingError) {
        logger.error({
          error: pingError.message,
          code: pingError.code,
          codeName: pingError.codeName,
        }, 'MongoDB connection ping failed, connection may be invalid');
        ctx.status = 503;
        ctx.body = UserController.error('数据库连接无效，请稍后重试');
        return;
      }

      // 尝试执行一个简单的数据库操作来验证权限
      // 使用更宽松的验证：先尝试 listCollections，如果失败，尝试更简单的操作
      let permissionVerified = false;
      try {
        // 尝试使用 listCollections 检查权限
        // 注意：某些 MongoDB 驱动版本可能不支持 limit()，需要先转换为数组
        try {
          await mongoose.connection.db.listCollections().limit(1).toArray();
          permissionVerified = true;
        } catch (limitError) {
          // 如果 limit() 不支持，尝试不使用 limit
          try {
            await mongoose.connection.db.listCollections().toArray();
            permissionVerified = true;
          } catch (listError) {
            throw listError; // 如果都失败，抛出错误
          }
        }
      } catch (permError) {
        // 如果 listCollections 失败，尝试更简单的操作
        try {
          // 尝试执行一个简单的 find 操作（只需要基本的 read 权限）
          const testCollection = mongoose.connection.db.collection('users');
          await testCollection.findOne({}).limit(1);
          permissionVerified = true;
        } catch (findError) {
          // 如果 find 也失败，检查是否是认证错误
          if (findError.code === 13 || findError.codeName === 'Unauthorized' || 
              findError.message?.includes('requires authentication') ||
              findError.message?.includes('not authorized')) {
            logger.error({
              error: {
                code: findError.code,
                codeName: findError.codeName,
                message: findError.message,
              },
              operations: ['listCollections', 'find'],
              hint: 'User does not have permission to access the database. Please check MongoDB user permissions.',
            }, 'MongoDB database access permission denied');
            ctx.status = 503;
            ctx.body = UserController.error(
              'Database authentication failed, please contact administrator to check MongoDB configuration'
            );
            return;
          }
          // 其他错误（如集合不存在），记录但不阻止操作
          logger.warn({
            error: {
              code: findError.code,
              codeName: findError.codeName,
              message: findError.message,
            },
            note: 'Permission check failed, but continuing operation (may be collection not exists)',
          }, 'MongoDB permission check failed, but continuing operation');
        }
      }
      
      if (permissionVerified) {
        logger.debug('MongoDB permission verified');
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
        expiresIn: getJWTExpiresIn(),
      });

      logger.info({ userId: user._id, email: user.email }, 'User registered');

      ctx.body = UserController.success(
        {
          user: user.toJSON(),
          token,
        },
        'Registration successful'
      );
    } catch (error) {
      // 如果已经被限流，不记录错误（限流器已经处理了响应）
      if (ctx.status === 429) {
        return;
      }
      
      logger.error({ 
        error: {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
          code: error?.code,
          codeName: error?.codeName,
        }
      }, 'User registration error');
      
      // 处理 MongoDB 认证错误
      if (error.code === 13 || error.codeName === 'Unauthorized') {
        ctx.status = 503;
        ctx.body = UserController.error(
          'Database authentication failed, please contact administrator to check MongoDB configuration'
        );
        return;
      }
      
      // 处理 MongoDB 连接错误
      if (error.name === 'MongoServerSelectionError' || error.message?.includes('ECONNREFUSED')) {
        ctx.status = 503;
        ctx.body = UserController.error(
          'Database connection failed, please try again later'
        );
        return;
      }
      
      ctx.status = 500;
      ctx.body = UserController.error(
        process.env.NODE_ENV === 'production' 
          ? 'Registration failed' 
          : error.message || 'Registration failed'
      );
    }
  }

  static async login(ctx) {
    try {
      const { email, password } = ctx.request.body;

      if (!email || !password) {
        ctx.status = 400;
        ctx.body = UserController.error('邮箱和密码不能为空');
        return;
      }

      if (!validateEmail(email)) {
        ctx.status = 400;
        ctx.body = UserController.error('邮箱格式不正确');
        return;
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      const userAgent = ctx.headers['user-agent'] || '';
      const ip = ctx.ip || ctx.request.ip || '';

      if (!user) {
        logger.warn({ email: email.toLowerCase(), ip }, 'Login attempt with non-existent email');
        // 记录失败的登录日志
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

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        logger.warn({ userId: user._id, email: user.email, ip }, 'Login attempt with invalid password');
        // 记录失败的登录日志
        await logLogin({
          userId: user._id,
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
        expiresIn: getJWTExpiresIn(),
      });

      logger.info({ userId: user._id, email: user.email }, 'User logged in');

      // 记录成功的登录日志
      await logLogin({
        userId: user._id,
        username: user.username,
        email: user.email,
        loginType: 'password',
        status: 'success',
        ip,
        userAgent,
      });

      ctx.body = UserController.success(
        {
          user: user.toJSON(),
          token,
        },
        '登录成功'
      );
    } catch (error) {
      logger.error({ error }, 'User login error');
      ctx.status = 500;
      ctx.body = UserController.error(
        process.env.NODE_ENV === 'production' 
          ? '登录失败' 
          : error.message || '登录失败'
      );
    }
  }

  static async logout(ctx) {
    ctx.body = UserController.success(null, '退出成功');
  }

  static async getInfo(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        ctx.status = 401;
        ctx.body = UserController.error('用户未认证');
        return;
      }

      // 如果 user 是字符串 ID，需要从数据库查询
      let userDoc = user;
      if (typeof user === 'string' || (user._id && !user.email)) {
        try {
          userDoc = await User.findById(user._id || user);
          if (!userDoc) {
            ctx.status = 404;
            ctx.body = UserController.error('用户不存在');
            return;
          }
        } catch (dbError) {
          logger.error({ error: dbError.message, userId: user._id || user }, 'Failed to fetch user from database');
          ctx.status = 500;
          ctx.body = UserController.error('获取用户信息失败');
          return;
        }
      }

      // 使用 toJSON() 方法，它会自动删除密码（在 User 模型中定义）
      // 如果 toJSON 不可用，则使用 toObject() 并手动删除密码
      let userObj;
      try {
        if (typeof userDoc.toJSON === 'function') {
          userObj = userDoc.toJSON();
        } else if (typeof userDoc.toObject === 'function') {
          userObj = userDoc.toObject();
          delete userObj.password;
        } else {
          // 如果既不是 Mongoose 文档也不是普通对象，尝试转换为普通对象
          userObj = { ...userDoc };
          delete userObj.password;
          // 确保 _id 被转换为字符串
          if (userObj._id && typeof userObj._id.toString === 'function') {
            userObj._id = userObj._id.toString();
          }
        }
      } catch (convertError) {
        logger.error({ error: convertError.message }, 'Failed to convert user object');
        // 尝试最基本的转换
        userObj = {
          _id: userDoc._id?.toString() || userDoc._id,
          username: userDoc.username,
          email: userDoc.email,
          role: userDoc.role,
          avatar: userDoc.avatar,
        };
      }
      
      // 确保密码字段被删除（双重保险）
      if (userObj && userObj.password) {
        delete userObj.password;
      }
      
      // 如果没有头像或头像为空，使用默认头像
      if (!userObj.avatar || userObj.avatar === '') {
        userObj.avatar = '/icons/icon-64x64.png';
      }
      
      ctx.body = UserController.success(userObj);
    } catch (error) {
      logger.error({ 
        error: error.message, 
        stack: error.stack, 
        userId: ctx.state.user?._id,
        userType: typeof ctx.state.user,
        hasToJSON: typeof ctx.state.user?.toJSON === 'function',
        hasToObject: typeof ctx.state.user?.toObject === 'function',
      }, 'User getInfo error');
      ctx.status = 500;
      ctx.body = UserController.error(
        process.env.NODE_ENV === 'production' 
          ? '获取用户信息失败' 
          : error.message || '获取用户信息失败'
      );
    }
  }

  static async updateInfo(ctx) {
    try {
      const user = ctx.state.user;
      let { username, avatar } = ctx.request.body;

      if (username) {
        username = sanitizeInput(username);
        if (username.length < 3 || username.length > 20) {
          ctx.status = 400;
          ctx.body = UserController.error('用户名长度必须在3-20个字符之间');
          return;
        }

        const existingUser = await User.findOne({
          username,
          _id: { $ne: user._id },
        });

        if (existingUser) {
          ctx.status = 400;
          ctx.body = UserController.error('用户名已存在');
          return;
        }

        user.username = username;
      }

      if (avatar !== undefined) {
        avatar = sanitizeInput(avatar);
        if (avatar && avatar.length > 500) {
          ctx.status = 400;
          ctx.body = UserController.error('头像URL过长');
          return;
        }
        user.avatar = avatar;
      }

      await user.save();

      logger.info({ userId: user._id }, 'User info updated');

      ctx.body = UserController.success(user.toJSON(), '更新成功');
    } catch (error) {
      logger.error({ error }, 'User update error');
      ctx.status = 500;
      ctx.body = UserController.error(
        process.env.NODE_ENV === 'production' 
          ? '更新失败' 
          : error.message || '更新失败'
      );
    }
  }

  static async requestPasswordReset(ctx) {
    try {
      const { email } = ctx.request.body;

      if (!email || !validateEmail(email)) {
        ctx.status = 400;
        ctx.body = UserController.error('请输入有效的邮箱地址');
        return;
      }

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        logger.warn({ email: email.toLowerCase(), ip: ctx.ip }, 'Password reset request for non-existent email');
        ctx.body = UserController.success(null, '如果该邮箱存在，重置链接已发送');
        return;
      }

      const PasswordReset = (await import('../Models/PasswordReset.js')).default;
      const resetToken = await PasswordReset.createResetToken(user._id);

      const resetUrl = `${config.APP_URL || 'http://localhost:3000'}/reset-password`;
      const { sendPasswordResetEmail } = await import('../Utils/emailService.js');

      try {
        await sendPasswordResetEmail(user.email, resetToken, resetUrl);
        logger.info({ userId: user._id, email: user.email }, 'Password reset email sent');
        ctx.body = UserController.success(null, '如果该邮箱存在，重置链接已发送');
      } catch (error) {
        logger.error({ error, userId: user._id }, 'Failed to send password reset email');
        ctx.status = 500;
        ctx.body = UserController.error('发送重置邮件失败，请稍后重试');
      }
    } catch (error) {
      logger.error({ error }, 'Password reset request error');
      ctx.status = 500;
      ctx.body = UserController.error(
        process.env.NODE_ENV === 'production' 
          ? '请求失败' 
          : error.message || '请求失败'
      );
    }
  }

  static async resetPassword(ctx) {
    try {
      const { token, password } = ctx.request.body;

      if (!token || !password) {
        ctx.status = 400;
        ctx.body = UserController.error('重置令牌和新密码不能为空');
        return;
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        ctx.status = 400;
        ctx.body = UserController.error(passwordValidation.message);
        return;
      }

      const PasswordReset = (await import('../Models/PasswordReset.js')).default;
      const resetToken = await PasswordReset.validateToken(token);

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

      logger.info({ userId: user._id }, 'Password reset successful');

      ctx.body = UserController.success(null, '密码重置成功，请使用新密码登录');
    } catch (error) {
      logger.error({ error }, 'Password reset error');
      ctx.status = 500;
      ctx.body = UserController.error(
        process.env.NODE_ENV === 'production' 
          ? '重置失败' 
          : error.message || '重置失败'
      );
    }
  }

  static async changePassword(ctx) {
    try {
      const user = ctx.state.user;
      const { oldPassword, newPassword } = ctx.request.body;

      if (!oldPassword || !newPassword) {
        ctx.status = 400;
        ctx.body = UserController.error('旧密码和新密码不能为空');
        return;
      }

      const isPasswordValid = await user.comparePassword(oldPassword);
      if (!isPasswordValid) {
        ctx.status = 400;
        ctx.body = UserController.error('旧密码不正确');
        return;
      }

      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        ctx.status = 400;
        ctx.body = UserController.error(passwordValidation.message);
        return;
      }

      user.password = newPassword;
      await user.save();

      logger.info({ userId: user._id }, 'Password changed');

      ctx.body = UserController.success(null, '密码修改成功');
    } catch (error) {
      logger.error({ error }, 'Password change error');
      ctx.status = 500;
      ctx.body = UserController.error(
        process.env.NODE_ENV === 'production' 
          ? '修改失败' 
          : error.message || '修改失败'
      );
    }
  }

  // Admin APIs - only for super_admin
  static async listUsers(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = UserController.error('只有超级管理员可以查看用户列表');
        return;
      }

      const users = await User.find({}).select('-password').sort({ createdAt: -1 });
      ctx.body = UserController.success(users);
    } catch (error) {
      logger.error({ error }, 'List users error');
      ctx.status = 500;
      ctx.body = UserController.error(error.message || '获取用户列表失败');
    }
  }

  static async createUser(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = UserController.error('只有超级管理员可以创建用户');
        return;
      }

      let { email, password, username, role } = ctx.request.body;

      email = sanitizeInput(email);
      username = sanitizeInput(username);

      if (!email || !password || !username) {
        ctx.status = 400;
        ctx.body = UserController.error('邮箱、密码和用户名不能为空');
        return;
      }

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

      const newUser = new User({
        email: email.toLowerCase(),
        password,
        username,
        role: role || 'guest',
      });

      await newUser.save();

      logger.info({ adminId: user._id, newUserId: newUser._id }, 'Admin created user');
      
      // 记录操作日志
      await logOperation({
        type: 'user',
        action: 'create',
        targetId: newUser._id,
        targetName: username,
        userId: user._id,
        username: user.username,
        details: { email: email.toLowerCase(), role: role || 'guest' },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });
      
      ctx.body = UserController.success(newUser.toJSON(), '用户创建成功');
    } catch (error) {
      logger.error({ error }, 'Create user error');
      ctx.status = 500;
      ctx.body = UserController.error(error.message || '创建用户失败');
    }
  }

  static async updateUser(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = UserController.error('只有超级管理员可以修改用户');
        return;
      }

      const { _id, username, email, role } = ctx.request.body;

      if (!_id) {
        ctx.status = 400;
        ctx.body = UserController.error('用户ID不能为空');
        return;
      }

      const targetUser = await User.findById(_id);
      if (!targetUser) {
        ctx.status = 404;
        ctx.body = UserController.error('用户不存在');
        return;
      }

      if (username) {
        targetUser.username = sanitizeInput(username);
      }
      if (email) {
        if (!validateEmail(email)) {
          ctx.status = 400;
          ctx.body = UserController.error('邮箱格式不正确');
          return;
        }
        targetUser.email = email.toLowerCase();
      }
      if (role) {
        targetUser.role = role;
      }

      await targetUser.save();

      logger.info({ adminId: user._id, targetUserId: _id }, 'Admin updated user');
      
      // 记录操作日志
      await logOperation({
        type: 'user',
        action: 'update',
        targetId: _id,
        targetName: targetUser.username,
        userId: user._id,
        username: user.username,
        details: { username, email, role },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });
      
      ctx.body = UserController.success(targetUser.toJSON(), '用户更新成功');
    } catch (error) {
      logger.error({ error }, 'Update user error');
      ctx.status = 500;
      ctx.body = UserController.error(error.message || '更新用户失败');
    }
  }

  static async deleteUser(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = UserController.error('只有超级管理员可以删除用户');
        return;
      }

      const { _id } = ctx.query;

      if (!_id) {
        ctx.status = 400;
        ctx.body = UserController.error('用户ID不能为空');
        return;
      }

      if (_id === user._id.toString()) {
        ctx.status = 400;
        ctx.body = UserController.error('不能删除自己');
        return;
      }

      const targetUser = await User.findById(_id);
      if (!targetUser) {
        ctx.status = 404;
        ctx.body = UserController.error('用户不存在');
        return;
      }

      const targetUsername = targetUser.username;
      await User.findByIdAndDelete(_id);

      logger.info({ adminId: user._id, deletedUserId: _id }, 'Admin deleted user');
      
      // 记录操作日志
      await logOperation({
        type: 'user',
        action: 'delete',
        targetId: _id,
        targetName: targetUsername,
        userId: user._id,
        username: user.username,
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });
      
      ctx.body = UserController.success(null, '用户删除成功');
    } catch (error) {
      logger.error({ error }, 'Delete user error');
      ctx.status = 500;
      ctx.body = UserController.error(error.message || '删除用户失败');
    }
  }
}

export default UserController;

