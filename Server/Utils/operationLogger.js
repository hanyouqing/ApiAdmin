import OperationLog from '../Models/OperationLog.js';
import { logger } from './logger.js';

/**
 * 记录操作日志
 * @param {Object} params - 操作参数
 * @param {string} params.type - 操作类型 (project, interface, user, group, test, mock)
 * @param {string} params.action - 操作动作 (create, update, delete, etc.)
 * @param {string} params.targetId - 目标ID
 * @param {string} params.targetName - 目标名称（可选）
 * @param {string} params.userId - 用户ID
 * @param {string} params.username - 用户名
 * @param {string} params.projectId - 项目ID（可选）
 * @param {Object} params.details - 详细信息（可选）
 * @param {string} params.ip - IP地址（可选）
 * @param {string} params.userAgent - User Agent（可选）
 * @param {string} params.uri - 请求URI（可选）
 */
export async function logOperation({
  type,
  action,
  targetId,
  targetName = '',
  userId,
  username,
  projectId = null,
  details = {},
  ip = '',
  userAgent = '',
  uri = '',
}) {
  try {
    // 验证必需参数
    if (!type || !action || !targetId || !userId || !username) {
      logger.warn({ type, action, targetId, userId, username }, 'Missing required parameters for operation log');
      return;
    }

    const operationLog = new OperationLog({
      type,
      action,
      targetId,
      targetName,
      userId,
      username,
      projectId,
      details,
      ip,
      userAgent,
      uri,
    });

    await operationLog.save();
  } catch (error) {
    // 操作日志记录失败不应该影响业务流程
    logger.error({ error, params: { type, action, targetId, userId } }, 'Failed to log operation');
  }
}

