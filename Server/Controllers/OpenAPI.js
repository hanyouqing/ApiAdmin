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
      const { title, path, method, catid, desc, tag, status, req_query, req_headers, req_body_type, req_body, res_body, res_body_type } = ctx.request.body;

      if (!title || !path || !method) {
        ctx.status = 400;
        ctx.body = OpenAPIController.error('接口名称、路径和方法不能为空');
        return;
      }

      const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      const upperMethod = method.toUpperCase();
      if (!validMethods.includes(upperMethod)) {
        ctx.status = 400;
        ctx.body = OpenAPIController.error('无效的HTTP方法');
        return;
      }

      if (catid && !validateObjectId(catid)) {
        ctx.status = 400;
        ctx.body = OpenAPIController.error('无效的分类ID');
        return;
      }

      // 验证分类是否属于该项目
      if (catid) {
        const cat = await InterfaceCat.findOne({
          _id: catid,
          project_id: projectId,
        });
        if (!cat) {
          ctx.status = 400;
          ctx.body = OpenAPIController.error('分类不存在或不属于该项目');
          return;
        }
      }

      const newInterface = new Interface({
        project_id: projectId,
        title: title.trim(),
        path: path.trim(),
        method: upperMethod,
        catid: catid || null,
        desc: desc || '',
        tag: Array.isArray(tag) ? tag : [],
        status: status || 'developing',
        req_query: Array.isArray(req_query) ? req_query : [],
        req_headers: Array.isArray(req_headers) ? req_headers : [],
        req_body_type: req_body_type || 'json',
        req_body: req_body || '',
        res_body: res_body || '',
        res_body_type: res_body_type || 'json',
        req_body_form: [],
        req_body_other: '',
        markdown: '',
        mock_script: '',
      });

      await newInterface.save();

      logger.info({ projectId, interfaceId: newInterface._id }, 'Interface created via OpenAPI');

      ctx.body = OpenAPIController.success(newInterface, '接口创建成功');
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
      const updateData = ctx.request.body;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = OpenAPIController.error('无效的接口 ID');
        return;
      }

      const interfaceData = await Interface.findOne({
        _id: id,
        project_id: projectId,
      });

      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = OpenAPIController.error('接口不存在');
        return;
      }

      // 验证方法
      if (updateData.method) {
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
        const upperMethod = updateData.method.toUpperCase();
        if (!validMethods.includes(upperMethod)) {
          ctx.status = 400;
          ctx.body = OpenAPIController.error('无效的HTTP方法');
          return;
        }
        updateData.method = upperMethod;
      }

      // 验证分类
      if (updateData.catid !== undefined) {
        if (updateData.catid && !validateObjectId(updateData.catid)) {
          ctx.status = 400;
          ctx.body = OpenAPIController.error('无效的分类ID');
          return;
        }
        if (updateData.catid) {
          const cat = await InterfaceCat.findOne({
            _id: updateData.catid,
            project_id: projectId,
          });
          if (!cat) {
            ctx.status = 400;
            ctx.body = OpenAPIController.error('分类不存在或不属于该项目');
            return;
          }
        }
      }

      // 更新字段
      if (updateData.title !== undefined) {
        interfaceData.title = updateData.title.trim();
      }
      if (updateData.path !== undefined) {
        interfaceData.path = updateData.path.trim();
      }
      if (updateData.method !== undefined) {
        interfaceData.method = updateData.method;
      }
      if (updateData.catid !== undefined) {
        interfaceData.catid = updateData.catid || null;
      }
      if (updateData.desc !== undefined) {
        interfaceData.desc = updateData.desc;
      }
      if (updateData.tag !== undefined) {
        interfaceData.tag = Array.isArray(updateData.tag) ? updateData.tag : [];
      }
      if (updateData.status !== undefined) {
        interfaceData.status = updateData.status;
      }
      if (updateData.req_query !== undefined) {
        interfaceData.req_query = Array.isArray(updateData.req_query) ? updateData.req_query : [];
      }
      if (updateData.req_headers !== undefined) {
        interfaceData.req_headers = Array.isArray(updateData.req_headers) ? updateData.req_headers : [];
      }
      if (updateData.req_body_type !== undefined) {
        interfaceData.req_body_type = updateData.req_body_type;
      }
      if (updateData.req_body !== undefined) {
        interfaceData.req_body = updateData.req_body;
      }
      if (updateData.res_body !== undefined) {
        interfaceData.res_body = updateData.res_body;
      }
      if (updateData.res_body_type !== undefined) {
        interfaceData.res_body_type = updateData.res_body_type;
      }

      await interfaceData.save();

      logger.info({ projectId, interfaceId: id }, 'Interface updated via OpenAPI');

      ctx.body = OpenAPIController.success(interfaceData, '接口更新成功');
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

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = OpenAPIController.error('无效的接口 ID');
        return;
      }

      const interfaceData = await Interface.findOne({
        _id: id,
        project_id: projectId,
      });

      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = OpenAPIController.error('接口不存在');
        return;
      }

      await Interface.findByIdAndDelete(id);

      logger.info({ projectId, interfaceId: id }, 'Interface deleted via OpenAPI');

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


