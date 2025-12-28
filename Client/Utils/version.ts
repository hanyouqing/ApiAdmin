/**
 * 版本信息工具
 * 从 package.json 和环境变量中获取版本和构建信息
 */

// 从环境变量获取版本号（在构建时注入，开发环境从 package.json 读取）
const getVersion = (): string => {
  try {
    const envVersion = import.meta.env.VITE_APP_VERSION;
    if (envVersion) {
      return envVersion;
    }
    // 开发环境：尝试从 package.json 读取
    if (import.meta.env.DEV) {
      return '0.0.1'; // 默认版本，实际会从 vite.config.ts 注入
    }
    return '0.0.1';
  } catch {
    return '0.0.1';
  }
};

// 从环境变量获取 commit ID（在构建时注入）
const getCommitId = (): string => {
  try {
    const commitId = import.meta.env.VITE_APP_COMMIT_ID;
    if (commitId && commitId !== 'unknown') {
      return commitId;
    }
    // 开发环境：尝试从 git 获取（如果可用）
    if (import.meta.env.DEV) {
      return 'dev'; // 开发环境标识
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
};

// 从环境变量获取构建时间（在构建时注入）
const getBuildTime = (): string => {
  try {
    const buildTime = import.meta.env.VITE_APP_BUILD_TIME;
    if (buildTime) {
      return new Date(buildTime).toLocaleString('zh-CN');
    }
    // 开发环境不显示构建时间
    if (import.meta.env.DEV) {
      return '';
    }
    return '';
  } catch {
    return '';
  }
};

export const versionInfo = {
  version: getVersion(),
  commitId: getCommitId(),
  buildTime: getBuildTime(),
};

