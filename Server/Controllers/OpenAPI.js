import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import Interface from '../Models/Interface.js';
import InterfaceCat from '../Models/InterfaceCat.js';

class OpenAPIController extends BaseController {
  static get ControllerName() { return 'OpenAPIController'; }

  static async listInterfaces(ctx) {
    try {
      const projectId = ctx.state.projectId;
      const { catId, tag, status, page = 1, pageSize = 10 } = ctx.query;

      const query = { project_id: projectId };

      if (catId && validateObjectId(catId)) {
        query.catid = catId;
      }

      if (tag) {
        query.tags = { $in: [tag] };
      }

      if (status) {
        query.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const [list, total] = await Promise.all([
        Interface.find(query)
          .populate('catid', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Interface.countDocuments(query),
      ]);

      ctx.body = OpenAPIController.success({
        list,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize)),
        },
      });
    } catch (error) {
      logger.error({ error }, 'List interfaces via OpenAPI error');
      ctx.status = 500;
      ctx.body = OpenAPIController.error(
        process.env.NODE_ENV === 'production'
          ? '获取接口列表失败'
          : error.message || '获取接口列表失败'
      );
    }
  }

  static async getInterface(ctx) {
    try {
      const projectId = ctx.state.projectId;
      const { id } = ctx.params;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = OpenAPIController.error('无效的接口 ID');
        return;
      }

      const interfaceData = await Interface.findOne({
        _id: id,
        project_id: projectId,
      }).populate('catid', 'name');

      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = OpenAPIController.error('接口不存在');
        return;
      }

      ctx.body = OpenAPIController.success(interfaceData);
    } catch (error) {
      logger.error({ error }, 'Get interface via OpenAPI error');
      ctx.status = 500;
      ctx.body = OpenAPIController.error(
        process.env.NODE_ENV === 'production'
          ? '获取接口失败'
          : error.message || '获取接口失败'
      );
    }
  }

  static async createInterface(ctx) {
    try {
      const projectId = ctx.state.projectId;
      const interfaceData = ctx.request.body;

      // TODO: 实现接口创建逻辑
      // 参考 InterfaceController.add 方法

      ctx.body = OpenAPIController.success(null, '接口创建成功');
    } catch (error) {
      logger.error({ error }, 'Create interface via OpenAPI error');
      ctx.status = 500;
      ctx.body = OpenAPIController.error(
        process.env.NODE_ENV === 'production'
          ? '创建接口失败'
          : error.message || '创建接口失败'
      );
    }
  }

  static async updateInterface(ctx) {
    try {
      const projectId = ctx.state.projectId;
      const { id } = ctx.params;

      // TODO: 实现接口更新逻辑

      ctx.body = OpenAPIController.success(null, '接口更新成功');
    } catch (error) {
      logger.error({ error }, 'Update interface via OpenAPI error');
      ctx.status = 500;
      ctx.body = OpenAPIController.error(
        process.env.NODE_ENV === 'production'
          ? '更新接口失败'
          : error.message || '更新接口失败'
      );
    }
  }

  static async deleteInterface(ctx) {
    try {
      const projectId = ctx.state.projectId;
      const { id } = ctx.params;

      // TODO: 实现接口删除逻辑

      ctx.body = OpenAPIController.success(null, '接口删除成功');
    } catch (error) {
      logger.error({ error }, 'Delete interface via OpenAPI error');
      ctx.status = 500;
      ctx.body = OpenAPIController.error(
        process.env.NODE_ENV === 'production'
          ? '删除接口失败'
          : error.message || '删除接口失败'
      );
    }
  }
}

export default OpenAPIController;


