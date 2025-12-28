// 从公共 Utils 导入共享的验证函数
import { validateEmail, validatePassword, sanitizeString, sanitizeInput } from '../../Utils/validation.js';
import mongoose from 'mongoose';

/**
 * 验证 MongoDB ObjectId（仅后端使用，依赖 mongoose）
 * @param {string} id - ObjectId 字符串
 * @returns {boolean} 是否为有效 ObjectId
 */
export const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// 重新导出共享函数，保持向后兼容
export { validateEmail, validatePassword, sanitizeString, sanitizeInput };

