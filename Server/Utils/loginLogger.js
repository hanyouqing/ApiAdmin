import LoginLog from '../Models/LoginLog.js';
import { logger } from './logger.js';

/**
 * 记录登录日志
 * @param {Object} params - 登录参数
 * @param {string} params.userId - 用户ID（成功时）
 * @param {string} params.username - 用户名
 * @param {string} params.email - 邮箱
 * @param {string} params.loginType - 登录类型 (password, phone, email, sso, github, etc.)
 * @param {string} params.provider - 登录提供商（SSO时使用）
 * @param {string} params.status - 登录状态 (success, failed)
 * @param {string} params.failureReason - 失败原因（失败时）
 * @param {string} params.ip - IP地址
 * @param {string} params.userAgent - User Agent
 */
export async function logLogin({
  userId = null,
  username = '',
  email = '',
  loginType = 'password',
  provider = '',
  status = 'success',
  failureReason = '',
  ip = '',
  userAgent = '',
}) {
  try {
    const loginLog = new LoginLog({
      userId,
      username,
      email,
      loginType,
      provider,
      status,
      failureReason,
      ip,
      userAgent,
    });

    await loginLog.save();
  } catch (error) {
    // 登录日志记录失败不应该影响登录流程
    logger.error({ error, params: { userId, username, email, loginType, status } }, 'Failed to log login');
  }
}

