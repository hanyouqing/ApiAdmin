/**
 * 数组工具函数（前后端共享 - TypeScript 版本）
 */

/**
 * 数组去重
 */
export const unique = <T>(arr: T[]): T[] => {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr)];
};

/**
 * 数组分组
 */
export const groupBy = <T>(arr: T[], key: keyof T | ((item: T) => string | number)): Record<string, T[]> => {
  if (!Array.isArray(arr)) return {};
  
  return arr.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? String(key(item)) : String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};

/**
 * 数组排序
 */
export const sortBy = <T>(arr: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
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
 */
export const paginate = <T>(arr: T[], page: number = 1, pageSize: number = 10): T[] => {
  if (!Array.isArray(arr)) return [];
  
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return arr.slice(start, end);
};

/**
 * 数组扁平化
 */
export const flatten = <T>(arr: T[], depth: number = Infinity): T[] => {
  if (!Array.isArray(arr)) return [];
  return arr.flat(depth) as T[];
};

