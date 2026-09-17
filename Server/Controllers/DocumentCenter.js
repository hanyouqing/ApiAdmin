import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import DocumentVersion from '../Models/DocumentVersion.js';
import Project from '../Models/Project.js';
import Interface from '../Models/Interface.js';
import APIDesignController from './APIDesign.js';

/**
 * Interactive document center — generate, publish, preview API docs.
 */
class DocumentCenterController extends BaseController {
  static get ControllerName() { return 'DocumentCenterController'; }

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

      const openapiSpec = DocumentCenterController.generateOpenAPISpecForProject(project, interfaces);
      const documentContent = DocumentCenterController.generateDocumentContent(project, interfaces);

      const latestVersion = await DocumentVersion.findOne({ project_id: projectId })
        .sort({ version_number: -1 });

      const versionNumber = latestVersion ? latestVersion.version_number + 1 : 1;
      const versionString = version || `1.0.${versionNumber}`;

      const documentVersion = new DocumentVersion({
        project_id: projectId,
        version: versionString,
        version_number: versionNumber,
        title: `${project.project_name || project.name} API 文档`,
        description: project.project_desc || project.desc || '',
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

  static async publishDocument(ctx) {
    try {
      const user = ctx.state.user;
      const { documentId, projectId } = ctx.request.body;

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

      if (projectId && document.project_id.toString() !== projectId.toString()) {
        ctx.status = 400;
        ctx.body = DocumentCenterController.error('文档不属于该项目');
        return;
      }

      await DocumentVersion.updateMany(
        { project_id: document.project_id, published: true },
        { $set: { published: false, is_current: false } }
      );

      document.published = true;
      document.published_at = new Date();
      document.published_by = user._id;
      document.is_current = true;

      await document.save();

      logger.info({ userId: user._id, documentId }, 'Document published');

      ctx.body = DocumentCenterController.success(document, '文档发布成功');
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
          { version_number: parseInt(version1, 10) || 0 },
        ],
      });

      const v2 = await DocumentVersion.findOne({
        project_id: projectId,
        $or: [
          { version: version2 },
          { version_number: parseInt(version2, 10) || 0 },
        ],
      });

      if (!v1 || !v2) {
        ctx.status = 404;
        ctx.body = DocumentCenterController.error('版本不存在');
        return;
      }

      const diff = DocumentCenterController.diffDocumentVersions(v1, v2);

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

  static generateOpenAPISpecForProject(project, interfaces) {
    const baseUrl = project.basepath || '';
    const title = project.project_name || project.name || 'API';
    const description = project.project_desc || project.desc || '';

    const spec = {
      openapi: '3.0.0',
      info: {
        title,
        version: '1.0.0',
        description,
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
      try {
        const pathSpec = APIDesignController.generateOpenAPISpec(interfaceData, '3.0.0');
        if (pathSpec?.paths) {
          Object.assign(spec.paths, pathSpec.paths);
        }
      } catch (err) {
        logger.warn({ err, interfaceId: interfaceData._id }, 'Skip interface OpenAPI path');
        const method = (interfaceData.method || 'get').toLowerCase();
        const path = interfaceData.path || '/';
        if (!spec.paths[path]) spec.paths[path] = {};
        spec.paths[path][method] = {
          summary: interfaceData.title || path,
          description: interfaceData.desc || '',
          responses: { '200': { description: 'Success' } },
        };
      }
    }

    return spec;
  }

  static generateDocumentContent(project, interfaces) {
    return {
      project: {
        name: project.project_name || project.name,
        description: project.project_desc || project.desc,
      },
      interfaces: interfaces.map((i) => ({
        id: i._id,
        title: i.title,
        path: i.path,
        method: i.method,
        description: i.desc,
      })),
    };
  }

  static diffDocumentVersions(v1, v2) {
    return {
      title: v1.title !== v2.title,
      description: v1.description !== v2.description,
      content: JSON.stringify(v1.content) !== JSON.stringify(v2.content),
      openapi_spec: JSON.stringify(v1.openapi_spec) !== JSON.stringify(v2.openapi_spec),
    };
  }
}

export default DocumentCenterController;
