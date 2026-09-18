import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { logger } from './logger.js';

const execAsync = promisify(exec);

/**
 * 代码仓库服务
 * 支持 GitHub、GitLab、Gitee 等代码仓库的代码获取
 */
class CodeRepositoryService {
  /**
   * 从代码仓库获取文件内容
   */
  async getFileContent(repository, filePath, branch = null) {
    try {
      const branchName = branch || repository.branch || 'main';
      
      switch (repository.provider) {
        case 'github':
          return await this.getGitHubFileContent(repository, filePath, branchName);
        case 'gitlab':
          return await this.getGitLabFileContent(repository, filePath, branchName);
        case 'gitee':
          return await this.getGiteeFileContent(repository, filePath, branchName);
        default:
          throw new Error(`不支持的代码仓库提供商: ${repository.provider}`);
      }
    } catch (error) {
      logger.error({ error, repository: repository.provider, filePath }, 'Failed to get file content from repository');
      throw error;
    }
  }

  /**
   * 从 GitHub 获取文件内容
   */
  async getGitHubFileContent(repository, filePath, branch) {
    try {
      // 解析 GitHub URL: https://github.com/owner/repo
      const urlMatch = repository.repository_url.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!urlMatch) {
        throw new Error('无效的 GitHub 仓库 URL');
      }
      
      const owner = urlMatch[1];
      const repo = urlMatch[2].replace(/\.git$/, '');
      
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
      };
      
      if (repository.access_token) {
        headers['Authorization'] = `token ${repository.access_token}`;
      }
      
      const response = await axios.get(apiUrl, {
        headers,
        params: { ref: branch },
        timeout: 10000,
      });
      
      if (response.data.encoding === 'base64') {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }
      
      return response.data.content;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`文件不存在: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * 从 GitLab 获取文件内容
   */
  async getGitLabFileContent(repository, filePath, branch) {
    try {
      // 解析 GitLab URL: https://gitlab.com/owner/repo
      const urlMatch = repository.repository_url.match(/gitlab\.com\/([^/]+(?:\/[^/]+)*)/);
      if (!urlMatch) {
        throw new Error('无效的 GitLab 仓库 URL');
      }
      
      const projectPath = encodeURIComponent(urlMatch[1].replace(/\.git$/, ''));
      
      const apiUrl = `https://gitlab.com/api/v4/projects/${projectPath}/repository/files/${encodeURIComponent(filePath)}/raw`;
      const headers = {};
      
      if (repository.access_token) {
        headers['PRIVATE-TOKEN'] = repository.access_token;
      }
      
      const response = await axios.get(apiUrl, {
        headers,
        params: { ref: branch },
        timeout: 10000,
      });
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`文件不存在: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * 从 Gitee 获取文件内容
   */
  async getGiteeFileContent(repository, filePath, branch) {
    try {
      // 解析 Gitee URL: https://gitee.com/owner/repo
      const urlMatch = repository.repository_url.match(/gitee\.com\/([^/]+)\/([^/]+)/);
      if (!urlMatch) {
        throw new Error('无效的 Gitee 仓库 URL');
      }
      
      const owner = urlMatch[1];
      const repo = urlMatch[2].replace(/\.git$/, '');
      
      const apiUrl = `https://gitee.com/api/v5/repos/${owner}/${repo}/contents/${filePath}`;
      const headers = {};
      
      if (repository.access_token) {
        headers['Authorization'] = `token ${repository.access_token}`;
      }
      
      const response = await axios.get(apiUrl, {
        headers,
        params: { ref: branch },
        timeout: 10000,
      });
      
      if (response.data.encoding === 'base64') {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }
      
      return response.data.content;
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`文件不存在: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * 搜索相关代码文件
   */
  async searchFiles(repository, query, fileExtensions = ['.js', '.ts', '.jsx', '.tsx']) {
    // 这是一个简化实现，实际应该使用代码仓库的搜索API
    // 这里返回空数组，实际使用时需要根据具体仓库API实现
    logger.warn({ repository: repository.provider, query }, 'File search not fully implemented');
    return [];
  }

  /**
   * 根据接口路径推断代码文件路径
   */
  inferFilePath(interfacePath, projectBasePath = '') {
    // 根据接口路径推断可能的代码文件位置
    // 例如: /api/users -> src/routes/users.js 或 controllers/users.js
    const pathParts = interfacePath.split('/').filter(p => p);
    const basePath = projectBasePath || 'src';
    
    const possiblePaths = [
      `${basePath}/routes/${pathParts.join('/')}.js`,
      `${basePath}/controllers/${pathParts.join('/')}.js`,
      `${basePath}/api/${pathParts.join('/')}.js`,
      `${basePath}/handlers/${pathParts.join('/')}.js`,
    ];
    
    return possiblePaths;
  }

  /**
   * 拉取代码仓库（使用git clone/pull）
   */
  async cloneRepository(repository, targetPath = null) {
    try {
      const repoPath = targetPath || join(tmpdir(), `repo-${repository.project_id}-${Date.now()}`);
      
      // 确保目录存在
      await mkdir(repoPath, { recursive: true });

      let repoUrl = repository.repository_url;
      
      // 根据认证方式构建URL
      if (repository.auth_type === 'ssh' && repository.ssh_private_key) {
        // SSH方式：使用SSH URL
        repoUrl = this.convertToSSHUrl(repository.repository_url);
        
        // 写入SSH私钥
        const sshKeyPath = join(repoPath, 'id_rsa');
        await writeFile(sshKeyPath, repository.ssh_private_key, { mode: 0o600 });
        
        // 配置SSH
        const sshConfigPath = join(repoPath, 'ssh_config');
        await writeFile(sshConfigPath, 
          `Host *\n  StrictHostKeyChecking no\n  UserKnownHostsFile /dev/null\n  IdentityFile ${sshKeyPath}\n`,
          { mode: 0o644 }
        );
        
        // 构建SSH命令，如果私钥有密码则使用sshpass
        let sshCommand = `ssh -F ${sshConfigPath} -i ${sshKeyPath}`;
        if (repository.ssh_private_key_password) {
          // 使用sshpass传递密码（需要系统安装sshpass）
          // 转义密码中的特殊字符
          const escapedPassword = repository.ssh_private_key_password
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "'\\''");
          sshCommand = `sshpass -p '${escapedPassword}' ${sshCommand}`;
        }
        
        // 使用SSH配置克隆
        const env = {
          ...process.env,
          GIT_SSH_COMMAND: sshCommand,
        };
        
        try {
          await execAsync(`git clone ${repoUrl} .`, { cwd: repoPath, env });
        } catch (error) {
          // 如果失败且使用了sshpass，可能是sshpass未安装
          if (repository.ssh_private_key_password && error.message.includes('sshpass')) {
            throw new Error('SSH私钥密码功能需要系统安装sshpass工具。请安装sshpass或使用无密码的SSH私钥。');
          }
          throw error;
        }
        
        // 清理SSH密钥文件
        await rm(sshKeyPath, { force: true });
        await rm(sshConfigPath, { force: true });
      } else if (repository.auth_type === 'token' && repository.access_token) {
        // Token方式：在URL中嵌入token
        repoUrl = this.embedTokenInUrl(repository.repository_url, repository.access_token);
        await execAsync(`git clone ${repoUrl} .`, { cwd: repoPath });
      } else {
        // 公开仓库，直接克隆
        await execAsync(`git clone ${repoUrl} .`, { cwd: repoPath });
      }

      // 切换到指定分支
      if (repository.branch && repository.branch !== 'main' && repository.branch !== 'master') {
        try {
          await execAsync(`git checkout ${repository.branch}`, { cwd: repoPath });
        } catch (error) {
          logger.warn({ branch: repository.branch, error }, 'Failed to checkout branch, using default');
        }
      }

      logger.info({ projectId: repository.project_id, repoPath }, 'Repository cloned successfully');
      
      return repoPath;
    } catch (error) {
      logger.error({ error, repository: repository.provider }, 'Failed to clone repository');
      throw error;
    }
  }

  /**
   * 更新代码仓库（git pull）
   */
  async pullRepository(repository, repoPath) {
    try {
      // 获取当前分支
      const { stdout: currentBranch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: repoPath });
      const branch = repository.branch || currentBranch.trim() || 'main';

      // 拉取最新代码
      await execAsync(`git pull origin ${branch}`, { cwd: repoPath });
      
      logger.info({ projectId: repository.project_id, branch }, 'Repository pulled successfully');
    } catch (error) {
      logger.error({ error, repoPath }, 'Failed to pull repository');
      throw error;
    }
  }

  /**
   * 将HTTPS URL转换为SSH URL
   */
  convertToSSHUrl(httpsUrl) {
    // https://github.com/owner/repo -> git@github.com:owner/repo.git
    const match = httpsUrl.match(/https?:\/\/([^/]+)\/(.+)/);
    if (match) {
      const host = match[1];
      const path = match[2].replace(/\.git$/, '');
      return `git@${host}:${path}.git`;
    }
    return httpsUrl;
  }

  /**
   * 在URL中嵌入token
   */
  embedTokenInUrl(url, token) {
    // https://github.com/owner/repo -> https://token@github.com/owner/repo
    return url.replace(/https?:\/\//, `https://${token}@`);
  }

  /**
   * 获取本地代码文件内容
   */
  async getLocalFileContent(repoPath, filePath) {
    try {
      const fullPath = join(repoPath, filePath);
      const content = await readFile(fullPath, 'utf-8');
      return content;
    } catch (error) {
      logger.error({ error, repoPath, filePath }, 'Failed to read local file');
      throw new Error(`文件不存在或无法读取: ${filePath}`);
    }
  }

  /**
   * Create a draft PR with file updates (GitHub / GitLab). Never merges.
   * @param {object} repository
   * @param {{ title, body, files: {path, content}[], branchPrefix?: string }} payload
   */
  async createDraftPullRequest(repository, payload) {
    if (!repository?.access_token) {
      throw new Error('Code repository token required to create a draft PR');
    }
    if (!payload?.files?.length) {
      throw new Error('No file contents to commit for draft PR');
    }

    switch (repository.provider) {
      case 'github':
        return this.createGitHubDraftPR(repository, payload);
      case 'gitlab':
        return this.createGitLabDraftPR(repository, payload);
      default:
        throw new Error(`Draft PR not implemented for provider: ${repository.provider}`);
    }
  }

  parseGitHubOwnerRepo(repositoryUrl) {
    const urlMatch = repositoryUrl.match(/github\.com[/:]([^/]+)\/([^/]+)/);
    if (!urlMatch) throw new Error('Invalid GitHub repository URL');
    return {
      owner: urlMatch[1],
      repo: urlMatch[2].replace(/\.git$/, ''),
    };
  }

  async createGitHubDraftPR(repository, payload) {
    const { owner, repo } = this.parseGitHubOwnerRepo(repository.repository_url);
    const base = repository.branch || 'main';
    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${repository.access_token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    };
    const branch = `${payload.branchPrefix || 'apiadmin-fix'}-${Date.now()}`;

    const refRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${base}`, {
      headers,
      timeout: 15000,
    });
    const baseSha = refRes.data.object.sha;

    await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      { ref: `refs/heads/${branch}`, sha: baseSha },
      { headers, timeout: 15000 }
    );

    for (const file of payload.files) {
      let sha;
      try {
        const existing = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
          { headers, params: { ref: branch }, timeout: 15000 }
        );
        sha = existing.data.sha;
      } catch (error) {
        if (error.response?.status !== 404) throw error;
      }

      await axios.put(
        `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`,
        {
          message: `ApiAdmin AI fix: ${file.path}`,
          content: Buffer.from(file.content, 'utf8').toString('base64'),
          branch,
          ...(sha ? { sha } : {}),
        },
        { headers, timeout: 20000 }
      );
    }

    const prRes = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        title: payload.title,
        body: payload.body || '',
        head: branch,
        base,
        draft: true,
      },
      { headers, timeout: 15000 }
    );

    return {
      provider: 'github',
      draft: true,
      branch,
      number: prRes.data.number,
      url: prRes.data.html_url,
    };
  }

  async createGitLabDraftPR(repository, payload) {
    const match = repository.repository_url.match(/gitlab\.com[/:](.+?)(?:\.git)?$/);
    if (!match) throw new Error('Invalid GitLab repository URL');
    const projectPath = encodeURIComponent(match[1]);
    const base = repository.branch || 'main';
    const headers = { 'PRIVATE-TOKEN': repository.access_token };
    const branch = `${payload.branchPrefix || 'apiadmin-fix'}-${Date.now()}`;

    await axios.post(
      `https://gitlab.com/api/v4/projects/${projectPath}/repository/branches`,
      { branch, ref: base },
      { headers, timeout: 15000 }
    );

    for (const file of payload.files) {
      try {
        await axios.post(
          `https://gitlab.com/api/v4/projects/${projectPath}/repository/files/${encodeURIComponent(file.path)}`,
          {
            branch,
            content: file.content,
            commit_message: `ApiAdmin AI fix: ${file.path}`,
          },
          { headers, timeout: 20000 }
        );
      } catch (error) {
        if (error.response?.status === 400 || error.response?.status === 409) {
          await axios.put(
            `https://gitlab.com/api/v4/projects/${projectPath}/repository/files/${encodeURIComponent(file.path)}`,
            {
              branch,
              content: file.content,
              commit_message: `ApiAdmin AI fix: ${file.path}`,
            },
            { headers, timeout: 20000 }
          );
        } else {
          throw error;
        }
      }
    }

    const mrRes = await axios.post(
      `https://gitlab.com/api/v4/projects/${projectPath}/merge_requests`,
      {
        source_branch: branch,
        target_branch: base,
        title: payload.title,
        description: payload.body || '',
        draft: true,
      },
      { headers, timeout: 15000 }
    );

    return {
      provider: 'gitlab',
      draft: true,
      branch,
      number: mrRes.data.iid,
      url: mrRes.data.web_url,
    };
  }
}

export const codeRepositoryService = new CodeRepositoryService();
export default codeRepositoryService;

