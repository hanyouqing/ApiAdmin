import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import DocumentVersion from '../Models/DocumentVersion.js';
import Project from '../Models/Project.js';
import Interface from '../Models/Interface.js';
import APIDesignController from './APIDesign.js';

/**
 * 交互式文档中心控制器
 * 处理文档自动发布、版本管理、在线调试等功能
 */
class DocumentCenterController extends BaseController {
  static get ControllerName() { return 'DocumentCenterController'; }

  /**
   * 生成项目文档
   */
  static async generateDocument(ctx) {
    try {
      const user = ctx.state.user;
      const { projectId, version } = ctx.request.body;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = DocumentCenterController.error('无效的项目 ID');
        return;
      }

      const project = await Project.findById(projectId);
      if (!project) {
        ctx.status = 404;
        ctx.body = DocumentCenterController.error('项目不存在');
        return;
      }

      const interfaces = await Interface.find({ project_id: projectId });

      const openapiSpec = this.generateOpenAPISpecForProject(project, interfaces);
      const documentContent = this.generateDocumentContent(project, interfaces);

      const latestVersion = await DocumentVersion.findOne({ project_id: projectId })
        .sort({ version_number: -1 });

      const versionNumber = latestVersion ? latestVersion.version_number + 1 : 1;
      const versionString = version || `1.0.${versionNumber}`;

      const documentVersion = new DocumentVersion({
        project_id: projectId,
        version: versionString,
        version_number: versionNumber,
        title: `${project.name} API 文档`,
        description: project.desc || '',
        content: documentContent,
        openapi_spec: openapiSpec,
        published: false,
        is_current: false,
        change_summary: '自动生成文档',
        created_by: user._id,
      });

      await documentVersion.save();

      logger.info({ userId: user._id, projectId, version: versionString }, 'Document generated');

      ctx.body = DocumentCenterController.success({
        documentId: documentVersion._id,
        version: versionString,
      }, '文档生成成功');
    } catch (error) {
      logger.error({ error }, 'Generate document error');
      ctx.status = 500;
      ctx.body = DocumentCenterController.error(
        process.env.NODE_ENV === 'production'
          ? '生成文档失败'
          : error.message || '生成文档失败'
      );
    }
  }

  /**
   * 发布文档
   */
  static async publishDocument(ctx) {
    try {
      const user = ctx.state.user;
      const { documentId } = ctx.request.body;

      if (!validateObjectId(documentId)) {
        ctx.status = 400;
        ctx.body = DocumentCenterController.error('无效的文档 ID');
        return;
      }

      const document = await DocumentVersion.findById(documentId);
      if (!document) {
        ctx.status = 404;
        ctx.body = DocumentCenterController.error('文档不存在');
        return;
      }

      await DocumentVersion.updateMany(
        { project_id: document.project_id, published: true },
        { $set: { published: false } }
      );

      document.published = true;
      document.published_at = new Date();
      document.published_by = user._id;
      document.is_current = true;

      await DocumentVersion.updateMany(
        { project_id: document.project_id },
        { $set: { is_current: false } }
      );

      await document.save();

      logger.info({ userId: user._id, documentId }, 'Document published');

      ctx.body = DocumentCenterController.success(null, '文档发布成功');
    } catch (error) {
      logger.error({ error }, 'Publish document error');
      ctx.status = 500;
      ctx.body = DocumentCenterController.error(
        process.env.NODE_ENV === 'production'
          ? '发布文档失败'
          : error.message || '发布文档失败'
      );
    }
  }

  /**
   * 获取已发布的文档
   */
  static async getPublishedDocument(ctx) {
    try {
      const { projectId } = ctx.query;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = DocumentCenterController.error('无效的项目 ID');
        return;
      }

      const document = await DocumentVersion.findOne({
        project_id: projectId,
        published: true,
      }).populate('published_by', 'username').populate('created_by', 'username');

      if (!document) {
        ctx.status = 404;
        ctx.body = DocumentCenterController.error('未找到已发布的文档');
        return;
      }

      ctx.body = DocumentCenterController.success(document);
    } catch (error) {
      logger.error({ error }, 'Get published document error');
      ctx.status = 500;
      ctx.body = DocumentCenterController.error(
        process.env.NODE_ENV === 'production'
          ? '获取文档失败'
          : error.message || '获取文档失败'
      );
    }
  }

  /**
   * 获取文档版本列表
   */
  static async listDocumentVersions(ctx) {
    try {
      const { projectId } = ctx.query;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = DocumentCenterController.error('无效的项目 ID');
        return;
      }

      const versions = await DocumentVersion.find({ project_id: projectId })
        .populate('created_by', 'username')
        .populate('published_by', 'username')
        .sort({ version_number: -1 });

      ctx.body = DocumentCenterController.success(versions);
    } catch (error) {
      logger.error({ error }, 'List document versions error');
      ctx.status = 500;
      ctx.body = DocumentCenterController.error(
        process.env.NODE_ENV === 'production'
          ? '获取版本列表失败'
          : error.message || '获取版本列表失败'
      );
    }
  }

  /**
   * 对比文档版本
   */
  static async compareDocumentVersions(ctx) {
    try {
      const { projectId, version1, version2 } = ctx.query;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = DocumentCenterController.error('无效的项目 ID');
        return;
      }

      const v1 = await DocumentVersion.findOne({
        project_id: projectId,
        $or: [
          { version: version1 },
          { version_number: parseInt(version1) || 0 },
        ],
      });

      const v2 = await DocumentVersion.findOne({
        project_id: projectId,
        $or: [
          { version: version2 },
          { version_number: parseInt(version2) || 0 },
        ],
      });

      if (!v1 || !v2) {
        ctx.status = 404;
        ctx.body = DocumentCenterController.error('版本不存在');
        return;
      }

      const diff = this.compareDocumentVersions(v1, v2);

      ctx.body = DocumentCenterController.success({
        version1: v1,
        version2: v2,
        diff,
      });
    } catch (error) {
      logger.error({ error }, 'Compare document versions error');
      ctx.status = 500;
      ctx.body = DocumentCenterController.error(
        process.env.NODE_ENV === 'production'
          ? '版本对比失败'
          : error.message || '版本对比失败'
      );
    }
  }

  /**
   * 生成项目的 OpenAPI 规范
   */
  static generateOpenAPISpecForProject(project, interfaces) {
    const baseUrl = project.basepath || '';

    const spec = {
      openapi: '3.0.0',
      info: {
        title: project.name,
        version: '1.0.0',
        description: project.desc || '',
      },
      servers: [
        {
          url: baseUrl,
          description: 'API Server',
        },
      ],
      paths: {},
    };

    for (const interfaceData of interfaces) {
      const pathSpec = APIDesignController.generateOpenAPISpec(interfaceData, '3.0.0');
      Object.assign(spec.paths, pathSpec.paths);
    }

    return spec;
  }

  /**
   * 生成文档内容
   */
  static generateDocumentContent(project, interfaces) {
    return {
      project: {
        name: project.name,
        description: project.desc,
      },
      interfaces: interfaces.map(i => ({
        id: i._id,
        title: i.title,
        path: i.path,
        method: i.method,
        description: i.desc,
      })),
    };
  }

  /**
   * 对比两个文档版本
   */
  static compareDocumentVersions(v1, v2) {
    return {
      title: v1.title !== v2.title,
      description: v1.description !== v2.description,
      content: JSON.stringify(v1.content) !== JSON.stringify(v2.content),
      openapi_spec: JSON.stringify(v1.openapi_spec) !== JSON.stringify(v2.openapi_spec),
    };
  }
}

export default DocumentCenterController;

