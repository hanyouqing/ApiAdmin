import Router from 'koa-router';
import UserController from './Controllers/User.js';
import GroupController from './Controllers/Group.js';
import ProjectController from './Controllers/Project.js';
import InterfaceController from './Controllers/Interface.js';
import InterfaceCatController from './Controllers/InterfaceCat.js';
import UploadController from './Controllers/Upload.js';
import MonitorController from './Controllers/Monitor.js';
import MockExpectationController from './Controllers/MockExpectation.js';
import TestController from './Controllers/Test.js';
import ImportExportController from './Controllers/ImportExport.js';
import SSOController from './Controllers/SSO.js';
import ThirdPartyAuthController from './Controllers/ThirdPartyAuth.js';
import WhitelistController from './Controllers/Whitelist.js';
import EmailController from './Controllers/Email.js';
import PluginController from './Controllers/Plugin.js';
import CICDController from './Controllers/CICD.js';
import NotificationController from './Controllers/Notification.js';
import SearchController from './Controllers/Search.js';
import ProjectFollowController from './Controllers/ProjectFollow.js';
import OperationLogController from './Controllers/OperationLog.js';
import LoginLogController from './Controllers/LoginLog.js';
import ProjectTokenController from './Controllers/ProjectToken.js';
import OpenAPIController from './Controllers/OpenAPI.js';
import AutoTestController from './Controllers/AutoTest.js';
import UserCenterController from './Controllers/UserCenter.js';
import AnalyticsController from './Controllers/Analytics.js';
import AutoTestTaskController from './Controllers/AutoTestTask.js';
import TestEnvironmentController from './Controllers/TestEnvironment.js';
import PermissionController from './Controllers/Permission.js';
import { projectTokenAuth } from './Middleware/projectTokenAuth.js';
import { authMiddleware } from './Middleware/auth.js';
import { apiRateLimiter, authRateLimiter, registerRateLimiter } from './Middleware/rateLimiter.js';
import { upload, handleUploadError } from './Middleware/upload.js';
import { getVersionInfoFormatted } from './Utils/version.js';

const router = new Router();

router.get('/api/health', async (ctx) => {
  const mongoose = (await import('mongoose')).default;
  const { getDependencyStatus, isReady } = await import('./Utils/dependencyChecker.js');
  
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const ready = isReady();
  const dependencyStatus = getDependencyStatus();
  
  // 健康检查可以返回 ready 状态，但不执行业务逻辑
  ctx.body = {
    status: ready ? 'ready' : 'not ready',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    dependencies: {
      mongodb: {
        status: dependencyStatus.mongodb.status,
        message: dependencyStatus.mongodb.message,
      },
      redis: {
        status: dependencyStatus.redis.status,
        message: dependencyStatus.redis.message,
        optional: dependencyStatus.redis.optional,
      },
    },
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
  };
  
  // 如果服务未就绪，返回 503 Service Unavailable
  if (!ready) {
    ctx.status = 503;
  }
});

router.get('/version', async (ctx) => {
  try {
    const versionInfo = getVersionInfoFormatted();
    ctx.body = versionInfo;
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      error: 'Failed to get version information',
      buildTime: 'unknown',
      buildBranch: 'unknown',
      buildCommit: 'unknown',
      nodeVersion: process.version,
      npmVersion: 'unknown',
      appVersion: '0.0.1',
    };
  }
});

router.get('/api/version', async (ctx) => {
  try {
    const versionInfo = getVersionInfoFormatted();
    ctx.body = versionInfo;
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      error: 'Failed to get version information',
      buildTime: 'unknown',
      buildBranch: 'unknown',
      buildCommit: 'unknown',
      nodeVersion: process.version,
      npmVersion: 'unknown',
      appVersion: '0.0.1',
    };
  }
});

router.post('/api/user/register', registerRateLimiter, UserController.register);
router.post('/api/user/login', authRateLimiter, UserController.login);
router.post('/api/user/logout', authMiddleware, UserController.logout);
router.get('/api/user/info', authMiddleware, UserController.getInfo);
router.put('/api/user/info', authMiddleware, UserController.updateInfo);
router.post('/api/user/password/reset/request', authRateLimiter, UserController.requestPasswordReset);
router.post('/api/user/password/reset', UserController.resetPassword);
router.post('/api/user/password/change', authMiddleware, UserController.changePassword);

// Admin APIs - only for super_admin
router.get('/api/admin/user/list', apiRateLimiter, authMiddleware, UserController.listUsers);
router.post('/api/admin/user/add', apiRateLimiter, authMiddleware, UserController.createUser);
router.put('/api/admin/user/up', apiRateLimiter, authMiddleware, UserController.updateUser);
router.delete('/api/admin/user/del', apiRateLimiter, authMiddleware, UserController.deleteUser);

router.get('/api/admin/project/list', apiRateLimiter, authMiddleware, ProjectController.listAllProjects);
router.post('/api/admin/project/add', apiRateLimiter, authMiddleware, ProjectController.add);
router.put('/api/admin/project/up', apiRateLimiter, authMiddleware, ProjectController.update);
router.delete('/api/admin/project/del', apiRateLimiter, authMiddleware, ProjectController.delete);

router.get('/api/admin/interface/list', apiRateLimiter, authMiddleware, InterfaceController.listAllInterfaces);

router.get('/api/admin/environment/list', apiRateLimiter, authMiddleware, ProjectController.listAllProjects);

router.get('/api/group/list', apiRateLimiter, authMiddleware, GroupController.list);
router.post('/api/group/add', apiRateLimiter, authMiddleware, GroupController.add);
router.put('/api/group/up', apiRateLimiter, authMiddleware, GroupController.update);
router.delete('/api/group/del', apiRateLimiter, authMiddleware, GroupController.delete);
router.get('/api/group/get', apiRateLimiter, authMiddleware, GroupController.get);

// Group member management
router.post('/api/group/member/add', apiRateLimiter, authMiddleware, GroupController.addMember);
router.delete('/api/group/member/del', apiRateLimiter, authMiddleware, GroupController.removeMember);
router.post('/api/group/member/setLeader', apiRateLimiter, authMiddleware, GroupController.setLeader);

router.get('/api/project/list', apiRateLimiter, authMiddleware, ProjectController.list);
router.post('/api/project/add', apiRateLimiter, authMiddleware, ProjectController.add);
router.put('/api/project/up', apiRateLimiter, authMiddleware, ProjectController.update);
router.delete('/api/project/del', apiRateLimiter, authMiddleware, ProjectController.delete);
router.get('/api/project/get', apiRateLimiter, authMiddleware, ProjectController.get);

// Environment management
router.post('/api/project/environment/add', apiRateLimiter, authMiddleware, ProjectController.addEnvironment);
router.put('/api/project/environment/up', apiRateLimiter, authMiddleware, ProjectController.updateEnvironment);
router.delete('/api/project/environment/del', apiRateLimiter, authMiddleware, ProjectController.deleteEnvironment);

// Project member management
router.post('/api/project/member/add', apiRateLimiter, authMiddleware, ProjectController.addMember);
router.delete('/api/project/member/del', apiRateLimiter, authMiddleware, ProjectController.removeMember);

// Project migration and copy
router.post('/api/project/migrate', apiRateLimiter, authMiddleware, ProjectController.migrate);
router.post('/api/project/copy', apiRateLimiter, authMiddleware, ProjectController.copy);

// Project activities
router.get('/api/project/activities', apiRateLimiter, authMiddleware, ProjectController.getActivities);

router.get('/api/interface/list', apiRateLimiter, authMiddleware, InterfaceController.list);
router.post('/api/interface/add', apiRateLimiter, authMiddleware, InterfaceController.add);
router.put('/api/interface/up', apiRateLimiter, authMiddleware, InterfaceController.update);
router.delete('/api/interface/del', apiRateLimiter, authMiddleware, InterfaceController.delete);
router.get('/api/interface/get', apiRateLimiter, authMiddleware, InterfaceController.get);
router.post('/api/interface/run', apiRateLimiter, authMiddleware, InterfaceController.run);

router.get('/api/interface/cat/list', apiRateLimiter, authMiddleware, InterfaceCatController.list);
router.post('/api/interface/cat/add', apiRateLimiter, authMiddleware, InterfaceCatController.add);
router.put('/api/interface/cat/up', apiRateLimiter, authMiddleware, InterfaceCatController.update);
router.delete('/api/interface/cat/del', apiRateLimiter, authMiddleware, InterfaceCatController.delete);

router.post('/api/upload', apiRateLimiter, authMiddleware, handleUploadError, upload.single('file'), UploadController.uploadFile);
router.post('/api/upload/avatar', apiRateLimiter, authMiddleware, handleUploadError, upload.single('avatar'), UploadController.uploadAvatar);

router.get('/api/monitor/stats', apiRateLimiter, authMiddleware, MonitorController.getStats);
router.get('/metrics', MonitorController.getMetrics);
router.get('/api/metrics', MonitorController.getMetrics);

router.get('/api/mock/expectation/list', apiRateLimiter, authMiddleware, MockExpectationController.list);
router.post('/api/mock/expectation/add', apiRateLimiter, authMiddleware, MockExpectationController.add);
router.put('/api/mock/expectation/up', apiRateLimiter, authMiddleware, MockExpectationController.update);
router.delete('/api/mock/expectation/del', apiRateLimiter, authMiddleware, MockExpectationController.delete);

router.get('/api/test/collection/list', apiRateLimiter, authMiddleware, TestController.listCollections);
router.get('/api/test/collection/:id', apiRateLimiter, authMiddleware, TestController.getCollection);
router.post('/api/test/collection/add', apiRateLimiter, authMiddleware, TestController.createCollection);
router.put('/api/test/collection/:id', apiRateLimiter, authMiddleware, TestController.updateCollection);
router.delete('/api/test/collection/:id', apiRateLimiter, authMiddleware, TestController.deleteCollection);
router.post('/api/test/case/add', apiRateLimiter, authMiddleware, TestController.createTestCase);
router.put('/api/test/case/:id', apiRateLimiter, authMiddleware, TestController.updateTestCase);
router.delete('/api/test/case/:id', apiRateLimiter, authMiddleware, TestController.deleteTestCase);
router.post('/api/test/run', apiRateLimiter, authMiddleware, TestController.runTest);
router.get('/api/test/history', apiRateLimiter, authMiddleware, TestController.getTestHistory);

router.post('/api/import', apiRateLimiter, authMiddleware, ImportExportController.import);
router.get('/api/export', apiRateLimiter, authMiddleware, ImportExportController.export);

// SSO 路由
router.get('/api/sso/providers', apiRateLimiter, authMiddleware, SSOController.listProviders);
router.get('/api/sso/providers/:id', apiRateLimiter, authMiddleware, SSOController.getProvider);
router.post('/api/sso/providers', apiRateLimiter, authMiddleware, SSOController.createProvider);
router.put('/api/sso/providers/:id', apiRateLimiter, authMiddleware, SSOController.updateProvider);
router.delete('/api/sso/providers/:id', apiRateLimiter, authMiddleware, SSOController.deleteProvider);
router.patch('/api/sso/providers/:id/enable', apiRateLimiter, authMiddleware, SSOController.enableProvider);
router.get('/api/sso/auth/:providerId', SSOController.initiateAuth);
router.get('/api/sso/auth/:providerId/callback', SSOController.handleCallback);

// 第三方登录路由
router.get('/api/admin/auth/third-party/config', apiRateLimiter, authMiddleware, ThirdPartyAuthController.getConfig);
router.post('/api/admin/auth/third-party/config/:provider', apiRateLimiter, authMiddleware, ThirdPartyAuthController.updateProviderConfig);
router.get('/api/auth/github', ThirdPartyAuthController.githubAuth);
router.get('/api/auth/github/callback', ThirdPartyAuthController.githubCallback);
router.get('/api/auth/gitlab', ThirdPartyAuthController.githubAuth); // TODO: 实现 GitLab
router.get('/api/auth/gitlab/callback', ThirdPartyAuthController.githubCallback); // TODO: 实现 GitLab
router.get('/api/auth/gmail', ThirdPartyAuthController.githubAuth); // TODO: 实现 Gmail
router.get('/api/auth/gmail/callback', ThirdPartyAuthController.githubCallback); // TODO: 实现 Gmail
router.get('/api/auth/wechat', ThirdPartyAuthController.githubAuth); // TODO: 实现微信
router.get('/api/auth/wechat/callback', ThirdPartyAuthController.githubCallback); // TODO: 实现微信
router.post('/api/auth/phone/send-code', authRateLimiter, ThirdPartyAuthController.sendPhoneCode);
router.post('/api/auth/phone/login', authRateLimiter, ThirdPartyAuthController.phoneLogin);
router.post('/api/auth/email/send-code', authRateLimiter, ThirdPartyAuthController.sendEmailCode);
router.post('/api/auth/email/login', authRateLimiter, ThirdPartyAuthController.emailLogin);

// 白名单路由
router.get('/api/whitelist/config', apiRateLimiter, authMiddleware, WhitelistController.getConfig);
router.put('/api/whitelist/config', apiRateLimiter, authMiddleware, WhitelistController.updateConfig);
router.get('/api/whitelist/entries', apiRateLimiter, authMiddleware, WhitelistController.listEntries);
router.post('/api/whitelist/entries', apiRateLimiter, authMiddleware, WhitelistController.addEntry);
router.post('/api/whitelist/entries/batch', apiRateLimiter, authMiddleware, WhitelistController.batchAddEntries);
router.put('/api/whitelist/entries/:id', apiRateLimiter, authMiddleware, WhitelistController.updateEntry);
router.delete('/api/whitelist/entries/:id', apiRateLimiter, authMiddleware, WhitelistController.deleteEntry);
router.delete('/api/whitelist/entries', apiRateLimiter, authMiddleware, WhitelistController.batchDeleteEntries);
router.post('/api/whitelist/entries/check', apiRateLimiter, authMiddleware, WhitelistController.checkEntry);

// 邮件服务路由
router.get('/api/email/config', apiRateLimiter, authMiddleware, EmailController.getConfig);
router.put('/api/email/config', apiRateLimiter, authMiddleware, EmailController.updateConfig);
router.post('/api/email/test', apiRateLimiter, authMiddleware, EmailController.testEmail);
router.get('/api/email/templates', apiRateLimiter, authMiddleware, EmailController.listTemplates);
router.get('/api/email/templates/:id', apiRateLimiter, authMiddleware, EmailController.getTemplate);
router.post('/api/email/templates', apiRateLimiter, authMiddleware, EmailController.createTemplate);
router.put('/api/email/templates/:id', apiRateLimiter, authMiddleware, EmailController.updateTemplate);
router.delete('/api/email/templates/:id', apiRateLimiter, authMiddleware, EmailController.deleteTemplate);
router.post('/api/email/send', apiRateLimiter, authMiddleware, EmailController.sendEmail);

// 插件系统路由
router.get('/api/plugins', apiRateLimiter, authMiddleware, PluginController.listPlugins);
router.get('/api/plugins/:id', apiRateLimiter, authMiddleware, PluginController.getPlugin);
router.post('/api/plugins/install/local', apiRateLimiter, authMiddleware, PluginController.installLocal);
router.post('/api/plugins/install/default', apiRateLimiter, authMiddleware, PluginController.installDefaultPlugins);
router.post('/api/plugins/install/npm', apiRateLimiter, authMiddleware, PluginController.installLocal); // TODO: 实现 npm 安装
router.post('/api/plugins/install/git', apiRateLimiter, authMiddleware, PluginController.installLocal); // TODO: 实现 git 安装
router.post('/api/plugins/install/upload', apiRateLimiter, authMiddleware, PluginController.installLocal); // TODO: 实现文件上传安装
router.delete('/api/plugins/:id', apiRateLimiter, authMiddleware, PluginController.uninstallPlugin);
router.patch('/api/plugins/:id/enable', apiRateLimiter, authMiddleware, PluginController.enablePlugin);
router.get('/api/plugins/:id/config', apiRateLimiter, authMiddleware, PluginController.getPluginConfig);
router.put('/api/plugins/:id/config', apiRateLimiter, authMiddleware, PluginController.updatePluginConfig);

// CI/CD 路由
router.get('/api/cicd/tokens', apiRateLimiter, authMiddleware, CICDController.listCLITokens);
router.post('/api/cicd/tokens', apiRateLimiter, authMiddleware, CICDController.generateCLIToken);
router.delete('/api/cicd/tokens/:id', apiRateLimiter, authMiddleware, CICDController.deleteCLIToken);
router.post('/api/cicd/test/run', apiRateLimiter, authMiddleware, CICDController.runTest);
router.post('/api/cicd/sync/swagger', apiRateLimiter, authMiddleware, CICDController.syncSwagger);

// 已导入接口自动化测试路由
router.get('/api/auto-test/config', apiRateLimiter, authMiddleware, AutoTestController.getConfig);
router.put('/api/auto-test/config', apiRateLimiter, authMiddleware, AutoTestController.updateConfig);
router.post('/api/auto-test/generate', apiRateLimiter, authMiddleware, AutoTestController.generateTestCases);
router.post('/api/auto-test/run', apiRateLimiter, authMiddleware, AutoTestController.runAutoTest);

// 消息通知路由
router.get('/api/notifications', apiRateLimiter, authMiddleware, NotificationController.listNotifications);
router.patch('/api/notifications/:id/read', apiRateLimiter, authMiddleware, NotificationController.markAsRead);
router.patch('/api/notifications/read-all', apiRateLimiter, authMiddleware, NotificationController.markAllAsRead);
router.delete('/api/notifications/:id', apiRateLimiter, authMiddleware, NotificationController.deleteNotification);
router.get('/api/notifications/settings', apiRateLimiter, authMiddleware, NotificationController.getSettings);
router.put('/api/notifications/settings', apiRateLimiter, authMiddleware, NotificationController.updateSettings);

// 搜索功能路由
router.get('/api/search', apiRateLimiter, authMiddleware, SearchController.search);
router.get('/api/search/suggestions', apiRateLimiter, authMiddleware, SearchController.getSuggestions);
router.get('/api/search/history', apiRateLimiter, authMiddleware, SearchController.getHistory);
router.delete('/api/search/history', apiRateLimiter, authMiddleware, SearchController.clearHistory);

// 项目关注路由
router.post('/api/projects/:projectId/follow', apiRateLimiter, authMiddleware, ProjectFollowController.followProject);
router.delete('/api/projects/:projectId/follow', apiRateLimiter, authMiddleware, ProjectFollowController.unfollowProject);
router.get('/api/projects/following', apiRateLimiter, authMiddleware, ProjectFollowController.listFollowing);
router.get('/api/projects/:projectId/following', apiRateLimiter, authMiddleware, ProjectFollowController.checkFollowing);

// 操作日志路由
router.get('/api/logs', apiRateLimiter, authMiddleware, OperationLogController.listLogs);
router.get('/api/logs/export', apiRateLimiter, authMiddleware, OperationLogController.exportLogs);

// 登录日志路由
router.get('/api/login-logs', apiRateLimiter, authMiddleware, LoginLogController.listLogs);
router.get('/api/login-logs/statistics', apiRateLimiter, authMiddleware, LoginLogController.getStatistics);

// 用户中心增强路由
router.get('/api/user/projects', apiRateLimiter, authMiddleware, UserCenterController.getUserProjects);
router.get('/api/user/stats', apiRateLimiter, authMiddleware, UserCenterController.getUserStats);

// 项目 Token 路由
router.get('/api/projects/:projectId/tokens', apiRateLimiter, authMiddleware, ProjectTokenController.listTokens);
router.post('/api/projects/:projectId/tokens', apiRateLimiter, authMiddleware, ProjectTokenController.generateToken);
router.delete('/api/projects/:projectId/tokens/:tokenId', apiRateLimiter, authMiddleware, ProjectTokenController.deleteToken);

// OpenAPI 路由（使用项目 Token 认证）
router.get('/api/openapi/interfaces', apiRateLimiter, projectTokenAuth, OpenAPIController.listInterfaces);
router.get('/api/openapi/interfaces/:id', apiRateLimiter, projectTokenAuth, OpenAPIController.getInterface);
router.post('/api/openapi/interfaces', apiRateLimiter, projectTokenAuth, OpenAPIController.createInterface);
router.put('/api/openapi/interfaces/:id', apiRateLimiter, projectTokenAuth, OpenAPIController.updateInterface);
router.delete('/api/openapi/interfaces/:id', apiRateLimiter, projectTokenAuth, OpenAPIController.deleteInterface);

// 数据洞察与质量中心路由
router.get('/api/projects/:projectId/health', apiRateLimiter, authMiddleware, AnalyticsController.getProjectHealth);
router.get('/api/interfaces/:id/quality', apiRateLimiter, authMiddleware, AnalyticsController.getInterfaceQuality);

// 自动测试任务路由
router.get('/api/auto-test/tasks', apiRateLimiter, authMiddleware, AutoTestTaskController.listTasks);
router.get('/api/auto-test/tasks/:id', apiRateLimiter, authMiddleware, AutoTestTaskController.getTask);
router.post('/api/auto-test/tasks', apiRateLimiter, authMiddleware, AutoTestTaskController.createTask);
router.put('/api/auto-test/tasks/:id', apiRateLimiter, authMiddleware, AutoTestTaskController.updateTask);
router.delete('/api/auto-test/tasks/:id', apiRateLimiter, authMiddleware, AutoTestTaskController.deleteTask);
router.post('/api/auto-test/tasks/:id/run', apiRateLimiter, authMiddleware, AutoTestTaskController.runTask);
router.post('/api/auto-test/tasks/:id/run-single', apiRateLimiter, authMiddleware, AutoTestTaskController.runSingleCase);
router.get('/api/auto-test/tasks/:id/history', apiRateLimiter, authMiddleware, AutoTestTaskController.getTaskHistory);
router.get('/api/auto-test/tasks/:id/export', apiRateLimiter, authMiddleware, AutoTestTaskController.exportTask);
router.post('/api/auto-test/tasks/import', apiRateLimiter, authMiddleware, AutoTestTaskController.importTask);
router.get('/api/auto-test/results/:resultId', apiRateLimiter, authMiddleware, AutoTestTaskController.getResult);

// 测试环境路由
router.get('/api/test/environments', apiRateLimiter, authMiddleware, TestEnvironmentController.listEnvironments);
router.get('/api/test/environments/:id', apiRateLimiter, authMiddleware, TestEnvironmentController.getEnvironment);
router.post('/api/test/environments', apiRateLimiter, authMiddleware, TestEnvironmentController.createEnvironment);
router.put('/api/test/environments/:id', apiRateLimiter, authMiddleware, TestEnvironmentController.updateEnvironment);
router.delete('/api/test/environments/:id', apiRateLimiter, authMiddleware, TestEnvironmentController.deleteEnvironment);

// 权限管理路由
// 项目成员权限
router.get('/api/projects/:project_id/members', apiRateLimiter, authMiddleware, PermissionController.listProjectMembers);
router.post('/api/projects/:project_id/members', apiRateLimiter, authMiddleware, PermissionController.addProjectMember);
router.post('/api/projects/:project_id/members/batch', apiRateLimiter, authMiddleware, PermissionController.batchAddProjectMembers);
router.put('/api/projects/:project_id/members/:user_id', apiRateLimiter, authMiddleware, PermissionController.updateProjectMember);
router.delete('/api/projects/:project_id/members/:user_id', apiRateLimiter, authMiddleware, PermissionController.removeProjectMember);
router.get('/api/projects/:project_id/permission', apiRateLimiter, authMiddleware, PermissionController.getUserProjectPermission);

// 分组成员权限
router.get('/api/groups/:group_id/members', apiRateLimiter, authMiddleware, PermissionController.listGroupMembers);
router.post('/api/groups/:group_id/members', apiRateLimiter, authMiddleware, PermissionController.addGroupMember);
router.put('/api/groups/:group_id/members/:user_id', apiRateLimiter, authMiddleware, PermissionController.updateGroupMember);
router.delete('/api/groups/:group_id/members/:user_id', apiRateLimiter, authMiddleware, PermissionController.removeGroupMember);

// 角色权限
router.get('/api/roles/permissions', apiRateLimiter, authMiddleware, PermissionController.listRolePermissions);
router.get('/api/roles/:role/permissions', apiRateLimiter, authMiddleware, PermissionController.getRolePermission);
router.put('/api/roles/:role/permissions', apiRateLimiter, authMiddleware, PermissionController.updateRolePermission);
router.post('/api/roles/permissions/init', apiRateLimiter, authMiddleware, PermissionController.initRolePermissions);

export default router;

