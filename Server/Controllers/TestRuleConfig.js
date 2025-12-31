import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import TestRuleConfig from '../Models/TestRuleConfig.js';
import Project from '../Models/Project.js';

class TestRuleConfigController extends BaseController {
  static get ControllerName() { return 'TestRuleConfigController'; }

  /**
   * 获取项目的规则配置列表
   */
  static async listRules(ctx) {
    try {
      const { projectId, type } = ctx.query;

      if (!projectId || !validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = TestRuleConfigController.error('项目 ID 不能为空');
        return;
      }

      const project = await Project.findById(projectId);
      if (!project) {
        ctx.status = 404;
        ctx.body = TestRuleConfigController.error('项目不存在');
        return;
      }

      const rules = await TestRuleConfig.getProjectRules(projectId, type);

      ctx.body = TestRuleConfigController.success(rules);
    } catch (error) {
      logger.error({ error }, 'List test rules error');
      ctx.status = 500;
      ctx.body = TestRuleConfigController.error(
        process.env.NODE_ENV === 'production'
          ? '获取规则配置失败'
          : error.message || '获取规则配置失败'
      );
    }
  }

  /**
   * 创建规则配置
   */
  static async createRule(ctx) {
    try {
      const user = ctx.state.user;
      const { projectId, name, type, enabled, assertion_rules, request_config, response_config, description } = ctx.request.body;

      if (!projectId || !validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = TestRuleConfigController.error('项目 ID 不能为空');
        return;
      }

      if (!name || !type) {
        ctx.status = 400;
        ctx.body = TestRuleConfigController.error('规则名称和类型不能为空');
        return;
      }

      if (!['assertion', 'request', 'response'].includes(type)) {
        ctx.status = 400;
        ctx.body = TestRuleConfigController.error('无效的规则类型');
        return;
      }

      const project = await Project.findById(projectId);
      if (!project) {
        ctx.status = 404;
        ctx.body = TestRuleConfigController.error('项目不存在');
        return;
      }

      const rule = new TestRuleConfig({
        project_id: projectId,
        name: sanitizeInput(name),
        type,
        enabled: enabled !== undefined ? enabled : true,
        assertion_rules: assertion_rules || {},
        request_config: request_config || {},
        response_config: response_config || {},
        description: description ? sanitizeInput(description) : '',
        createdBy: user._id,
      });

      await rule.save();

      logger.info({ userId: user._id, ruleId: rule._id, projectId }, 'Test rule created');

      ctx.body = TestRuleConfigController.success(rule, '规则配置创建成功');
    } catch (error) {
      logger.error({ error }, 'Create test rule error');
      ctx.status = 500;
      ctx.body = TestRuleConfigController.error(
        process.env.NODE_ENV === 'production'
          ? '创建规则配置失败'
          : error.message || '创建规则配置失败'
      );
    }
  }

  /**
   * 更新规则配置
   */
  static async updateRule(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      const updateData = ctx.request.body;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = TestRuleConfigController.error('无效的规则 ID');
        return;
      }

      const rule = await TestRuleConfig.findById(id);
      if (!rule) {
        ctx.status = 404;
        ctx.body = TestRuleConfigController.error('规则配置不存在');
        return;
      }

      // 验证项目权限
      const project = await Project.findById(rule.project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = TestRuleConfigController.error('项目不存在');
        return;
      }

      // 更新字段
      if (updateData.name !== undefined) {
        rule.name = sanitizeInput(updateData.name);
      }
      if (updateData.enabled !== undefined) {
        rule.enabled = updateData.enabled;
      }
      if (updateData.assertion_rules !== undefined) {
        rule.assertion_rules = { ...rule.assertion_rules, ...updateData.assertion_rules };
      }
      if (updateData.request_config !== undefined) {
        rule.request_config = { ...rule.request_config, ...updateData.request_config };
      }
      if (updateData.response_config !== undefined) {
        rule.response_config = { ...rule.response_config, ...updateData.response_config };
      }
      if (updateData.description !== undefined) {
        rule.description = sanitizeInput(updateData.description);
      }

      await rule.save();

      logger.info({ userId: user._id, ruleId: id }, 'Test rule updated');

      ctx.body = TestRuleConfigController.success(rule, '规则配置更新成功');
    } catch (error) {
      logger.error({ error }, 'Update test rule error');
      ctx.status = 500;
      ctx.body = TestRuleConfigController.error(
        process.env.NODE_ENV === 'production'
          ? '更新规则配置失败'
          : error.message || '更新规则配置失败'
      );
    }
  }

  /**
   * 删除规则配置
   */
  static async deleteRule(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = TestRuleConfigController.error('无效的规则 ID');
        return;
      }

      const rule = await TestRuleConfig.findById(id);
      if (!rule) {
        ctx.status = 404;
        ctx.body = TestRuleConfigController.error('规则配置不存在');
        return;
      }

      await rule.deleteOne();

      logger.info({ userId: user._id, ruleId: id }, 'Test rule deleted');

      ctx.body = TestRuleConfigController.success(null, '规则配置删除成功');
    } catch (error) {
      logger.error({ error }, 'Delete test rule error');
      ctx.status = 500;
      ctx.body = TestRuleConfigController.error(
        process.env.NODE_ENV === 'production'
          ? '删除规则配置失败'
          : error.message || '删除规则配置失败'
      );
    }
  }

  /**
   * 获取规则配置详情
   */
  static async getRule(ctx) {
    try {
      const { id } = ctx.params;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = TestRuleConfigController.error('无效的规则 ID');
        return;
      }

      const rule = await TestRuleConfig.findById(id);
      if (!rule) {
        ctx.status = 404;
        ctx.body = TestRuleConfigController.error('规则配置不存在');
        return;
      }

      ctx.body = TestRuleConfigController.success(rule);
    } catch (error) {
      logger.error({ error }, 'Get test rule error');
      ctx.status = 500;
      ctx.body = TestRuleConfigController.error(
        process.env.NODE_ENV === 'production'
          ? '获取规则配置失败'
          : error.message || '获取规则配置失败'
      );
    }
  }
}

export default TestRuleConfigController;

