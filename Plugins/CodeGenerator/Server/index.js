import Controller from './Controller.js';
import Service from './Service.js';

export default {
  name: 'code-generator',
  version: '1.0.0',
  
  async init(app, pluginManager) {
    this.app = app;
    this.pluginManager = pluginManager;
    this.service = new Service();
    
    return {
      routes: Controller,
      service: this.service
    };
  },
  
  async destroy() {
    // 清理资源
  }
};

