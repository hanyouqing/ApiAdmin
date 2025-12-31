import { BaseController } from './Base.js';
import { logger } from '../Utils/logger.js';
import Interface from '../Models/Interface.js';
import Project from '../Models/Project.js';
import Group from '../Models/Group.js';

class SearchController extends BaseController {
  static get ControllerName() { return 'SearchController'; }

  static async search(ctx) {
    try {
      const { q, type = 'all', page = 1, pageSize = 10 } = ctx.query;

      if (!q || q.trim().length === 0) {
        ctx.status = 400;
        ctx.body = SearchController.error('搜索关键词不能为空');
        return;
      }

      const keyword = q.trim();
      const skip = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const results = [];
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
              projectId: item.project_id?._id?.toString(),
              projectName: item.project_id?.project_name,
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
            description: item.desc || '',
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

      // 如果 type === 'all'，限制结果数量
      if (type === 'all') {
        results.splice(parseInt(pageSize));
        total = results.length;
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
    } catch (error) {
      logger.error({ error }, 'Search error');
      ctx.status = 500;
      ctx.body = SearchController.error(
        process.env.NODE_ENV === 'production'
          ? '搜索失败'
          : error.message || '搜索失败'
      );
    }
  }

  static highlightText(text, keyword) {
    if (!text || !keyword) return text;
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  static calculateScore(text, keyword) {
    if (!text || !keyword) return 0;
    const lowerText = text.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();

    if (lowerText === lowerKeyword) return 1.0;
    if (lowerText.startsWith(lowerKeyword)) return 0.9;
    if (lowerText.includes(lowerKeyword)) return 0.7;
    return 0.5;
  }

  static async getSuggestions(ctx) {
    try {
      const { q, limit = 5 } = ctx.query;

      if (!q || q.trim().length === 0) {
        ctx.body = SearchController.success([]);
        return;
      }

      const keyword = q.trim();
      const suggestions = [];

      // 从接口名称获取建议
      const interfaces = await Interface.find({
        title: { $regex: keyword, $options: 'i' },
      })
        .limit(parseInt(limit))
        .select('title');

      for (const item of interfaces) {
        suggestions.push({
          text: item.title,
          type: 'interface',
          count: 1,
        });
      }

      ctx.body = SearchController.success(suggestions.slice(0, parseInt(limit)));
    } catch (error) {
      logger.error({ error }, 'Get search suggestions error');
      ctx.status = 500;
      ctx.body = SearchController.error(
        process.env.NODE_ENV === 'production'
          ? '获取搜索建议失败'
          : error.message || '获取搜索建议失败'
      );
    }
  }

  static async getHistory(ctx) {
    try {
      const user = ctx.state.user;
      const { limit = 10 } = ctx.query;

      // TODO: 从数据库获取用户的搜索历史
      // 临时返回空数组
      ctx.body = SearchController.success([]);
    } catch (error) {
      logger.error({ error }, 'Get search history error');
      ctx.status = 500;
      ctx.body = SearchController.error(
        process.env.NODE_ENV === 'production'
          ? '获取搜索历史失败'
          : error.message || '获取搜索历史失败'
      );
    }
  }

  static async clearHistory(ctx) {
    try {
      const user = ctx.state.user;

      // TODO: 清除用户的搜索历史

      ctx.body = SearchController.success(null, '搜索历史已清除');
    } catch (error) {
      logger.error({ error }, 'Clear search history error');
      ctx.status = 500;
      ctx.body = SearchController.error(
        process.env.NODE_ENV === 'production'
          ? '清除搜索历史失败'
          : error.message || '清除搜索历史失败'
      );
    }
  }
}

export default SearchController;


