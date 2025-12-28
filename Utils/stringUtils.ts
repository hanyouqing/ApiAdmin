/**
 * 字符串工具函数（前后端共享 - TypeScript 版本）
 */

/**
 * 截取字符串
 */
export const truncate = (str: string | null | undefined, length: number = 50, suffix: string = '...'): string => {
  if (!str || typeof str !== 'string') return str || '';
  if (str.length <= length) return str;
  return str.substring(0, length) + suffix;
};

/**
 * 首字母大写
 */
export const capitalize = (str: string | null | undefined): string => {
  if (!str || typeof str !== 'string') return str || '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * 驼峰命名转换
 */
export const toCamelCase = (str: string | null | undefined): string => {
  if (!str || typeof str !== 'string') return str || '';
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
};

/**
 * 下划线命名转换
 */
export const toSnakeCase = (str: string | null | undefined): string => {
  if (!str || typeof str !== 'string') return str || '';
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
};

/**
 * 生成随机字符串
 */
export const randomString = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 移除 HTML 标签
 */
export const stripHtml = (html: string | null | undefined): string => {
  if (!html || typeof html !== 'string') return html || '';
  return html.replace(/<[^>]*>/g, '');
};

