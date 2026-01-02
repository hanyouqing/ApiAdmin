import { BaseController } from './Base.js';
import { validateObjectId } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import CodeRepository from '../Models/CodeRepository.js';
import Project from '../Models/Project.js';

class CodeRepositoryController extends BaseController {
  static get ControllerName() { return 'CodeRepositoryController'; }

  /**
   * 获取项目的代码仓库配置
   */
  static async getRepository(ctx) {
    try {
      const { projectId } = ctx.params;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = CodeRepositoryController.error('无效的项目ID');
        return;
      }

      const repository = await CodeRepository.findOne({ project_id: projectId });

      ctx.body = CodeRepositoryController.success(repository || null);
    } catch (error) {
      logger.error({ error }, 'Get code repository error');
      ctx.status = 500;
      ctx.body = CodeRepositoryController.error(
        process.env.NODE_ENV === 'production'
          ? '获取代码仓库配置失败'
          : error.message || '获取代码仓库配置失败'
      );
    }
  }

  /**
   * 创建或更新代码仓库配置
   */
  static async saveRepository(ctx) {
    try {
      const user = ctx.state.user;
      const { projectId } = ctx.params;
      const { provider, repository_url, branch, auth_type, access_token, ssh_private_key, ssh_private_key_password, username, enabled, auto_sync } = ctx.request.body;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = CodeRepositoryController.error('无效的项目ID');
        return;
      }

      // 验证项目存在
      const project = await Project.findById(projectId);
      if (!project) {
        ctx.status = 404;
        ctx.body = CodeRepositoryController.error('项目不存在');
        return;
      }

      // 验证仓库URL格式
      if (!repository_url || !repository_url.trim()) {
        ctx.status = 400;
        ctx.body = CodeRepositoryController.error('仓库URL不能为空');
        return;
      }

      // 验证URL格式
      try {
        new URL(repository_url);
      } catch (urlError) {
        ctx.status = 400;
        ctx.body = CodeRepositoryController.error('无效的仓库URL格式');
        return;
      }

      // 查找或创建配置
      let repository = await CodeRepository.findOne({ project_id: projectId });

      if (repository) {
        repository.provider = provider;
        repository.repository_url = repository_url.trim();
        repository.branch = branch || 'main';
        repository.auth_type = auth_type || 'token';
        if (access_token && access_token !== '***') {
          repository.access_token = access_token;
        }
        if (ssh_private_key && ssh_private_key !== '***') {
          repository.ssh_private_key = ssh_private_key;
        }
        if (ssh_private_key_password !== undefined && ssh_private_key_password !== '***') {
          repository.ssh_private_key_password = ssh_private_key_password || '';
        }
        repository.username = username || '';
        repository.enabled = enabled !== undefined ? enabled : true;
        repository.auto_sync = auto_sync || false;
        await repository.save();
      } else {
        repository = await CodeRepository.create({
          project_id: projectId,
          provider,
          repository_url: repository_url.trim(),
          branch: branch || 'main',
          auth_type: auth_type || 'token',
          access_token: access_token && access_token !== '***' ? access_token : '',
          ssh_private_key: ssh_private_key && ssh_private_key !== '***' ? ssh_private_key : '',
          ssh_private_key_password: ssh_private_key_password !== undefined && ssh_private_key_password !== '***' ? (ssh_private_key_password || '') : '',
          username: username || '',
          enabled: enabled !== undefined ? enabled : true,
          auto_sync: auto_sync || false,
        });
      }

      logger.info({ userId: user._id, projectId, provider }, 'Code repository configured');

      ctx.body = CodeRepositoryController.success(repository, '代码仓库配置保存成功');
    } catch (error) {
      logger.error({ error }, 'Save code repository error');
      ctx.status = 500;
      ctx.body = CodeRepositoryController.error(
        process.env.NODE_ENV === 'production'
          ? '保存代码仓库配置失败'
          : error.message || '保存代码仓库配置失败'
      );
    }
  }

  /**
   * 删除代码仓库配置
   */
  static async deleteRepository(ctx) {
    try {
      const { projectId } = ctx.params;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = CodeRepositoryController.error('无效的项目ID');
        return;
      }

      await CodeRepository.findOneAndDelete({ project_id: projectId });

      ctx.body = CodeRepositoryController.success(null, '代码仓库配置已删除');
    } catch (error) {
      logger.error({ error }, 'Delete code repository error');
      ctx.status = 500;
      ctx.body = CodeRepositoryController.error(
        process.env.NODE_ENV === 'production'
          ? '删除代码仓库配置失败'
          : error.message || '删除代码仓库配置失败'
      );
    }
  }

  /**
   * 拉取代码仓库
   */
  static async pullCode(ctx) {
    try {
      const { projectId } = ctx.params;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = CodeRepositoryController.error('无效的项目ID');
        return;
      }

      const repository = await CodeRepository.findOne({ project_id: projectId, enabled: true });

      if (!repository) {
        ctx.status = 404;
        ctx.body = CodeRepositoryController.error('未配置代码仓库');
        return;
      }

      const { codeRepositoryService } = await import('../Utils/codeRepositoryService.js');
      
      // 拉取代码
      const repoPath = await codeRepositoryService.cloneRepository(repository);
      
      ctx.body = CodeRepositoryController.success({ repoPath }, '代码拉取成功');
    } catch (error) {
      logger.error({ error }, 'Pull code repository error');
      ctx.status = 500;
      ctx.body = CodeRepositoryController.error(
        process.env.NODE_ENV === 'production'
          ? '拉取代码失败'
          : error.message || '拉取代码失败'
      );
    }
  }

  /**
   * 使用AI补全单元测试
   */
  static async generateUnitTests(ctx) {
    try {
      const { projectId } = ctx.params;
      const { filePath, functionName, testFramework } = ctx.request.body;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = CodeRepositoryController.error('无效的项目ID');
        return;
      }

      if (!filePath) {
        ctx.status = 400;
        ctx.body = CodeRepositoryController.error('文件路径不能为空');
        return;
      }

      const repository = await CodeRepository.findOne({ project_id: projectId, enabled: true });

      if (!repository) {
        ctx.status = 404;
        ctx.body = CodeRepositoryController.error('未配置代码仓库');
        return;
      }

      const { codeRepositoryService } = await import('../Utils/codeRepositoryService.js');
      const { aiService } = await import('../Utils/aiService.js');

      // 获取源代码
      let sourceCode;
      try {
        sourceCode = await codeRepositoryService.getFileContent(repository, filePath);
      } catch (error) {
        // 如果通过API获取失败，尝试拉取代码后从本地读取
        const repoPath = await codeRepositoryService.cloneRepository(repository);
        sourceCode = await codeRepositoryService.getLocalFileContent(repoPath, filePath);
      }

      // 使用AI生成单元测试
      const result = await aiService.generateUnitTests(sourceCode, functionName, testFramework || 'jest');

      ctx.body = CodeRepositoryController.success(result, '单元测试生成成功');
    } catch (error) {
      logger.error({ error }, 'Generate unit tests error');
      ctx.status = 500;
      ctx.body = CodeRepositoryController.error(
        process.env.NODE_ENV === 'production'
          ? '生成单元测试失败'
          : error.message || '生成单元测试失败'
      );
    }
  }

  /**
   * 使用AI修复测试问题
   */
  static async fixTestIssues(ctx) {
    try {
      const { projectId } = ctx.params;
      const { testResultId, filePath, errorDetails } = ctx.request.body;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = CodeRepositoryController.error('无效的项目ID');
        return;
      }

      if (!testResultId || !filePath) {
        ctx.status = 400;
        ctx.body = CodeRepositoryController.error('测试结果ID和文件路径不能为空');
        return;
      }

      const AutoTestResult = (await import('../Models/AutoTestResult.js')).default;
      const testResult = await AutoTestResult.findById(testResultId).lean();

      if (!testResult) {
        ctx.status = 404;
        ctx.body = CodeRepositoryController.error('测试结果不存在');
        return;
      }

      const repository = await CodeRepository.findOne({ project_id: projectId, enabled: true });

      if (!repository) {
        ctx.status = 404;
        ctx.body = CodeRepositoryController.error('未配置代码仓库');
        return;
      }

      const { codeRepositoryService } = await import('../Utils/codeRepositoryService.js');
      const { aiService } = await import('../Utils/aiService.js');

      // 获取源代码
      let sourceCode;
      try {
        sourceCode = await codeRepositoryService.getFileContent(repository, filePath);
      } catch (error) {
        // 如果通过API获取失败，尝试拉取代码后从本地读取
        const repoPath = await codeRepositoryService.cloneRepository(repository);
        sourceCode = await codeRepositoryService.getLocalFileContent(repoPath, filePath);
      }

      // 使用AI修复问题
      const result = await aiService.fixTestIssues(testResult, sourceCode, errorDetails || {});

      ctx.body = CodeRepositoryController.success(result, '问题修复建议生成成功');
    } catch (error) {
      logger.error({ error }, 'Fix test issues error');
      ctx.status = 500;
      ctx.body = CodeRepositoryController.error(
        process.env.NODE_ENV === 'production'
          ? '修复测试问题失败'
          : error.message || '修复测试问题失败'
      );
    }
  }

  /**
   * 测试代码仓库连接
   */
  static async testConnection(ctx) {
    try {
      const { projectId } = ctx.params;

      if (!validateObjectId(projectId)) {
        ctx.status = 400;
        ctx.body = CodeRepositoryController.error('无效的项目ID');
        return;
      }

      const repository = await CodeRepository.findOne({ project_id: projectId, enabled: true });

      if (!repository) {
        ctx.status = 404;
        ctx.body = CodeRepositoryController.error('未配置代码仓库');
        return;
      }

      // 测试连接（尝试获取仓库信息）
      const { codeRepositoryService } = await import('../Utils/codeRepositoryService.js');
      
      // 尝试获取 README 文件来测试连接
      try {
        await codeRepositoryService.getFileContent(repository, 'README.md');
        ctx.body = CodeRepositoryController.success(null, '代码仓库连接成功');
      } catch (error) {
        ctx.status = 400;
        ctx.body = CodeRepositoryController.error(`连接失败: ${error.message}`);
      }
    } catch (error) {
      logger.error({ error }, 'Test code repository connection error');
      ctx.status = 500;
      ctx.body = CodeRepositoryController.error(
        process.env.NODE_ENV === 'production'
          ? '测试连接失败'
          : error.message || '测试连接失败'
      );
    }
  }
}

export default CodeRepositoryController;

