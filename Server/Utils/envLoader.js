/**
 * 环境变量加载器
 * 支持：
 * 1. 自动监听 .env 和 .env.local 文件变化
 * 2. 环境变量覆盖默认值
 * 3. 优先级：系统环境变量 > .env.local > .env > 默认值
 */

import dotenv from 'dotenv';
import { watch } from 'fs';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const envPath = path.join(rootDir, '.env');
const envLocalPath = path.join(rootDir, '.env.local');

let watchers = [];
let reloadCallbacks = [];

/**
 * 加载环境变量文件
 * 优先级：系统环境变量 > .env.local > .env
 * dotenv 默认不会覆盖已存在的环境变量，所以系统环境变量优先级最高
 * @returns {{loadedFiles: string[], varSources: Map<string, string>}} 加载的文件和变量来源映射
 */
export function loadEnvFiles() {
  const loadedFiles = [];
  const varSources = new Map();
  
  // 记录加载前的系统环境变量（这些变量的来源是 'system'）
  const beforeLoad = new Set(Object.keys(process.env));
  
  // 先加载 .env（如果存在）
  if (existsSync(envPath)) {
    const result = dotenv.config({ path: envPath, override: false });
    if (!result.error) {
      loadedFiles.push('.env');
      // 记录从 .env 加载的变量（在加载前不存在的变量）
      Object.keys(result.parsed || {}).forEach(key => {
        if (!beforeLoad.has(key)) {
          varSources.set(key, '.env');
        }
      });
    }
  }
  
  // 再加载 .env.local（如果存在，会覆盖 .env 中的同名变量）
  if (existsSync(envLocalPath)) {
    const beforeLocalLoad = new Set(Object.keys(process.env));
    const result = dotenv.config({ path: envLocalPath, override: true });
    if (!result.error) {
      loadedFiles.push('.env.local');
      // 记录从 .env.local 加载的变量（在加载前不存在的变量，或覆盖了 .env 中的变量）
      Object.keys(result.parsed || {}).forEach(key => {
        if (!beforeLocalLoad.has(key) || varSources.get(key) === '.env') {
          varSources.set(key, '.env.local');
        }
      });
    }
  }
  
  // 记录系统环境变量（在加载前就存在的变量）
  beforeLoad.forEach(key => {
    if (!varSources.has(key)) {
      varSources.set(key, 'system');
    }
  });
  
  return { loadedFiles, varSources };
}

/**
 * 重新加载环境变量
 */
export function reloadEnvFiles() {
  // 清除已加载的环境变量（除了系统环境变量）
  // 注意：我们只清除从文件加载的变量，保留系统环境变量
  const systemEnv = { ...process.env };
  
  // 重新加载文件
  const result = loadEnvFiles();
  
  // 触发回调（回调中会使用 logger 统一输出日志）
  reloadCallbacks.forEach(callback => {
    try {
      callback(result.loadedFiles);
    } catch (error) {
      // 如果 logger 已初始化，错误会在回调中通过 logger 输出
      // 这里只做静默处理，避免格式不一致
    }
  });
  
  return result;
}

/**
 * 监听环境变量文件变化
 * @param {Function} callback - 文件变化时的回调函数
 */
export function watchEnvFiles(callback) {
  if (callback) {
    reloadCallbacks.push(callback);
  }
  
  // 只在开发环境启用文件监听
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  
  // 监听 .env 文件
  if (existsSync(envPath)) {
    try {
      const watcher = watch(envPath, { persistent: true }, (eventType) => {
        if (eventType === 'change') {
          // 通过 reloadEnvFiles 触发 onReload 回调，统一使用 logger 输出日志
          reloadEnvFiles();
        }
      });
      watchers.push(watcher);
    } catch (error) {
      // 错误通过 onReload 回调中的 logger 输出，这里只做静默处理
      // 如果 logger 已初始化，可以通过回调输出错误
    }
  }
  
  // 监听 .env.local 文件
  if (existsSync(envLocalPath)) {
    try {
      const watcher = watch(envLocalPath, { persistent: true }, (eventType) => {
        if (eventType === 'change') {
          // 通过 reloadEnvFiles 触发 onReload 回调，统一使用 logger 输出日志
          reloadEnvFiles();
        }
      });
      watchers.push(watcher);
    } catch (error) {
      // 错误通过 onReload 回调中的 logger 输出，这里只做静默处理
    }
  }
  
  // 如果文件不存在，监听目录以便在文件创建时也能检测到
  if (!existsSync(envPath) && !existsSync(envLocalPath)) {
    try {
      const watcher = watch(rootDir, { persistent: true }, (eventType, filename) => {
        if ((filename === '.env' || filename === '.env.local') && eventType === 'rename') {
          // 通过 reloadEnvFiles 触发 onReload 回调，统一使用 logger 输出日志
          reloadEnvFiles();
        }
      });
      watchers.push(watcher);
    } catch (error) {
      // 错误通过 onReload 回调中的 logger 输出，这里只做静默处理
    }
  }
}

/**
 * 停止监听环境变量文件
 */
export function stopWatching() {
  watchers.forEach(watcher => {
    try {
      watcher.close();
    } catch (error) {
      // 忽略关闭错误
    }
  });
  watchers = [];
  reloadCallbacks = [];
}

/**
 * 获取环境变量，支持默认值
 * 优先级：系统环境变量 > .env.local > .env > 默认值
 * @param {string} key - 环境变量名
 * @param {any} defaultValue - 默认值
 * @returns {any} 环境变量值或默认值
 */
export function getEnv(key, defaultValue = undefined) {
  // process.env 已经包含了所有优先级的环境变量
  // 因为 dotenv 不会覆盖已存在的系统环境变量
  return process.env[key] !== undefined ? process.env[key] : defaultValue;
}

/**
 * 初始化环境变量加载器
 * @param {Object} options - 配置选项
 * @param {boolean} options.watch - 是否启用文件监听（默认：开发环境启用）
 * @param {Function} options.onReload - 环境变量重新加载时的回调
 */
export function initEnvLoader(options = {}) {
  const { watch: enableWatch = process.env.NODE_ENV !== 'production', onReload } = options;
  
  // 初始加载
  const result = loadEnvFiles();
  
  // 启用文件监听
  if (enableWatch) {
    watchEnvFiles(onReload);
  }
  
  return {
    loadedFiles: result.loadedFiles,
    varSources: result.varSources,
    reload: reloadEnvFiles,
    stopWatching,
  };
}

// 导出文件路径（供其他模块使用）
export { envPath, envLocalPath, rootDir };

