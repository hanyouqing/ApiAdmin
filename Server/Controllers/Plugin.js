import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import Plugin from '../Models/Plugin.js';
import { pluginManager } from '../Utils/pluginManager.js';
import { registerPluginRoutes } from '../Utils/pluginRouter.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PluginController extends BaseController {
  static get ControllerName() { return 'PluginController'; }

  static async listPlugins(ctx) {
    try {
      // 检查数据库连接
      const mongoose = (await import('mongoose')).default;
      if (mongoose.connection.readyState !== 1) {
        logger.warn({ readyState: mongoose.connection.readyState }, 'Database not connected in listPlugins');
        ctx.status = 503;
        ctx.body = PluginController.success([]);
        return;
      }

      const { enabled, category } = ctx.query;
      const query = {};

      if (enabled !== undefined) {
        query.enabled = enabled === 'true' || enabled === true;
      }

      if (category) {
        query.category = category;
      }

      let plugins = [];
      try {
        plugins = await Plugin.find(query)
          .populate({
            path: 'installedBy',
            select: 'username email',
            options: { lean: true }
          })
          .sort({ installedAt: -1 })
          .lean();
      } catch (dbError) {
        logger.error({ 
          error: {
            name: dbError?.name,
            message: dbError?.message,
            stack: dbError?.stack,
          },
          query
        }, 'Failed to query plugins from database');
        // 如果查询失败，返回空数组而不是错误
        ctx.body = PluginController.success([]);
        return;
      }
      
      // 如果 plugins 为 null 或 undefined，设置为空数组
      if (!plugins || !Array.isArray(plugins)) {
        plugins = [];
      }

      // 确保所有插件数据都是可序列化的普通对象
      // 使用 JSON.parse(JSON.stringify()) 来深度序列化，移除所有 Mongoose 特有的属性和方法
      let serializedPlugins = [];
      try {
        serializedPlugins = JSON.parse(JSON.stringify(plugins));
      } catch (serializeError) {
        logger.error({ 
          error: serializeError.message,
          stack: serializeError.stack,
          pluginCount: plugins.length
        }, 'Failed to serialize plugins, trying manual serialization');
        
        // 如果 JSON 序列化失败，尝试手动序列化
        serializedPlugins = plugins.map((plugin) => {
          try {
            // 如果 plugin 是 Mongoose 文档，转换为普通对象
            if (plugin && typeof plugin.toObject === 'function') {
              return plugin.toObject({ virtuals: false });
            }
            // 如果已经是普通对象，创建一个新的纯对象
            const pluginObj = {};
            Object.keys(plugin).forEach((key) => {
              if (key !== '__v') {
                const value = plugin[key];
                if (value && typeof value === 'object' && !Array.isArray(value) && typeof value.toObject === 'function') {
                  pluginObj[key] = value.toObject({ virtuals: false });
                } else if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'ObjectId') {
                  pluginObj[key] = value.toString();
                } else {
                  pluginObj[key] = value;
                }
              }
            });
            // 确保 _id 是字符串
            if (pluginObj._id && typeof pluginObj._id === 'object') {
              pluginObj._id = pluginObj._id.toString();
            }
            return pluginObj;
          } catch (itemError) {
            logger.warn({ error: itemError.message, pluginId: plugin?._id }, 'Failed to serialize plugin item');
            // 返回一个最小化的对象，至少包含 _id
            return { _id: plugin?._id?.toString() || null, name: plugin?.name || 'Unknown' };
          }
        });
      }

      const pluginsWithManifest = await Promise.all(
        serializedPlugins.map(async (plugin) => {
          try {
            if (!plugin || !plugin.name) {
              return plugin;
            }
            
            const pluginPath = path.join(__dirname, '../../Plugins', plugin.name);
            const manifestPath = path.join(pluginPath, 'manifest.json');
            
            if (await this.pathExists(manifestPath)) {
              try {
                const manifestContent = await fs.readFile(manifestPath, 'utf-8');
                const manifest = JSON.parse(manifestContent);
                return {
                  ...plugin,
                  manifest,
                };
              } catch (readError) {
                logger.warn({ error: readError, pluginName: plugin.name }, 'Failed to read or parse plugin manifest');
                return plugin;
              }
            }
            return plugin;
          } catch (error) {
            logger.warn({ error, pluginName: plugin?.name }, 'Failed to load plugin manifest');
            return plugin;
          }
        })
      );

      // 确保响应体可以被正确序列化
      try {
        // 测试序列化
        JSON.stringify(pluginsWithManifest);
        ctx.body = PluginController.success(pluginsWithManifest);
      } catch (testSerializeError) {
        logger.error({ 
          error: testSerializeError.message,
          stack: testSerializeError.stack,
          pluginCount: pluginsWithManifest.length
        }, 'Response body serialization test failed');
        
        // 如果测试序列化失败，返回空数组
        ctx.body = PluginController.success([]);
      }
    } catch (error) {
      logger.error({ 
        error: {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
        }
      }, 'List plugins error');
      ctx.status = 500;
      ctx.body = PluginController.error(
        process.env.NODE_ENV === 'production'
          ? '获取插件列表失败'
          : error.message || '获取插件列表失败'
      );
    }
  }

  static async pathExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static async getPlugin(ctx) {
    try {
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = PluginController.error('无效的插件 ID');
        return;
      }

      const plugin = await Plugin.findById(id)
        .populate('installedBy', 'username');

      if (!plugin) {
        ctx.status = 404;
        ctx.body = PluginController.error('插件不存在');
        return;
      }

      ctx.body = PluginController.success(plugin);
    } catch (error) {
      logger.error({ error }, 'Get plugin error');
      ctx.status = 500;
      ctx.body = PluginController.error(
        process.env.NODE_ENV === 'production'
          ? '获取插件失败'
          : error.message || '获取插件失败'
      );
    }
  }

  static async installLocal(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = PluginController.error('无权限安装插件');
        return;
      }

      const { pluginPath } = ctx.request.body;

      if (!pluginPath) {
        ctx.status = 400;
        ctx.body = PluginController.error('插件路径不能为空');
        return;
      }

      const fullPath = path.join(__dirname, '../../Plugins', pluginPath);
      
      // 检查路径安全性
      const resolvedPath = path.resolve(fullPath);
      const pluginsDir = path.resolve(__dirname, '../../Plugins');
      if (!resolvedPath.startsWith(pluginsDir)) {
        ctx.status = 400;
        ctx.body = PluginController.error('无效的插件路径');
        return;
      }

      // 读取 manifest.json
      const manifestPath = path.join(resolvedPath, 'manifest.json');
      let manifest;
      try {
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        manifest = JSON.parse(manifestContent);
      } catch (error) {
        ctx.status = 400;
        ctx.body = PluginController.error('无法读取插件清单文件');
        return;
      }

      // 检查插件是否已安装
      const existing = await Plugin.findOne({ name: manifest.name });
      if (existing) {
        ctx.status = 400;
        ctx.body = PluginController.error('插件已安装');
        return;
      }

      // 创建插件记录
      const plugin = new Plugin({
        name: manifest.name,
        displayName: manifest.displayName || manifest.name,
        version: manifest.version || '1.0.0',
        description: manifest.description || '',
        author: manifest.author || '',
        license: manifest.license || 'MIT',
        icon: manifest.icon || '',
        category: manifest.category || 'other',
        enabled: true,
        installed: true,
        dependencies: manifest.dependencies || {},
        routes: manifest.routes || [],
        hooks: manifest.hooks || [],
        permissions: manifest.permissions || [],
        configSchema: manifest.configSchema || {},
        config: {},
        installedBy: user._id,
      });

      await plugin.save();

      await pluginManager.loadPlugin(plugin);
      const router = (await import('../Router.js')).default;
      await registerPluginRoutes(router);

      logger.info({ userId: user._id, pluginId: plugin._id, pluginName: manifest.name }, 'Plugin installed');

      ctx.body = PluginController.success(plugin, '插件安装成功');
    } catch (error) {
      logger.error({ error }, 'Install local plugin error');
      ctx.status = 500;
      ctx.body = PluginController.error(
        process.env.NODE_ENV === 'production'
          ? '安装插件失败'
          : error.message || '安装插件失败'
      );
    }
  }

  static async uninstallPlugin(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = PluginController.error('无权限卸载插件');
        return;
      }

      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = PluginController.error('无效的插件 ID');
        return;
      }

      const plugin = await Plugin.findById(id);
      if (!plugin) {
        ctx.status = 404;
        ctx.body = PluginController.error('插件不存在');
        return;
      }

      await pluginManager.unloadPlugin(plugin.name);

      await plugin.deleteOne();

      logger.info({ userId: user._id, pluginId: id }, 'Plugin uninstalled');

      ctx.body = PluginController.success(null, '插件卸载成功');
    } catch (error) {
      logger.error({ error }, 'Uninstall plugin error');
      ctx.status = 500;
      ctx.body = PluginController.error(
        process.env.NODE_ENV === 'production'
          ? '卸载插件失败'
          : error.message || '卸载插件失败'
      );
    }
  }

  static async enablePlugin(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = PluginController.error('无权限修改插件状态');
        return;
      }

      const { id } = ctx.params;
      const { enabled } = ctx.request.body;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = PluginController.error('无效的插件 ID');
        return;
      }

      if (typeof enabled !== 'boolean') {
        ctx.status = 400;
        ctx.body = PluginController.error('enabled 必须是布尔值');
        return;
      }

      const plugin = await Plugin.findById(id);
      if (!plugin) {
        ctx.status = 404;
        ctx.body = PluginController.error('插件不存在');
        return;
      }

      plugin.enabled = enabled;
      await plugin.save();

      if (enabled) {
        await pluginManager.loadPlugin(plugin);
        const router = (await import('../Router.js')).default;
        await registerPluginRoutes(router);
      } else {
        await pluginManager.unloadPlugin(plugin.name);
      }

      logger.info({ userId: user._id, pluginId: id, enabled }, 'Plugin status updated');

      ctx.body = PluginController.success(plugin, '插件状态更新成功');
    } catch (error) {
      logger.error({ error }, 'Enable/disable plugin error');
      ctx.status = 500;
      ctx.body = PluginController.error(
        process.env.NODE_ENV === 'production'
          ? '更新插件状态失败'
          : error.message || '更新插件状态失败'
      );
    }
  }

  static async getPluginConfig(ctx) {
    try {
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = PluginController.error('无效的插件 ID');
        return;
      }

      const plugin = await Plugin.findById(id);
      if (!plugin) {
        ctx.status = 404;
        ctx.body = PluginController.error('插件不存在');
        return;
      }

      ctx.body = PluginController.success({
        config: plugin.config || {},
        schema: plugin.configSchema || {},
      });
    } catch (error) {
      logger.error({ error }, 'Get plugin config error');
      ctx.status = 500;
      ctx.body = PluginController.error(
        process.env.NODE_ENV === 'production'
          ? '获取插件配置失败'
          : error.message || '获取插件配置失败'
      );
    }
  }

  static async updatePluginConfig(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = PluginController.error('无权限修改插件配置');
        return;
      }

      const { id } = ctx.params;
      const { config: newConfig } = ctx.request.body;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = PluginController.error('无效的插件 ID');
        return;
      }

      const plugin = await Plugin.findById(id);
      if (!plugin) {
        ctx.status = 404;
        ctx.body = PluginController.error('插件不存在');
        return;
      }

      plugin.config = newConfig || {};
      await plugin.save();

      logger.info({ userId: user._id, pluginId: id }, 'Plugin config updated');

      ctx.body = PluginController.success(plugin, '插件配置更新成功');
    } catch (error) {
      logger.error({ error }, 'Update plugin config error');
      ctx.status = 500;
      ctx.body = PluginController.error(
        process.env.NODE_ENV === 'production'
          ? '更新插件配置失败'
          : error.message || '更新插件配置失败'
      );
    }
  }

  static async installDefaultPlugins(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = PluginController.error('无权限安装默认插件');
        return;
      }

      // 默认插件列表（排除模板）
      const defaultPlugins = ['CodeGenerator'];
      const installedPlugins = [];
      const skippedPlugins = [];

      for (const pluginName of defaultPlugins) {
        try {
          // 读取插件 manifest.json
          const pluginPath = path.join(__dirname, '../../Plugins', pluginName);
          const manifestPath = path.join(pluginPath, 'manifest.json');
          
          let manifest;
          try {
            const manifestContent = await fs.readFile(manifestPath, 'utf-8');
            manifest = JSON.parse(manifestContent);
          } catch (error) {
            logger.warn({ pluginName, error }, 'Failed to read plugin manifest');
            continue;
          }

          // 检查插件是否已安装（使用 manifest 中的 name）
          const existing = await Plugin.findOne({ name: manifest.name });
          if (existing) {
            skippedPlugins.push(pluginName);
            continue;
          }

          // 创建插件记录
          const plugin = new Plugin({
            name: manifest.name,
            displayName: manifest.displayName || manifest.name,
            version: manifest.version || '1.0.0',
            description: manifest.description || '',
            author: manifest.author || '',
            license: manifest.license || 'MIT',
            icon: manifest.icon || '',
            category: manifest.category || 'other',
            enabled: true,
            installed: true,
            dependencies: manifest.dependencies || {},
            entry: manifest.entry || {},
            routes: manifest.routes || [],
            hooks: manifest.hooks || [],
            permissions: manifest.permissions || [],
            configSchema: manifest.configSchema || {},
            config: {},
            installedBy: user._id,
          });

          await plugin.save();
          
          await pluginManager.loadPlugin(plugin);
          const router = (await import('../Router.js')).default;
          await registerPluginRoutes(router);
          
          installedPlugins.push(pluginName);
          logger.info({ userId: user._id, pluginId: plugin._id, pluginName: manifest.name }, 'Default plugin installed');
        } catch (error) {
          logger.error({ pluginName, error }, 'Failed to install default plugin');
        }
      }

      ctx.body = PluginController.success({
        installed: installedPlugins,
        skipped: skippedPlugins,
        total: defaultPlugins.length,
      }, `成功安装 ${installedPlugins.length} 个默认插件`);
    } catch (error) {
      logger.error({ error }, 'Install default plugins error');
      ctx.status = 500;
      ctx.body = PluginController.error(
        process.env.NODE_ENV === 'production'
          ? '安装默认插件失败'
          : error.message || '安装默认插件失败'
      );
    }
  }
}

export default PluginController;

