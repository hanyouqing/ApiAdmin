/**
 * 验证工具函数（前后端共享 - TypeScript 版本）
 * 这些函数可以在 Server 和 Client 中使用
 */

/**
 * 验证邮箱格式
 */
export const validateEmail = (email: string | null | undefined): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 验证密码强度
 */
export interface PasswordValidationResult {
  valid: boolean;
  message?: string;
}

export const validatePassword = (password: string | null | undefined): PasswordValidationResult => {
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
 */
export const sanitizeString = (str: any): string => {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
};

/**
 * 递归清理输入数据
 */
export const sanitizeInput = <T>(input: T): T => {
  if (typeof input === 'string') {
    return sanitizeString(input) as T;
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput) as T;
  }
  if (input && typeof input === 'object') {
    const sanitized: any = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized as T;
  }
  return input;
};

/**
 * 验证 URL 格式
 */
export const validateUrl = (url: string | null | undefined): boolean => {
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
 */
export const validatePhone = (phone: string | null | undefined): boolean => {
  if (!phone || typeof phone !== 'string') return false;
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * 验证用户名格式
 */
export interface UsernameValidationResult {
  valid: boolean;
  message?: string;
}

export const validateUsername = (username: string | null | undefined): UsernameValidationResult => {
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

