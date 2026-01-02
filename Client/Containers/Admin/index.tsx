import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import UserManagement from './UserManagement';
import ProjectManagement from './ProjectManagement';
import InterfaceManagement from './InterfaceManagement';
import EnvironmentManagement from './EnvironmentManagement';
import SwaggerImport from './SwaggerImport';
import PostmanImport from './PostmanImport';
import SSOConfig from './SSOConfig';
import ThirdPartyAuth from './ThirdPartyAuth';
import WhitelistManagement from './WhitelistManagement';
import EmailConfig from './EmailConfig';
import OperationLog from './OperationLog';
import LoginLog from './LoginLog';
import PluginManagement from './PluginManagement';
import AIConfig from './AIConfig';
import TestManagement from './TestManagement';
import CodeManagement from './CodeManagement';

const Admin: React.FC = () => {
  return (
    <Routes>
      <Route path="user" element={<UserManagement />} />
      <Route path="project" element={<ProjectManagement />} />
      <Route path="interface" element={<InterfaceManagement />} />
      <Route path="environment" element={<EnvironmentManagement />} />
      <Route path="swagger-import" element={<SwaggerImport />} />
      <Route path="postman-import" element={<PostmanImport />} />
      <Route path="code" element={<CodeManagement />} />
      <Route path="sso" element={<SSOConfig />} />
      <Route path="third-party-auth" element={<ThirdPartyAuth />} />
      <Route path="whitelist" element={<WhitelistManagement />} />
      <Route path="email" element={<EmailConfig />} />
      <Route path="ai" element={<AIConfig />} />
      <Route path="test" element={<TestManagement />} />
      <Route path="operation-log" element={<OperationLog />} />
      <Route path="login-log" element={<LoginLog />} />
      <Route path="plugin" element={<PluginManagement />} />
      <Route path="*" element={<Navigate to="user" replace />} />
    </Routes>
  );
};

export default Admin;

