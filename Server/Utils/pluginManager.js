import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Plugin from '../Models/Plugin.js';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 插件管理器
 * 负责插件的加载、Hook 执行、路由注册等
 */
export class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
    this.routes = [];
    this.pluginInstances = new Map();
  }

  /**
   * 初始化插件系统
   */
  async init() {
    try {
      const enabledPlugins = await Plugin.find({ enabled: true, installed: true });
      
      for (const pluginData of enabledPlugins) {
        try {
          await this.loadPlugin(pluginData);
        } catch (error) {
          logger.error({ error, pluginName: pluginData.name }, 'Failed to load plugin');
        }
      }

      logger.info({ loadedPlugins: this.plugins.size }, 'Plugin system initialized');
    } catch (error) {
      logger.error({ error }, 'Plugin system initialization failed');
    }
  }

  /**
   * 加载插件
   */
  async loadPlugin(pluginData) {
    try {
      const pluginPath = path.join(__dirname, '../../Plugins', pluginData.name);
      
      if (!await this.pathExists(pluginPath)) {
        logger.warn({ pluginName: pluginData.name }, 'Plugin directory not found');
        return;
      }

      const manifestPath = path.join(pluginPath, 'manifest.json');
      if (!await this.pathExists(manifestPath)) {
        logger.warn({ pluginName: pluginData.name }, 'Plugin manifest not found');
        return;
      }

      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      const entry = manifest.entry || pluginData.entry || {};
      if (entry.server) {
        const serverEntryPath = path.join(pluginPath, entry.server);
        const resolvedPath = path.resolve(serverEntryPath);
        
        if (await this.pathExists(resolvedPath)) {
          try {
            const pluginModule = await import(`file://${resolvedPath}`);
            const pluginInstance = pluginModule.default || pluginModule;

            if (typeof pluginInstance.init === 'function') {
              const initResult = await pluginInstance.init(this, pluginData);
              this.pluginInstances.set(pluginData.name, {
                instance: pluginInstance,
                data: pluginData,
                manifest,
                initResult,
              });
            }
          } catch (error) {
            logger.warn({ error, pluginName: pluginData.name, entryPath: resolvedPath }, 'Failed to load plugin server entry');
          }
        }
      }

      this.plugins.set(pluginData.name, {
        data: pluginData,
        manifest,
        path: pluginPath,
      });

      this.registerHooks(pluginData);
      this.registerRoutes(pluginData, pluginPath);

      logger.info({ pluginName: pluginData.name }, 'Plugin loaded');
    } catch (error) {
      logger.error({ error, pluginName: pluginData.name }, 'Failed to load plugin');
      throw error;
    }
  }

  /**
   * 卸载插件
   */
  async unloadPlugin(pluginName) {
    const plugin = this.pluginInstances.get(pluginName);
    if (plugin && typeof plugin.instance.destroy === 'function') {
      try {
        await plugin.instance.destroy();
      } catch (error) {
        logger.error({ error, pluginName }, 'Error destroying plugin');
      }
    }

    this.plugins.delete(pluginName);
    this.pluginInstances.delete(pluginName);
    this.unregisterHooks(pluginName);
    this.unregisterRoutes(pluginName);

    logger.info({ pluginName }, 'Plugin unloaded');
  }

  /**
   * 重新加载插件
   */
  async reloadPlugin(pluginName) {
    const pluginData = await Plugin.findOne({ name: pluginName, enabled: true, installed: true });
    if (!pluginData) {
      throw new Error(`Plugin ${pluginName} not found or not enabled`);
    }

    await this.unloadPlugin(pluginName);
    await this.loadPlugin(pluginData);
  }

  /**
   * 注册 Hook
   */
  registerHooks(pluginData) {
    if (!pluginData.hooks || !Array.isArray(pluginData.hooks)) {
      return;
    }

    const pluginPath = path.join(__dirname, '../../Plugins', pluginData.name);

    for (const hookName of pluginData.hooks) {
      if (!this.hooks.has(hookName)) {
        this.hooks.set(hookName, []);
      }

      const hookPath = path.join(pluginPath, 'Hooks', `${hookName}.js`);
      this.hooks.get(hookName).push({
        pluginName: pluginData.name,
        hookName,
        hookPath,
        pluginData,
      });
    }
  }

  /**
   * 注销 Hook
   */
  unregisterHooks(pluginName) {
    for (const [hookName, handlers] of this.hooks.entries()) {
      const filtered = handlers.filter(h => h.pluginName !== pluginName);
      if (filtered.length === 0) {
        this.hooks.delete(hookName);
      } else {
        this.hooks.set(hookName, filtered);
      }
    }
  }

  /**
   * 执行 Hook
   */
  async executeHook(hookName, context) {
    const handlers = this.hooks.get(hookName) || [];
    let result = context;

    for (const handler of handlers) {
      try {
        if (!await this.pathExists(handler.hookPath)) {
          logger.warn({ hookPath: handler.hookPath }, 'Hook file not found');
          continue;
        }

        const hookModule = await import(`file://${handler.hookPath}`);
        const hookFunction = hookModule.default || hookModule[hookName] || hookModule;

        if (typeof hookFunction === 'function') {
          const hookResult = await hookFunction(result, handler.pluginData);
          if (hookResult !== undefined) {
            result = hookResult;
          }
        }
      } catch (error) {
        logger.error({ error, hookName, pluginName: handler.pluginName }, 'Hook execution failed');
      }
    }

    return result;
  }

  /**
   * 注册路由
   */
  registerRoutes(pluginData, pluginPath) {
    if (!pluginData.routes || !Array.isArray(pluginData.routes)) {
      return;
    }

    for (const route of pluginData.routes) {
      this.routes.push({
        pluginName: pluginData.name,
        path: `/api/plugin/${pluginData.name}${route.path}`,
        method: route.method?.toUpperCase() || 'GET',
        handler: route.handler,
        handlerPath: path.join(pluginPath, route.handler.split('#')[0]),
        handlerMethod: route.handler.split('#')[1] || 'default',
        middleware: route.middleware || [],
        validation: route.validation || {},
        pluginData,
      });
    }
  }

  /**
   * 注销路由
   */
  unregisterRoutes(pluginName) {
    this.routes = this.routes.filter(r => r.pluginName !== pluginName);
  }

  /**
   * 获取所有注册的路由
   */
  getRoutes() {
    return this.routes;
  }

  /**
   * 获取插件实例
   */
  getPlugin(pluginName) {
    return this.pluginInstances.get(pluginName);
  }

  /**
   * 获取所有已加载的插件
   */
  getPlugins() {
    return Array.from(this.plugins.values());
  }

  /**
   * 检查路径是否存在
   */
  async pathExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export const pluginManager = new PluginManager();

