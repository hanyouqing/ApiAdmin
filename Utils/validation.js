/**
 * 验证工具函数（前后端共享）
 * 这些函数可以在 Server 和 Client 中使用
 */

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否为有效邮箱
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  // 不允许连续的点
  if (email.includes('..')) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 验证密码强度
 * @param {string} password - 密码
 * @returns {{valid: boolean, message?: string}} 验证结果
 */
export const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password) && !/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain letters' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain numbers' };
  }
  return { valid: true };
};

/**
 * 清理字符串（移除 HTML 标签和多余空格）
 * @param {string} str - 待清理的字符串
 * @returns {string} 清理后的字符串
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') {
    if (str === null || str === undefined) return '';
    return str;
  }
  // 移除HTML标签
  return str.replace(/<[^>]*>/g, '').trim();
};

/**
 * 递归清理输入数据
 * @param {any} input - 待清理的输入
 * @returns {any} 清理后的数据
 */
export const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return sanitizeString(input);
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (input && typeof input === 'object') {
    const sanitized = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
};

/**
 * 验证 URL 格式
 * @param {string} url - URL 地址
 * @returns {boolean} 是否为有效 URL
 */
export const validateUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * 验证手机号格式（中国）
 * @param {string} phone - 手机号
 * @returns {boolean} 是否为有效手机号
 */
export const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * 验证用户名格式
 * @param {string} username - 用户名
 * @returns {{valid: boolean, message?: string}} 验证结果
 */
export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') {
    return { valid: false, message: 'Username is required' };
  }
  if (username.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters' };
  }
  if (username.length > 20) {
    return { valid: false, message: 'Username must be at most 20 characters' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { valid: false, message: 'Username can only contain letters, numbers, underscores and hyphens' };
  }
  return { valid: true };
};

