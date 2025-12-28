import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import Whitelist from '../Models/Whitelist.js';
import WhitelistConfig from '../Models/WhitelistConfig.js';

class WhitelistController extends BaseController {
  static get ControllerName() { return 'WhitelistController'; }

  static async getConfig(ctx) {
    try {
      const config = await WhitelistConfig.getConfig();
      ctx.body = WhitelistController.success(config);
    } catch (error) {
      logger.error({ error }, 'Get whitelist config error');
      ctx.status = 500;
      ctx.body = WhitelistController.error(
        process.env.NODE_ENV === 'production'
          ? '获取白名单配置失败'
          : error.message || '获取白名单配置失败'
      );
    }
  }

  static async updateConfig(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = WhitelistController.error('无权限修改白名单配置');
        return;
      }

      const { enabled, platforms } = ctx.request.body;

      const config = await WhitelistConfig.updateConfig({
        enabled: enabled !== undefined ? enabled : false,
        platforms: platforms || [],
      });

      logger.info({ userId: user._id }, 'Whitelist config updated');

      ctx.body = WhitelistController.success(config, '白名单配置更新成功');
    } catch (error) {
      logger.error({ error }, 'Update whitelist config error');
      ctx.status = 500;
      ctx.body = WhitelistController.error(
        process.env.NODE_ENV === 'production'
          ? '更新白名单配置失败'
          : error.message || '更新白名单配置失败'
      );
    }
  }

  static async listEntries(ctx) {
    try {
      const { platform, page = 1, pageSize = 10, search } = ctx.query;
      const query = {};

      if (platform) {
        query.platform = platform;
      }

      if (search) {
        query.$or = [
          { value: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const [list, total] = await Promise.all([
        Whitelist.find(query)
          .populate('createdBy', 'username')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Whitelist.countDocuments(query),
      ]);

      ctx.body = WhitelistController.success({
        list,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize)),
        },
      });
    } catch (error) {
      logger.error({ error }, 'List whitelist entries error');
      ctx.status = 500;
      ctx.body = WhitelistController.error(
        process.env.NODE_ENV === 'production'
          ? '获取白名单列表失败'
          : error.message || '获取白名单列表失败'
      );
    }
  }

  static async addEntry(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = WhitelistController.error('无权限添加白名单条目');
        return;
      }

      let { platform, value, description } = ctx.request.body;

      if (!platform || !value) {
        ctx.status = 400;
        ctx.body = WhitelistController.error('平台和值不能为空');
        return;
      }

      if (!['github', 'gitlab', 'gmail', 'wechat', 'phone', 'email'].includes(platform)) {
        ctx.status = 400;
        ctx.body = WhitelistController.error('无效的平台类型');
        return;
      }

      value = sanitizeInput(value);
      if (description) {
        description = sanitizeInput(description);
      }

      // 检查是否已存在
      const existing = await Whitelist.findOne({ platform, value });
      if (existing) {
        ctx.status = 400;
        ctx.body = WhitelistController.error('该白名单条目已存在');
        return;
      }

      const entry = new Whitelist({
        platform,
        value,
        description: description || '',
        enabled: true,
        createdBy: user._id,
      });

      await entry.save();

      logger.info({ userId: user._id, entryId: entry._id }, 'Whitelist entry added');

      ctx.body = WhitelistController.success(entry, '白名单条目添加成功');
    } catch (error) {
      if (error.code === 11000) {
        ctx.status = 400;
        ctx.body = WhitelistController.error('该白名单条目已存在');
        return;
      }
      logger.error({ error }, 'Add whitelist entry error');
      ctx.status = 500;
      ctx.body = WhitelistController.error(
        process.env.NODE_ENV === 'production'
          ? '添加白名单条目失败'
          : error.message || '添加白名单条目失败'
      );
    }
  }

  static async batchAddEntries(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = WhitelistController.error('无权限批量添加白名单条目');
        return;
      }

      const { entries } = ctx.request.body;

      if (!Array.isArray(entries) || entries.length === 0) {
        ctx.status = 400;
        ctx.body = WhitelistController.error('条目列表不能为空');
        return;
      }

      let successCount = 0;
      let failedCount = 0;
      const failedEntries = [];

      for (const entryData of entries) {
        try {
          const { platform, value, description } = entryData;

          if (!platform || !value) {
            failedCount++;
            failedEntries.push({ entry: entryData, reason: '平台和值不能为空' });
            continue;
          }

          const existing = await Whitelist.findOne({ platform, value });
          if (existing) {
            failedCount++;
            failedEntries.push({ entry: entryData, reason: '条目已存在' });
            continue;
          }

          const entry = new Whitelist({
            platform,
            value: sanitizeInput(value),
            description: description ? sanitizeInput(description) : '',
            enabled: true,
            createdBy: user._id,
          });

          await entry.save();
          successCount++;
        } catch (error) {
          failedCount++;
          failedEntries.push({
            entry: entryData,
            reason: error.message || '未知错误',
          });
        }
      }

      logger.info({ userId: user._id, successCount, failedCount }, 'Batch add whitelist entries');

      ctx.body = WhitelistController.success({
        successCount,
        failedCount,
        failedEntries,
      }, '批量添加完成');
    } catch (error) {
      logger.error({ error }, 'Batch add whitelist entries error');
      ctx.status = 500;
      ctx.body = WhitelistController.error(
        process.env.NODE_ENV === 'production'
          ? '批量添加白名单条目失败'
          : error.message || '批量添加白名单条目失败'
      );
    }
  }

  static async updateEntry(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = WhitelistController.error('无权限修改白名单条目');
        return;
      }

      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = WhitelistController.error('无效的白名单条目 ID');
        return;
      }

      const entry = await Whitelist.findById(id);
      if (!entry) {
        ctx.status = 404;
        ctx.body = WhitelistController.error('白名单条目不存在');
        return;
      }

      const { value, description, enabled } = ctx.request.body;

      if (value !== undefined) {
        entry.value = sanitizeInput(value);
      }
      if (description !== undefined) {
        entry.description = sanitizeInput(description);
      }
      if (enabled !== undefined) {
        entry.enabled = enabled;
      }

      await entry.save();

      logger.info({ userId: user._id, entryId: entry._id }, 'Whitelist entry updated');

      ctx.body = WhitelistController.success(entry, '白名单条目更新成功');
    } catch (error) {
      logger.error({ error }, 'Update whitelist entry error');
      ctx.status = 500;
      ctx.body = WhitelistController.error(
        process.env.NODE_ENV === 'production'
          ? '更新白名单条目失败'
          : error.message || '更新白名单条目失败'
      );
    }
  }

  static async deleteEntry(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = WhitelistController.error('无权限删除白名单条目');
        return;
      }

      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = WhitelistController.error('无效的白名单条目 ID');
        return;
      }

      const entry = await Whitelist.findById(id);
      if (!entry) {
        ctx.status = 404;
        ctx.body = WhitelistController.error('白名单条目不存在');
        return;
      }

      await entry.deleteOne();

      logger.info({ userId: user._id, entryId: id }, 'Whitelist entry deleted');

      ctx.body = WhitelistController.success(null, '白名单条目删除成功');
    } catch (error) {
      logger.error({ error }, 'Delete whitelist entry error');
      ctx.status = 500;
      ctx.body = WhitelistController.error(
        process.env.NODE_ENV === 'production'
          ? '删除白名单条目失败'
          : error.message || '删除白名单条目失败'
      );
    }
  }

  static async batchDeleteEntries(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = WhitelistController.error('无权限批量删除白名单条目');
        return;
      }

      const { ids } = ctx.request.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        ctx.status = 400;
        ctx.body = WhitelistController.error('ID 列表不能为空');
        return;
      }

      const validIds = ids.filter(id => validateObjectId(id));
      const result = await Whitelist.deleteMany({ _id: { $in: validIds } });

      logger.info({ userId: user._id, deletedCount: result.deletedCount }, 'Batch delete whitelist entries');

      ctx.body = WhitelistController.success({
        deletedCount: result.deletedCount,
      }, '批量删除完成');
    } catch (error) {
      logger.error({ error }, 'Batch delete whitelist entries error');
      ctx.status = 500;
      ctx.body = WhitelistController.error(
        process.env.NODE_ENV === 'production'
          ? '批量删除白名单条目失败'
          : error.message || '批量删除白名单条目失败'
      );
    }
  }

  static async checkEntry(ctx) {
    try {
      const { platform, value } = ctx.request.body;

      if (!platform || !value) {
        ctx.status = 400;
        ctx.body = WhitelistController.error('平台和值不能为空');
        return;
      }

      const config = await WhitelistConfig.getConfig();
      if (!config.enabled) {
        ctx.body = WhitelistController.success({
          inWhitelist: true,
          entry: null,
        });
        return;
      }

      const entry = await Whitelist.findOne({
        platform,
        value,
        enabled: true,
      });

      ctx.body = WhitelistController.success({
        inWhitelist: !!entry,
        entry: entry || null,
      });
    } catch (error) {
      logger.error({ error }, 'Check whitelist entry error');
      ctx.status = 500;
      ctx.body = WhitelistController.error(
        process.env.NODE_ENV === 'production'
          ? '检查白名单条目失败'
          : error.message || '检查白名单条目失败'
      );
    }
  }
}

export default WhitelistController;

