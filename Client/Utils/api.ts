import axios, { AxiosInstance, AxiosError } from 'axios';
import { messageInstance } from './messageInstance';

const api: AxiosInstance = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object') {
      if (response.data.success === false) {
        const errorMessage = response.data.message || response.data.error || 'Request failed';
        messageInstance.error(errorMessage);
        return Promise.reject(new Error(errorMessage));
      }
    }
    return response;
  },
  (error: AxiosError<any>) => {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        localStorage.removeItem('token');
        const errorMsg = data?.message || 'Session expired, please login again';
        messageInstance.error(errorMsg);
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
        return Promise.reject(new Error('Unauthorized'));
      }

      if (status === 403) {
        const errorMsg = data?.message || 'Permission denied';
        messageInstance.error(errorMsg);
        return Promise.reject(new Error(errorMsg));
      }

      if (status === 404) {
        const errorMsg = data?.message || 'Resource not found';
        messageInstance.error(errorMsg);
        return Promise.reject(new Error(errorMsg));
      }

      if (status === 429) {
        const errorMsg = data?.message || 'Too many requests, please try again later';
        messageInstance.error(errorMsg);
        return Promise.reject(new Error(errorMsg));
      }

      if (status === 503) {
        const serviceMessage = data?.message || 'Service is starting, please try again later';
        messageInstance.warning(serviceMessage);
        return Promise.reject(new Error(serviceMessage));
      }

      if (status >= 500) {
        const errorMsg = data?.message || 'Server error, please try again later';
        messageInstance.error(errorMsg);
        return Promise.reject(new Error(errorMsg));
      }

      const errorMessage = data?.message || data?.error || `Request failed: ${status}`;
      messageInstance.error(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }

    if (error.request) {
      const errorMsg = 'Network error, please check your connection';
      messageInstance.error(errorMsg);
      return Promise.reject(new Error(errorMsg));
    }

    const errorMsg = 'Request failed, please try again';
    messageInstance.error(errorMsg);
    return Promise.reject(error);
  }
);

export { api };

