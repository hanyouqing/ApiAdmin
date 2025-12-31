/**
 * 数组工具函数（前后端共享）
 */

/**
 * 数组去重
 * @param {Array} arr - 原数组
 * @returns {Array} 去重后的数组
 */
export const unique = (arr) => {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr)];
};

/**
 * 数组分组
 * @param {Array} arr - 原数组
 * @param {Function|string} key - 分组键（函数或属性名）
 * @returns {Object} 分组后的对象
 */
export const groupBy = (arr, key) => {
  if (!Array.isArray(arr)) return {};
  
  return arr.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

/**
 * 数组排序
 * @param {Array} arr - 原数组
 * @param {string} key - 排序键
 * @param {string} order - 排序方向（'asc' | 'desc'）
 * @returns {Array} 排序后的数组
 */
export const sortBy = (arr, key, order = 'asc') => {
  if (!Array.isArray(arr)) return [];
  
  return [...arr].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * 数组分页
 * @param {Array} arr - 原数组
 * @param {number} page - 页码（从1开始）
 * @param {number} pageSize - 每页数量
 * @returns {Array} 分页后的数组
 */
export const paginate = (arr, page = 1, pageSize = 10) => {
  if (!Array.isArray(arr)) return [];
  
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return arr.slice(start, end);
};

/**
 * 数组扁平化
 * @param {Array} arr - 原数组
 * @param {number} depth - 深度（默认 Infinity）
 * @returns {Array} 扁平化后的数组
 */
export const flatten = (arr, depth = Infinity) => {
  if (!Array.isArray(arr)) return [];
  return arr.flat(depth);
};


