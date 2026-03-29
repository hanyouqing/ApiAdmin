import Koa from 'koa';
import { BaseController } from './Base.js';
import { logger } from '../Utils/logger.js';
import Interface from '../Models/Interface.js';
import Project from '../Models/Project.js';
import Group from '../Models/Group.js';
import SearchHistory from '../Models/SearchHistory.js';

class SearchController extends BaseController {
  static get ControllerName() { return 'SearchController'; }

  static async search(ctx: Koa.Context) {
    try {
      const { q, type = 'all', page = 1, pageSize = 10 } = ctx.query as any;

      if (!q || q.trim().length === 0) {
        ctx.status = 400;
        ctx.body = SearchController.error('搜索关键词不能为空');
        return;
      }

      const keyword = q.trim();
      const skip = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const results: any[] = [];
      let total = 0;

      // 搜索接口
      if (type === 'all' || type === 'interface') {
        const interfaceQuery = {
          $or: [
            { title: { $regex: keyword, $options: 'i' } },
            { path: { $regex: keyword, $options: 'i' } },
            { desc: { $regex: keyword, $options: 'i' } },
          ],
        };

        const interfaces = await Interface.find(interfaceQuery)
          .populate('project_id', 'project_name')
          .skip(type === 'all' ? 0 : skip)
          .limit(type === 'all' ? 10 : limit);

        for (const item of interfaces) {
          results.push({
            type: 'interface',
            id: item._id.toString(),
            title: item.title,
            description: item.desc || '',
            highlight: this.highlightText(item.title, keyword),
            score: this.calculateScore(item.title, keyword),
            metadata: {
              path: item.path,
              method: item.method,
              projectId: (item.project_id as any)?._id?.toString(),
              projectName: (item.project_id as any)?.project_name,
            },
          });
        }

        if (type === 'interface') {
          total = await Interface.countDocuments(interfaceQuery);
        }
      }

      // 搜索项目
      if (type === 'all' || type === 'project') {
        const projectQuery = {
          $or: [
            { project_name: { $regex: keyword, $options: 'i' } },
            { desc: { $regex: keyword, $options: 'i' } },
          ],
        };

        const projects = await Project.find(projectQuery)
          .skip(type === 'all' ? 0 : skip)
          .limit(type === 'all' ? 10 : limit);

        for (const item of projects) {
          results.push({
            type: 'project',
            id: item._id.toString(),
            title: item.project_name,
            description: item.project_desc || '',
            highlight: this.highlightText(item.project_name, keyword),
            score: this.calculateScore(item.project_name, keyword),
            metadata: {
              groupId: item.group_id?.toString(),
            },
          });
        }

        if (type === 'project') {
          total = await Project.countDocuments(projectQuery);
        }
      }

      // 搜索分组
      if (type === 'all' || type === 'group') {
        const groupQuery = {
          $or: [
            { group_name: { $regex: keyword, $options: 'i' } },
            { group_desc: { $regex: keyword, $options: 'i' } },
          ],
        };

        const groups = await Group.find(groupQuery)
          .skip(type === 'all' ? 0 : skip)
          .limit(type === 'all' ? 10 : limit);

        for (const item of groups) {
          results.push({
            type: 'group',
            id: item._id.toString(),
            title: item.group_name,
            description: item.group_desc || '',
            highlight: this.highlightText(item.group_name, keyword),
            score: this.calculateScore(item.group_name, keyword),
            metadata: {},
          });
        }

        if (type === 'group') {
          total = await Group.countDocuments(groupQuery);
        }
      }

      // 按相关性排序
      results.sort((a, b) => b.score - a.score);

      if (type === 'all') {
        results.splice(parseInt(pageSize));
        total = results.length;
      }

      if (ctx.state.user && ctx.state.user._id) {
        try {
          await SearchHistory.create({
            user_id: ctx.state.user._id,
            keyword: keyword,
            search_type: type,
            result_count: total,
          });
        } catch (historyError) {
          logger.warn({ error: historyError }, 'Failed to save search history');
        }
      }

      ctx.body = SearchController.success({
        results,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize)),
        },
        total,
      });
    } catch (error: any) {
      logger.error({ error }, 'Search error');
      ctx.status = 500;
      ctx.body = SearchController.error(error.message || '搜索失败');
    }
  }

  static highlightText(text: string, keyword: string) {
    if (!text || !keyword) return text;
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  static calculateScore(text: string, keyword: string) {
    if (!text || !keyword) return 0;
    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();

    if (lowerText === lowerKeyword) return 1.0;
    if (lowerText.startsWith(lowerKeyword)) return 0.9;
    if (lowerText.includes(lowerKeyword)) return 0.7;
    return 0.5;
  }

  static async getSuggestions(ctx: Koa.Context) {
    try {
      const { q, limit = 5 } = ctx.query as any;
      if (!q || q.trim().length === 0) {
        ctx.body = SearchController.success([]);
        return;
      }

      const keyword = q.trim();
      const interfaces = await Interface.find({
        title: { $regex: keyword, $options: 'i' },
      }).limit(parseInt(limit)).select('title');

      const suggestions = interfaces.map(item => ({
        text: item.title,
        type: 'interface',
        count: 1,
      }));

      ctx.body = SearchController.success(suggestions.slice(0, parseInt(limit)));
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = SearchController.error(error.message || '获取搜索建议失败');
    }
  }

  static async getHistory(ctx: Koa.Context) {
    try {
      const user = ctx.state.user;
      const { limit = 10 } = ctx.query as any;

      if (!user || !user._id) {
        ctx.status = 401;
        ctx.body = SearchController.error('用户未认证');
        return;
      }

      const histories = await SearchHistory.find({ user_id: user._id })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean();

      ctx.body = SearchController.success(histories);
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = SearchController.error(error.message || '获取搜索历史失败');
    }
  }

  static async clearHistory(ctx: Koa.Context) {
    try {
      const user = ctx.state.user;
      if (!user || !user._id) {
        ctx.status = 401;
        ctx.body = SearchController.error('用户未认证');
        return;
      }

      await SearchHistory.deleteMany({ user_id: user._id });
      ctx.body = SearchController.success(null, '搜索历史已清除');
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = SearchController.error(error.message || '清除搜索历史失败');
    }
  }
}

export default SearchController;
