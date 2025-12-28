import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import CLIToken from '../Models/CLIToken.js';
import ProjectToken from '../Models/ProjectToken.js';
import { TestRunner } from '../Utils/testRunner.js';
import TestCollection from '../Models/TestCollection.js';
import { SwaggerImporter } from '../Utils/importers/SwaggerImporter.js';
import Project from '../Models/Project.js';

class CICDController extends BaseController {
  static get ControllerName() { return 'CICDController'; }

  static async generateCLIToken(ctx) {
    try {
      const user = ctx.state.user;
      let { name, projectId, expiresAt } = ctx.request.body;

      if (!name) {
        ctx.status = 400;
        ctx.body = CICDController.error('Token 名称不能为空');
        return;
      }

      name = sanitizeInput(name);

      if (projectId && !validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = CICDController.error('无效的项目 ID');
        return;
      }

      const token = CLIToken.generateToken();
      const expiresAtDate = expiresAt ? new Date(expiresAt) : null;

      const cliToken = new CLIToken({
        token,
        name,
        projectId: projectId || null,
        expiresAt: expiresAtDate,
        createdBy: user._id,
      });

      await cliToken.save();

      logger.info({ userId: user._id, tokenId: cliToken._id }, 'CLI token generated');

      ctx.body = CICDController.success({
        id: cliToken._id,
        token, // 仅返回一次
        name: cliToken.name,
        projectId: cliToken.projectId,
        expiresAt: cliToken.expiresAt,
        createdAt: cliToken.createdAt,
      }, 'CLI Token 生成成功');
    } catch (error) {
      logger.error({ error }, 'Generate CLI token error');
      ctx.status = 500;
      ctx.body = CICDController.error(
        process.env.NODE_ENV === 'production'
          ? '生成 CLI Token 失败'
          : error.message || '生成 CLI Token 失败'
      );
    }
  }

  static async listCLITokens(ctx) {
    try {
      const user = ctx.state.user;
      const tokens = await CLIToken.find({ createdBy: user._id })
        .populate('projectId', 'project_name')
        .sort({ createdAt: -1 });

      // 不返回 token 值
      const tokensData = tokens.map(t => ({
        id: t._id,
        name: t.name,
        projectId: t.projectId,
        expiresAt: t.expiresAt,
        lastUsedAt: t.lastUsedAt,
        createdAt: t.createdAt,
      }));

      ctx.body = CICDController.success(tokensData);
    } catch (error) {
      logger.error({ error }, 'List CLI tokens error');
      ctx.status = 500;
      ctx.body = CICDController.error(
        process.env.NODE_ENV === 'production'
          ? '获取 CLI Token 列表失败'
          : error.message || '获取 CLI Token 列表失败'
      );
    }
  }

  static async deleteCLIToken(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = CICDController.error('无效的 Token ID');
        return;
      }

      const token = await CLIToken.findById(id);
      if (!token) {
        ctx.status = 404;
        ctx.body = CICDController.error('CLI Token 不存在');
        return;
      }

      if (token.createdBy.toString() !== user._id.toString() && user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = CICDController.error('无权限删除此 Token');
        return;
      }

      await token.deleteOne();

      logger.info({ userId: user._id, tokenId: id }, 'CLI token deleted');

      ctx.body = CICDController.success(null, 'CLI Token 删除成功');
    } catch (error) {
      logger.error({ error }, 'Delete CLI token error');
      ctx.status = 500;
      ctx.body = CICDController.error(
        process.env.NODE_ENV === 'production'
          ? '删除 CLI Token 失败'
          : error.message || '删除 CLI Token 失败'
      );
    }
  }

  static async runTest(ctx) {
    try {
      const { collectionId, environment, format = 'json' } = ctx.request.body;

      if (!validateObjectId(collectionId)) {
        ctx.status = 400;
        ctx.body = CICDController.error('无效的测试集合 ID');
        return;
      }

      const collection = await TestCollection.findById(collectionId);
      if (!collection) {
        ctx.status = 404;
        ctx.body = CICDController.error('测试集合不存在');
        return;
      }

      const runner = new TestRunner();
      const report = await runner.runTestCollection(collectionId, environment || {});

      // 根据格式生成报告
      let content = '';
      if (format === 'junit') {
        // TODO: 实现 JUnit XML 格式
        content = '<?xml version="1.0" encoding="UTF-8"?><testsuites></testsuites>';
      } else if (format === 'allure') {
        // TODO: 实现 Allure 格式
        content = JSON.stringify(report, null, 2);
      } else {
        content = JSON.stringify(report, null, 2);
      }

      ctx.body = CICDController.success({
        report,
        format,
        content,
      });
    } catch (error) {
      logger.error({ error }, 'Run test via CLI error');
      ctx.status = 500;
      ctx.body = CICDController.error(
        process.env.NODE_ENV === 'production'
          ? '执行测试失败'
          : error.message || '执行测试失败'
      );
    }
  }

  static async syncSwagger(ctx) {
    try {
      const { url, projectId, mode = 'normal' } = ctx.request.body;

      if (!url || !projectId) {
        ctx.status = 400;
        ctx.body = CICDController.error('URL 和项目 ID 不能为空');
        return;
      }

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = CICDController.error('无效的项目 ID');
        return;
      }

      const project = await Project.findById(projectId);
      if (!project) {
        ctx.status = 404;
        ctx.body = CICDController.error('项目不存在');
        return;
      }

      // 获取 Swagger JSON
      const response = await fetch(url);
      if (!response.ok) {
        ctx.status = 400;
        ctx.body = CICDController.error('无法获取 Swagger 文档');
        return;
      }

      const swaggerData = await response.json();

      // 导入数据
      const importer = new SwaggerImporter();
      const result = await importer.import(swaggerData, {
        projectId,
        userId: ctx.state.user?._id || null,
        mode,
      });

      logger.info({ projectId, url, result }, 'Swagger synced via CLI');

      ctx.body = CICDController.success({
        importedCount: result.importedCount || 0,
        updatedCount: result.updatedCount || 0,
        failedCount: result.failedCount || 0,
      }, 'Swagger 同步完成');
    } catch (error) {
      logger.error({ error }, 'Sync Swagger via CLI error');
      ctx.status = 500;
      ctx.body = CICDController.error(
        process.env.NODE_ENV === 'production'
          ? 'Swagger 同步失败'
          : error.message || 'Swagger 同步失败'
      );
    }
  }
}

export default CICDController;

