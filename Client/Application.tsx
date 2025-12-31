import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ConfigProvider, App } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import type { RootState, AppDispatch } from './Reducer/Create';
import { getUserInfo } from './Reducer/Modules/User';
import { antdTheme } from './Styles/theme';
import Login from './Containers/Login';
import Register from './Containers/Register';
import Home from './Containers/Home';
import Group from './Containers/Group';
import Project from './Containers/Project';
import User from './Containers/User';
import Admin from './Containers/Admin';
import Layout from './Components/Layout';
import ProjectManagement from './Containers/Admin/ProjectManagement';
import InterfaceManagement from './Containers/Admin/InterfaceManagement';
import EnvironmentManagement from './Containers/Admin/EnvironmentManagement';
import SwaggerImport from './Containers/Admin/SwaggerImport';
import PostmanImport from './Containers/Admin/PostmanImport';
import TestPipeline from './Containers/TestPipeline';

import { setGlobalAppInstance } from './Utils/messageInstance';
import { pluginLoader } from './Utils/pluginLoader';
import { api } from './Utils/api';

const getAntdLocale = (locale: string) => {
  return locale === 'zh-CN' ? zhCN : enUS;
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const token = useSelector((state: RootState) => state.user.token);
  const loading = useSelector((state: RootState) => state.user.loading);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // 检查 token（优先使用 Redux state，其次使用 localStorage）
    const currentToken = token || localStorage.getItem('token');
    
    if (!currentToken) {
      // 没有 token，不需要检查
      setHasChecked(true);
      return;
    }

    // 如果已经认证，不需要再次检查
    if (isAuthenticated) {
      setHasChecked(true);
      return;
    }

    // 如果已经检查过，不再重复检查
    if (hasChecked) {
      return;
    }

    // 有 token 但未认证，获取用户信息
    setHasChecked(true);
    dispatch(getUserInfo());
  }, [token, isAuthenticated, dispatch, hasChecked]);

  // 检查 token（优先使用 Redux state，其次使用 localStorage）
  const currentToken = token || localStorage.getItem('token');
  
  if (!currentToken) {
    return <Navigate to="/login" replace />;
  }

  // 如果正在加载用户信息，显示加载状态
  if (loading && !isAuthenticated) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Loading...</div>;
  }

  return <>{children}</>;
};

// 内部组件，用于获取 App 实例
const AppContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const app = App.useApp();
  
  // 将 App 实例保存到全局变量，供拦截器使用
  React.useEffect(() => {
    setGlobalAppInstance(app);
  }, [app]);
  
  return <>{children}</>;
};

const Application: React.FC = () => {
  const locale = useSelector((state: RootState) => state.ui.locale);
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const token = useSelector((state: RootState) => state.user.token);
  const [pluginRoutes, setPluginRoutes] = useState<Array<{ path: string; component: React.ComponentType<any> }>>([]);

  useEffect(() => {
    const loadPlugins = async () => {
      // 检查是否已认证，只有在已登录时才加载插件
      const currentToken = token || localStorage.getItem('token');
      if (!currentToken || !isAuthenticated) {
        // 没有 token 或未认证，不加载插件
        return;
      }

      try {
        // api.ts 的 baseURL 已经是 '/api'，所以这里只需要 'plugins'
        const response = await api.get('/plugins', { params: { enabled: true } });
        const plugins = response.data?.data || [];
        
        for (const plugin of plugins) {
          if (plugin.manifest) {
            try {
              await pluginLoader.loadPlugin(plugin.manifest);
            } catch (pluginError) {
              // 单个插件加载失败不影响其他插件
              console.warn(`Failed to load plugin ${plugin.name || plugin._id}:`, pluginError);
            }
          }
        }
        
        setPluginRoutes(pluginLoader.getRoutes());
      } catch (error: any) {
        // 如果是 401 错误，说明 token 无效，静默处理
        if (error.response?.status === 401) {
          // Token 无效，清除 token，不显示错误
          localStorage.removeItem('token');
          return;
        }
        // 插件功能是可选的，静默处理其他错误，避免影响主应用
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to load plugins (this is optional):', error);
        }
      }
    };

    loadPlugins();
  }, [isAuthenticated, token]);

  return (
    <ConfigProvider locale={getAntdLocale(locale)} theme={antdTheme}>
      <App>
        <AppContent>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/*"
                element={
                  <PrivateRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/group" element={<Group />} />
                        <Route path="/group/:groupId" element={<Group />} />
                        <Route path="/project" element={<ProjectManagement />} />
                        <Route path="/project/:projectId/*" element={<Project />} />
                        <Route path="/interface" element={<InterfaceManagement />} />
                        <Route path="/environment" element={<EnvironmentManagement />} />
                        <Route path="/swagger-import" element={<SwaggerImport />} />
                        <Route path="/postman-import" element={<PostmanImport />} />
                        <Route path="/test-pipeline" element={<TestPipeline />} />
                        <Route path="/user/*" element={<User />} />
                        <Route path="/admin/*" element={<Admin />} />
                        {pluginRoutes.map((route, index) => (
                          <Route key={index} path={route.path} element={<route.component />} />
                        ))}
                      </Routes>
                    </Layout>
                  </PrivateRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </AppContent>
      </App>
    </ConfigProvider>
  );
};


export default Application;

