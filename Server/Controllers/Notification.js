import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import Notification from '../Models/Notification.js';

class NotificationController extends BaseController {
  static get ControllerName() { return 'NotificationController'; }

  static async listNotifications(ctx) {
    try {
      const user = ctx.state.user;
      const { unreadOnly, type, page = 1, pageSize = 10 } = ctx.query;

      const query = { userId: user._id };

      if (unreadOnly === 'true') {
        query.read = false;
      }

      if (type) {
        query.type = type;
      }

      const skip = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const [list, total, unreadCount] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Notification.countDocuments(query),
        Notification.countDocuments({ userId: user._id, read: false }),
      ]);

      ctx.body = NotificationController.success({
        list,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize)),
        },
        unreadCount,
      });
    } catch (error) {
      logger.error({ error }, 'List notifications error');
      ctx.status = 500;
      ctx.body = NotificationController.error(
        process.env.NODE_ENV === 'production'
          ? '获取通知列表失败'
          : error.message || '获取通知列表失败'
      );
    }
  }

  static async markAsRead(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = NotificationController.error('无效的通知 ID');
        return;
      }

      const notification = await Notification.findOne({
        _id: id,
        userId: user._id,
      });

      if (!notification) {
        ctx.status = 404;
        ctx.body = NotificationController.error('通知不存在');
        return;
      }

      notification.read = true;
      notification.readAt = new Date();
      await notification.save();

      ctx.body = NotificationController.success(null, '通知已标记为已读');
    } catch (error) {
      logger.error({ error }, 'Mark notification as read error');
      ctx.status = 500;
      ctx.body = NotificationController.error(
        process.env.NODE_ENV === 'production'
          ? '标记通知失败'
          : error.message || '标记通知失败'
      );
    }
  }

  static async markAllAsRead(ctx) {
    try {
      const user = ctx.state.user;

      const result = await Notification.updateMany(
        { userId: user._id, read: false },
        { read: true, readAt: new Date() }
      );

      ctx.body = NotificationController.success({
        updatedCount: result.modifiedCount,
      }, '所有通知已标记为已读');
    } catch (error) {
      logger.error({ error }, 'Mark all notifications as read error');
      ctx.status = 500;
      ctx.body = NotificationController.error(
        process.env.NODE_ENV === 'production'
          ? '标记所有通知失败'
          : error.message || '标记所有通知失败'
      );
    }
  }

  static async deleteNotification(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = NotificationController.error('无效的通知 ID');
        return;
      }

      const notification = await Notification.findOne({
        _id: id,
        userId: user._id,
      });

      if (!notification) {
        ctx.status = 404;
        ctx.body = NotificationController.error('通知不存在');
        return;
      }

      await notification.deleteOne();

      ctx.body = NotificationController.success(null, '通知已删除');
    } catch (error) {
      logger.error({ error }, 'Delete notification error');
      ctx.status = 500;
      ctx.body = NotificationController.error(
        process.env.NODE_ENV === 'production'
          ? '删除通知失败'
          : error.message || '删除通知失败'
      );
    }
  }

  static async getSettings(ctx) {
    try {
      const user = ctx.state.user;
      // TODO: 从数据库获取用户的通知设置
      // 临时返回默认设置
      ctx.body = NotificationController.success({
        email: {
          interfaceChange: true,
          testFailed: true,
          projectUpdate: false,
          system: true,
        },
        inApp: {
          interfaceChange: true,
          testFailed: true,
          projectUpdate: true,
          system: true,
        },
        webhook: {
          enabled: false,
          url: '',
        },
      });
    } catch (error) {
      logger.error({ error }, 'Get notification settings error');
      ctx.status = 500;
      ctx.body = NotificationController.error(
        process.env.NODE_ENV === 'production'
          ? '获取通知设置失败'
          : error.message || '获取通知设置失败'
      );
    }
  }

  static async updateSettings(ctx) {
    try {
      const user = ctx.state.user;
      const { email, inApp, webhook } = ctx.request.body;

      // TODO: 保存用户的通知设置到数据库

      logger.info({ userId: user._id }, 'Notification settings updated');

      ctx.body = NotificationController.success(null, '通知设置更新成功');
    } catch (error) {
      logger.error({ error }, 'Update notification settings error');
      ctx.status = 500;
      ctx.body = NotificationController.error(
        process.env.NODE_ENV === 'production'
          ? '更新通知设置失败'
          : error.message || '更新通知设置失败'
      );
    }
  }
}

export default NotificationController;

