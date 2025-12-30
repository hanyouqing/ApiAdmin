/**
 * 前端插件加载器
 * 负责加载和集成前端插件
 */

export interface PluginManifest {
  name: string;
  version: string;
  displayName: string;
  description?: string;
  entry?: {
    client?: string;
  };
  routes?: Array<{
    path: string;
    component?: string;
  }>;
  menus?: Array<{
    key: string;
    label: string;
    icon?: string;
    path: string;
  }>;
  tabs?: Array<{
    key: string;
    label: string;
    component: string;
    target: string;
  }>;
}

export interface PluginInstance {
  manifest: PluginManifest;
  component?: React.ComponentType<any>;
  routes?: Array<{
    path: string;
    component: React.ComponentType<any>;
  }>;
}

class PluginLoader {
  private plugins: Map<string, PluginInstance> = new Map();
  private registeredRoutes: Array<{ path: string; component: React.ComponentType<any> }> = [];
  private registeredMenus: Array<{ key: string; label: string; icon?: string; path: string }> = [];
  private registeredTabs: Map<string, Array<{ key: string; label: string; component: React.ComponentType<any> }>> = new Map();

  /**
   * 加载插件
   */
  async loadPlugin(manifest: PluginManifest): Promise<PluginInstance | null> {
    try {
      if (this.plugins.has(manifest.name)) {
        console.warn(`Plugin ${manifest.name} already loaded`);
        return this.plugins.get(manifest.name)!;
      }

      let component: React.ComponentType<any> | undefined;
      const routes: Array<{ path: string; component: React.ComponentType<any> }> = [];

      if (manifest.entry?.client) {
        try {
          // @vite-ignore - Dynamic plugin import path cannot be statically analyzed
          const module = await import(/* @vite-ignore */ `../../Plugins/${manifest.name}/${manifest.entry.client}`);
          component = module.default || module;
        } catch (error) {
          console.error(`Failed to load plugin component for ${manifest.name}:`, error);
        }
      }

      if (manifest.routes) {
        for (const route of manifest.routes) {
          try {
            const routePath = route.component 
              ? `../../Plugins/${manifest.name}/${route.component}`
              : manifest.entry?.client 
                ? `../../Plugins/${manifest.name}/${manifest.entry.client}`
                : null;

            if (routePath) {
              // @vite-ignore - Dynamic plugin import path cannot be statically analyzed
              const routeModule = await import(/* @vite-ignore */ routePath);
              const routeComponent = routeModule.default || routeModule;
              routes.push({
                path: route.path,
                component: routeComponent,
              });
            }
          } catch (error) {
            console.error(`Failed to load route for ${manifest.name}:`, error);
          }
        }
      }

      const instance: PluginInstance = {
        manifest,
        component,
        routes,
      };

      this.plugins.set(manifest.name, instance);
      this.registerPluginRoutes(manifest.name, routes);
      this.registerPluginMenus(manifest);
      this.registerPluginTabs(manifest);

      return instance;
    } catch (error) {
      console.error(`Failed to load plugin ${manifest.name}:`, error);
      return null;
    }
  }

  /**
   * 卸载插件
   */
  unloadPlugin(pluginName: string): void {
    this.plugins.delete(pluginName);
    this.registeredRoutes = this.registeredRoutes.filter(r => !r.path.startsWith(`/plugin/${pluginName}`));
    this.registeredMenus = this.registeredMenus.filter(m => !m.key.startsWith(`${pluginName}:`));
    this.registeredTabs.delete(pluginName);
  }

  /**
   * 注册插件路由
   */
  private registerPluginRoutes(pluginName: string, routes: Array<{ path: string; component: React.ComponentType<any> }>): void {
    for (const route of routes) {
      this.registeredRoutes.push({
        path: `/plugin/${pluginName}${route.path}`,
        component: route.component,
      });
    }
  }

  /**
   * 注册插件菜单
   */
  private registerPluginMenus(manifest: PluginManifest): void {
    if (manifest.menus) {
      for (const menu of manifest.menus) {
        this.registeredMenus.push({
          key: `${manifest.name}:${menu.key}`,
          label: menu.label,
          icon: menu.icon,
          path: menu.path,
        });
      }
    }
  }

  /**
   * 注册插件 Tab
   */
  private registerPluginTabs(manifest: PluginManifest): void {
    if (manifest.tabs) {
      const tabs: Array<{ key: string; label: string; component: React.ComponentType<any> }> = [];
      
      for (const tab of manifest.tabs) {
        try {
          const tabPath = `../../Plugins/${manifest.name}/${tab.component}`;
          // @vite-ignore - Dynamic plugin import path cannot be statically analyzed
          import(/* @vite-ignore */ tabPath).then(module => {
            tabs.push({
              key: tab.key,
              label: tab.label,
              component: module.default || module,
            });
          }).catch(error => {
            console.error(`Failed to load tab component for ${manifest.name}:`, error);
          });
        } catch (error) {
          console.error(`Failed to load tab for ${manifest.name}:`, error);
        }
      }

      this.registeredTabs.set(manifest.name, tabs);
    }
  }

  /**
   * 获取所有注册的路由
   */
  getRoutes(): Array<{ path: string; component: React.ComponentType<any> }> {
    return this.registeredRoutes;
  }

  /**
   * 获取所有注册的菜单
   */
  getMenus(): Array<{ key: string; label: string; icon?: string; path: string }> {
    return this.registeredMenus;
  }

  /**
   * 获取指定目标的 Tab
   */
  getTabs(target: string): Array<{ key: string; label: string; component: React.ComponentType<any> }> {
    const tabs: Array<{ key: string; label: string; component: React.ComponentType<any> }> = [];
    
    for (const [pluginName, pluginTabs] of this.registeredTabs.entries()) {
      const manifest = this.plugins.get(pluginName)?.manifest;
      if (manifest?.tabs) {
        const targetTabs = manifest.tabs.filter(t => t.target === target);
        for (const tab of targetTabs) {
          const tabComponent = pluginTabs.find(t => t.key === tab.key);
          if (tabComponent) {
            tabs.push(tabComponent);
          }
        }
      }
    }

    return tabs;
  }

  /**
   * 获取插件实例
   */
  getPlugin(pluginName: string): PluginInstance | undefined {
    return this.plugins.get(pluginName);
  }

  /**
   * 获取所有已加载的插件
   */
  getPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }
}

export const pluginLoader = new PluginLoader();

