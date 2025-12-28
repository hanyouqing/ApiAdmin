import Service from './Service.js';

const service = new Service();

export default {
  async generate(ctx) {
    try {
      const { interfaceData, language, environment, includeComments } = ctx.request.body;

      if (!interfaceData) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'interfaceData is required'
        };
        return;
      }

      const code = service.generate(interfaceData, {
        language: language || 'javascript',
        environment,
        includeComments: includeComments !== false
      });

      ctx.body = {
        success: true,
        data: {
          code,
          language: language || 'javascript'
        }
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

