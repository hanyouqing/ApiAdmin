/**
 * 全局 message 实例
 * 用于在 axios 拦截器等非组件环境中使用
 * 使用 App 组件提供的 message API（通过全局变量）
 */

import { message } from 'antd';

// 全局 App 实例（由 Application.tsx 设置）
let globalAppInstance: { message: typeof message } | null = null;

// 设置全局 App 实例（由 Application.tsx 调用）
export const setGlobalAppInstance = (app: { message: typeof message }) => {
  globalAppInstance = app;
};

// 创建一个智能的 message 实例
// 优先使用 App 组件提供的 message API，如果不可用则使用静态 API
export const messageInstance = {
  success: (content: string, duration?: number) => {
    if (globalAppInstance?.message) {
      return globalAppInstance.message.success(content, duration);
    }
    return message.success(content, duration);
  },
  error: (content: string, duration?: number) => {
    if (globalAppInstance?.message) {
      return globalAppInstance.message.error(content, duration);
    }
    return message.error(content, duration);
  },
  warning: (content: string, duration?: number) => {
    if (globalAppInstance?.message) {
      return globalAppInstance.message.warning(content, duration);
    }
    return message.warning(content, duration);
  },
  info: (content: string, duration?: number) => {
    if (globalAppInstance?.message) {
      return globalAppInstance.message.info(content, duration);
    }
    return message.info(content, duration);
  },
};

