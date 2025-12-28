import Service from './Service.js';

const service = new Service();

export default {
  async action(ctx) {
    try {
      const { param } = ctx.request.body;

      // 处理逻辑
      const result = await service.doSomething(param);

      ctx.body = {
        success: true,
        data: result
      };
    } catch (error) {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: error.message
      };
    }
  }
};

