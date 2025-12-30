import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import CollaborationSession from '../Models/CollaborationSession.js';
import Interface from '../Models/Interface.js';

/**
 * 实时协作控制器
 * 处理多用户实时编辑功能
 */
class CollaborationController extends BaseController {
  static get ControllerName() { return 'CollaborationController'; }

  /**
   * 加入协作会话
   */
  static async joinSession(ctx) {
    try {
      const user = ctx.state.user;
      const { interfaceId } = ctx.request.body;

      if (!validateObjectId(interfaceId)) {
        ctx.status = 400;
        ctx.body = CollaborationController.error('无效的接口 ID');
        return;
      }

      const interfaceData = await Interface.findById(interfaceId);
      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = CollaborationController.error('接口不存在');
        return;
      }

      let session = await CollaborationSession.findOne({
        interface_id: interfaceId,
        is_active: true,
      });

      if (!session) {
        session = new CollaborationSession({
          interface_id: interfaceId,
          project_id: interfaceData.project_id,
          active_users: [],
          is_active: true,
        });
      }

      const existingUser = session.active_users.find(
        u => u.user_id.toString() === user._id.toString()
      );

      if (!existingUser) {
        session.active_users.push({
          user_id: user._id,
          username: user.username,
          cursor_position: null,
          selection: null,
          joined_at: new Date(),
        });
      }

      session.last_activity = new Date();
      await session.save();

      logger.info({ userId: user._id, interfaceId }, 'User joined collaboration session');

      ctx.body = CollaborationController.success({
        sessionId: session._id,
        activeUsers: session.active_users,
      }, '加入协作会话成功');
    } catch (error) {
      logger.error({ error }, 'Join session error');
      ctx.status = 500;
      ctx.body = CollaborationController.error(
        process.env.NODE_ENV === 'production'
          ? '加入会话失败'
          : error.message || '加入会话失败'
      );
    }
  }

  /**
   * 离开协作会话
   */
  static async leaveSession(ctx) {
    try {
      const user = ctx.state.user;
      const { interfaceId } = ctx.request.body;

      if (!validateObjectId(interfaceId)) {
        ctx.status = 400;
        ctx.body = CollaborationController.error('无效的接口 ID');
        return;
      }

      const session = await CollaborationSession.findOne({
        interface_id: interfaceId,
        is_active: true,
      });

      if (session) {
        session.active_users = session.active_users.filter(
          u => u.user_id.toString() !== user._id.toString()
        );

        if (session.active_users.length === 0) {
          session.is_active = false;
        }

        await session.save();
      }

      logger.info({ userId: user._id, interfaceId }, 'User left collaboration session');

      ctx.body = CollaborationController.success(null, '离开会话成功');
    } catch (error) {
      logger.error({ error }, 'Leave session error');
      ctx.status = 500;
      ctx.body = CollaborationController.error(
        process.env.NODE_ENV === 'production'
          ? '离开会话失败'
          : error.message || '离开会话失败'
      );
    }
  }

  /**
   * 获取协作会话信息
   */
  static async getSession(ctx) {
    try {
      const { interfaceId } = ctx.query;

      if (!validateObjectId(interfaceId)) {
        ctx.status = 400;
        ctx.body = CollaborationController.error('无效的接口 ID');
        return;
      }

      const session = await CollaborationSession.findOne({
        interface_id: interfaceId,
        is_active: true,
      }).populate('active_users.user_id', 'username');

      if (!session) {
        ctx.body = CollaborationController.success({
          activeUsers: [],
        });
        return;
      }

      ctx.body = CollaborationController.success({
        sessionId: session._id,
        activeUsers: session.active_users,
        lastActivity: session.last_activity,
      });
    } catch (error) {
      logger.error({ error }, 'Get session error');
      ctx.status = 500;
      ctx.body = CollaborationController.error(
        process.env.NODE_ENV === 'production'
          ? '获取会话信息失败'
          : error.message || '获取会话信息失败'
      );
    }
  }

  /**
   * 更新光标位置
   */
  static async updateCursor(ctx) {
    try {
      const user = ctx.state.user;
      const { interfaceId, cursorPosition, selection } = ctx.request.body;

      if (!validateObjectId(interfaceId)) {
        ctx.status = 400;
        ctx.body = CollaborationController.error('无效的接口 ID');
        return;
      }

      const session = await CollaborationSession.findOne({
        interface_id: interfaceId,
        is_active: true,
      });

      if (session) {
        const userIndex = session.active_users.findIndex(
          u => u.user_id.toString() === user._id.toString()
        );

        if (userIndex !== -1) {
          session.active_users[userIndex].cursor_position = cursorPosition;
          session.active_users[userIndex].selection = selection;
          session.last_activity = new Date();
          await session.save();
        }
      }

      ctx.body = CollaborationController.success(null, '光标位置更新成功');
    } catch (error) {
      logger.error({ error }, 'Update cursor error');
      ctx.status = 500;
      ctx.body = CollaborationController.error(
        process.env.NODE_ENV === 'production'
          ? '更新光标位置失败'
          : error.message || '更新光标位置失败'
      );
    }
  }
}

export default CollaborationController;

