import MockExpectation from '../Models/MockExpectation.js';
import Interface from '../Models/Interface.js';
import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';

class MockExpectationController extends BaseController {
  static get ControllerName() { return 'MockExpectationController'; }
  static async list(ctx) {
    try {
      const { interface_id } = ctx.query;

      if (!interface_id || !validateObjectId(interface_id)) {
        ctx.status = 400;
        ctx.body = MockExpectationController.error('无效的接口ID');
        return;
      }

      const expectations = await MockExpectation.find({ interface_id })
        .sort({ priority: -1, created_at: -1 });

      ctx.body = MockExpectationController.success(expectations);
    } catch (error) {
      logger.error({ error }, 'MockExpectation list error');
      ctx.status = 500;
      ctx.body = MockExpectationController.error(
        process.env.NODE_ENV === 'production' 
          ? '获取Mock期望列表失败' 
          : error.message || '获取Mock期望列表失败'
      );
    }
  }

  static async add(ctx) {
    try {
      const user = ctx.state.user;
      const { interface_id, name, ip_filter, query_filter, body_filter, response, enabled, priority } = ctx.request.body;

      if (!interface_id || !name) {
        ctx.status = 400;
        ctx.body = MockExpectationController.error('接口ID和期望名称不能为空');
        return;
      }

      if (!validateObjectId(interface_id)) {
        ctx.status = 400;
        ctx.body = MockExpectationController.error('无效的接口ID');
        return;
      }

      const interfaceData = await Interface.findById(interface_id);
      if (!interfaceData) {
        ctx.status = 404;
        ctx.body = MockExpectationController.error('接口不存在');
        return;
      }

      const expectation = new MockExpectation({
        interface_id,
        project_id: interfaceData.project_id,
        name: sanitizeInput(name),
        ip_filter: ip_filter || '',
        query_filter: query_filter || {},
        body_filter: body_filter || {},
        response: response || {
          status_code: 200,
          delay: 0,
          headers: {},
          body: '{}',
        },
        enabled: enabled !== undefined ? enabled : true,
        priority: priority || 0,
        uid: user._id,
      });

      await expectation.save();

      logger.info({ userId: user._id, expectationId: expectation._id }, 'MockExpectation created');

      ctx.body = MockExpectationController.success(expectation, '创建成功');
    } catch (error) {
      logger.error({ error }, 'MockExpectation add error');
      ctx.status = 500;
      ctx.body = MockExpectationController.error(
        process.env.NODE_ENV === 'production' 
          ? '创建失败' 
          : error.message || '创建失败'
      );
    }
  }

  static async update(ctx) {
    try {
      const user = ctx.state.user;
      const { _id, ...updateData } = ctx.request.body;

      if (!_id || !validateObjectId(_id)) {
        ctx.status = 400;
        ctx.body = MockExpectationController.error('无效的期望ID');
        return;
      }

      const expectation = await MockExpectation.findById(_id);
      if (!expectation) {
        ctx.status = 404;
        ctx.body = MockExpectationController.error('Mock期望不存在');
        return;
      }

      if (updateData.name) {
        updateData.name = sanitizeInput(updateData.name);
      }

      Object.assign(expectation, updateData);
      await expectation.save();

      logger.info({ userId: user._id, expectationId: expectation._id }, 'MockExpectation updated');

      ctx.body = MockExpectationController.success(expectation, '更新成功');
    } catch (error) {
      logger.error({ error }, 'MockExpectation update error');
      ctx.status = 500;
      ctx.body = MockExpectationController.error(
        process.env.NODE_ENV === 'production' 
          ? '更新失败' 
          : error.message || '更新失败'
      );
    }
  }

  static async delete(ctx) {
    try {
      const user = ctx.state.user;
      const { _id } = ctx.query;

      if (!_id || !validateObjectId(_id)) {
        ctx.status = 400;
        ctx.body = MockExpectationController.error('无效的期望ID');
        return;
      }

      const expectation = await MockExpectation.findById(_id);
      if (!expectation) {
        ctx.status = 404;
        ctx.body = MockExpectationController.error('Mock期望不存在');
        return;
      }

      await MockExpectation.findByIdAndDelete(_id);

      logger.info({ userId: user._id, expectationId: _id }, 'MockExpectation deleted');

      ctx.body = MockExpectationController.success(null, '删除成功');
    } catch (error) {
      logger.error({ error }, 'MockExpectation delete error');
      ctx.status = 500;
      ctx.body = MockExpectationController.error(
        process.env.NODE_ENV === 'production' 
          ? '删除失败' 
          : error.message || '删除失败'
      );
    }
  }
}

export default MockExpectationController;

