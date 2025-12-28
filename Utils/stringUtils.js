/**
 * 字符串工具函数（前后端共享）
 */

/**
 * 截取字符串
 * @param {string} str - 原字符串
 * @param {number} length - 最大长度
 * @param {string} suffix - 后缀（默认 '...'）
 * @returns {string} 截取后的字符串
 */
export const truncate = (str, length = 50, suffix = '...') => {
  if (!str || typeof str !== 'string') return str;
  if (str.length <= length) return str;
  return str.substring(0, length) + suffix;
};

/**
 * 首字母大写
 * @param {string} str - 原字符串
 * @returns {string} 首字母大写的字符串
 */
export const capitalize = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * 驼峰命名转换
 * @param {string} str - 原字符串
 * @returns {string} 驼峰命名字符串
 */
export const toCamelCase = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
};

/**
 * 下划线命名转换
 * @param {string} str - 原字符串
 * @returns {string} 下划线命名字符串
 */
export const toSnakeCase = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
};

/**
 * 生成随机字符串
 * @param {number} length - 长度
 * @returns {string} 随机字符串
 */
export const randomString = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 移除 HTML 标签
 * @param {string} html - HTML 字符串
 * @returns {string} 纯文本
 */
export const stripHtml = (html) => {
  if (!html || typeof html !== 'string') return html;
  return html.replace(/<[^>]*>/g, '');
};

