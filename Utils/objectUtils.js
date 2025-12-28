/**
 * 对象工具函数（前后端共享）
 */

/**
 * 深度克隆对象
 * @param {any} obj - 原对象
 * @returns {any} 克隆后的对象
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

/**
 * 深度合并对象
 * @param {Object} target - 目标对象
 * @param {...Object} sources - 源对象
 * @returns {Object} 合并后的对象
 */
export const deepMerge = (target, ...sources) => {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
};

/**
 * 判断是否为对象
 * @param {any} item - 待判断的值
 * @returns {boolean} 是否为对象
 */
const isObject = (item) => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

/**
 * 根据路径获取对象属性值
 * @param {Object} obj - 对象
 * @param {string} path - 路径（如 'user.name'）
 * @param {any} defaultValue - 默认值
 * @returns {any} 属性值
 */
export const get = (obj, path, defaultValue = undefined) => {
  if (!obj || typeof obj !== 'object') return defaultValue;
  
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === null || result === undefined) return defaultValue;
    result = result[key];
  }
  
  return result !== undefined ? result : defaultValue;
};

/**
 * 根据路径设置对象属性值
 * @param {Object} obj - 对象
 * @param {string} path - 路径（如 'user.name'）
 * @param {any} value - 值
 * @returns {Object} 修改后的对象
 */
export const set = (obj, path, value) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const keys = path.split('.');
  const lastKey = keys.pop();
  let current = obj;
  
  for (const key of keys) {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[lastKey] = value;
  return obj;
};

/**
 * 移除对象中的空值
 * @param {Object} obj - 对象
 * @returns {Object} 移除空值后的对象
 */
export const omitEmpty = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = {};
  for (const key in obj) {
    const value = obj[key];
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleaned = omitEmpty(value);
        if (Object.keys(cleaned).length > 0) {
          result[key] = cleaned;
        }
      } else {
        result[key] = value;
      }
    }
  }
  return result;
};

