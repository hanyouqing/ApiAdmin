import Koa from 'koa';
import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import { logOperation } from '../Utils/operationLogger.js';
import Interface from '../Models/Interface.js';
import Project from '../Models/Project.js';
import { PostmanImporter } from '../Utils/importers/PostmanImporter.js';
import { SwaggerImporter } from '../Utils/importers/SwaggerImporter.js';
import { HARImporter } from '../Utils/importers/HARImporter.js';
import { ApiAdminImporter } from '../Utils/importers/ApiAdminImporter.js';
import { JSONExporter } from '../Utils/exporters/JSONExporter.js';
import { SwaggerExporter } from '../Utils/exporters/SwaggerExporter.js';
import { MarkdownExporter } from '../Utils/exporters/MarkdownExporter.js';
import { HTMLExporter } from '../Utils/exporters/HTMLExporter.js';
import mongoose from 'mongoose';

// 定义经过认证的 Context 扩展
interface AuthenticatedContext extends Koa.Context {
  state: {
    user: {
      _id: mongoose.Types.ObjectId | string;
      role: string;
      username: string;
      email: string;
    };
  };
}

class ImportExportController extends BaseController {
  static get ControllerName() { return 'ImportExportController'; }

  static async import(ctx: AuthenticatedContext) {
    try {
      const user = ctx.state.user;
      const { project_id, format, mode = 'normal', data } = ctx.request.body as any;

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = ImportExportController.error('无效的项目ID');
        return;
      }

      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = ImportExportController.error('项目不存在');
        return;
      }

      let importer: any;
      switch (format) {
        case 'postman': importer = new PostmanImporter(); break;
        case 'swagger':
        case 'openapi': importer = new SwaggerImporter(); break;
        case 'har': importer = new HARImporter(); break;
        case 'apiadmin':
        case 'json': importer = new ApiAdminImporter(); break;
        default:
          ctx.status = 400;
          ctx.body = ImportExportController.error(`不支持的导入格式: ${format}`);
          return;
      }

      const result = await importer.import(data, {
        projectId: project_id,
        userId: user._id,
        mode,
      });

      await logOperation({
        type: 'interface',
        action: 'import',
        // @ts-ignore
        targetId: new mongoose.Types.ObjectId(project_id),
        targetName: project.project_name,
        userId: user._id as any,
        username: user.username,
        // @ts-ignore
        projectId: new mongoose.Types.ObjectId(project_id),
        details: { format, imported: result.imported || 0, mode },
        ip: ctx.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = ImportExportController.success(result, '导入成功');
    } catch (error: any) {
      logger.error({ error }, 'Import error');
      ctx.status = 500;
      ctx.body = ImportExportController.error(error.message || '导入失败');
    }
  }

  static async export(ctx: AuthenticatedContext) {
    try {
      const { project_id, format = 'json', interface_ids, public_only } = ctx.query;

      if (typeof project_id !== 'string' || !validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = ImportExportController.error('无效的项目ID');
        return;
      }

      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = ImportExportController.error('项目不存在');
        return;
      }

      let query: any = { project_id };
      if (typeof interface_ids === 'string') {
        const ids = interface_ids.split(',').filter((id) => validateObjectId(id));
        if (ids.length > 0) query._id = { $in: ids };
      }

      const interfaces = await Interface.find(query).populate('catid', 'name');

      let exporter: any;
      switch (format) {
        case 'json':
        case 'apiadmin': exporter = new JSONExporter(); break;
        case 'swagger':
        case 'openapi': exporter = new SwaggerExporter(); break;
        case 'markdown':
        case 'md': exporter = new MarkdownExporter(); break;
        case 'html': exporter = new HTMLExporter(); break;
        default:
          ctx.status = 400;
          ctx.body = ImportExportController.error(`不支持的导出格式: ${format}`);
          return;
      }

      const result = await exporter.export(interfaces, {
        project,
        publicOnly: public_only === 'true',
      });

      const isJson = format === 'json' || format === 'apiadmin' || format === 'swagger' || format === 'openapi';
      ctx.set('Content-Type', isJson ? 'application/json' : 'text/plain');
      const ext = (format === 'markdown' || format === 'md') ? 'md' : format === 'html' ? 'html' : 'json';
      ctx.set('Content-Disposition', `attachment; filename="export.${ext}"`);
      ctx.body = result;
    } catch (error: any) {
      logger.error({ error }, 'Export error');
      ctx.status = 500;
      ctx.body = ImportExportController.error(error.message || '导出失败');
    }
  }
}

export default ImportExportController;
