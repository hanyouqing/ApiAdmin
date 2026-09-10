import Router from 'koa-router';
import UserController from './Controllers/User.js';
import GroupController from './Controllers/Group.js';
import ProjectController from './Controllers/Project.js';
import InterfaceController from './Controllers/Interface.js';
import InterfaceCatController from './Controllers/InterfaceCat.js';
import AnalyticsController from './Controllers/Analytics.js';
import MonitorController from './Controllers/Monitor.js';
import ImportExportController from './Controllers/ImportExport.js';
import SSOController from './Controllers/SSO.js';
import ThirdPartyAuthController from './Controllers/ThirdPartyAuth.js';
import AutoTestController from './Controllers/AutoTest.js';
import AutoTestTaskController from './Controllers/AutoTestTask.js';
import AIAssistantController from './Controllers/AIAssistant.js';
import AIConfigController from './Controllers/AIConfigController.js';
import UploadController from './Controllers/Upload.js';
import SearchController from './Controllers/Search.js';
import MockExpectationController from './Controllers/MockExpectation.js';
import PluginController from './Controllers/Plugin.js';
import EmailController from './Controllers/Email.js';
import WhitelistController from './Controllers/Whitelist.js';
import LoginLogController from './Controllers/LoginLog.js';
import OperationLogController from './Controllers/OperationLog.js';
import NotificationController from './Controllers/Notification.js';
import UserCenterController from './Controllers/UserCenter.js';
import ProjectFollowController from './Controllers/ProjectFollow.js';
import CodeRepositoryController from './Controllers/CodeRepository.js';
import ProjectTokenController from './Controllers/ProjectToken.js';
import TestController from './Controllers/Test.js';
import TestEnvironmentController from './Controllers/TestEnvironment.js';
import TestRuleConfigController from './Controllers/TestRuleConfig.js';
import { authMiddleware } from './Middleware/auth.js';
import { checkPermission } from './Middleware/permission.js';
import { upload, handleUploadError } from './Middleware/upload.js';
import { apiRateLimiter, authRateLimiter, registerRateLimiter, emailCodeRateLimiter } from './Middleware/rateLimiter.js';
import { getVersionInfoFormatted } from './Utils/version.js';
import Koa from 'koa';

const router = new Router();
const requireSuperAdmin = checkPermission('super_admin');

router.get('/api/health', async (ctx: Koa.Context) => {
  const { isReady, getDependencyStatus } = await import('./Utils/dependencyChecker.js');
  const ready = isReady();
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    ctx.body = {
      status: ready ? 'ok' : 'not ready',
      timestamp: new Date().toISOString(),
    };
  } else {
    ctx.body = {
      status: ready ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      dependencies: getDependencyStatus(),
      uptime: process.uptime(),
    };
  }
  if (!ready) ctx.status = 503;
});

router.get('/api/version', async (ctx: Koa.Context) => {
  ctx.body = getVersionInfoFormatted();
});

// User
router.post('/api/user/register', registerRateLimiter as any, UserController.register as any);
router.post('/api/user/login', authRateLimiter as any, UserController.login as any);
router.post('/api/user/logout', authMiddleware as any, UserController.logout as any);
router.get('/api/user/info', authMiddleware as any, UserController.getInfo as any);
router.put('/api/user/info', authMiddleware as any, UserController.updateInfo as any);
router.post('/api/user/password/reset/request', authRateLimiter as any, UserController.requestPasswordReset as any);
router.post('/api/user/password/reset', authRateLimiter as any, UserController.resetPassword as any);
router.post('/api/user/password/change', apiRateLimiter as any, authMiddleware as any, UserController.changePassword as any);

// Admin users
router.get('/api/admin/user/list', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, UserController.listUsers as any);
router.post('/api/admin/user/add', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, UserController.createUser as any);
router.put('/api/admin/user/up', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, UserController.updateUser as any);
router.delete('/api/admin/user/del', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, UserController.deleteUser as any);

// Group
router.get('/api/group/list', apiRateLimiter as any, authMiddleware as any, GroupController.list as any);
router.post('/api/group/add', apiRateLimiter as any, authMiddleware as any, GroupController.add as any);
router.put('/api/group/up', apiRateLimiter as any, authMiddleware as any, GroupController.update as any);
router.delete('/api/group/del', apiRateLimiter as any, authMiddleware as any, GroupController.delete as any);
router.get('/api/group/get', apiRateLimiter as any, authMiddleware as any, GroupController.get as any);
router.post('/api/group/member/add', apiRateLimiter as any, authMiddleware as any, GroupController.addMember as any);
router.delete('/api/group/member/del', apiRateLimiter as any, authMiddleware as any, GroupController.removeMember as any);
router.post('/api/group/member/setLeader', apiRateLimiter as any, authMiddleware as any, GroupController.setLeader as any);

// Project
router.get('/api/project/list', apiRateLimiter as any, authMiddleware as any, ProjectController.list as any);
router.post('/api/project/add', apiRateLimiter as any, authMiddleware as any, ProjectController.add as any);
router.put('/api/project/up', apiRateLimiter as any, authMiddleware as any, ProjectController.update as any);
router.delete('/api/project/del', apiRateLimiter as any, authMiddleware as any, ProjectController.delete as any);
router.get('/api/project/get', apiRateLimiter as any, authMiddleware as any, ProjectController.get as any);
router.post('/api/project/environment/add', apiRateLimiter as any, authMiddleware as any, ProjectController.addEnvironment as any);
router.put('/api/project/environment/up', apiRateLimiter as any, authMiddleware as any, ProjectController.updateEnvironment as any);
router.delete('/api/project/environment/del', apiRateLimiter as any, authMiddleware as any, ProjectController.deleteEnvironment as any);
router.post('/api/project/member/add', apiRateLimiter as any, authMiddleware as any, ProjectController.addMember as any);
router.delete('/api/project/member/del', apiRateLimiter as any, authMiddleware as any, ProjectController.removeMember as any);
router.get('/api/project/activities', apiRateLimiter as any, authMiddleware as any, ProjectController.getActivities as any);
router.post('/api/project/migrate', apiRateLimiter as any, authMiddleware as any, ProjectController.migrate as any);
router.post('/api/project/copy', apiRateLimiter as any, authMiddleware as any, ProjectController.copy as any);
router.get('/api/admin/project/list', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, ProjectController.list as any);

// Interface
router.get('/api/interface/list', apiRateLimiter as any, authMiddleware as any, InterfaceController.list as any);
router.post('/api/interface/add', apiRateLimiter as any, authMiddleware as any, InterfaceController.add as any);
router.put('/api/interface/up', apiRateLimiter as any, authMiddleware as any, InterfaceController.update as any);
router.delete('/api/interface/del', apiRateLimiter as any, authMiddleware as any, InterfaceController.delete as any);
router.post('/api/interface/batch-delete', apiRateLimiter as any, authMiddleware as any, InterfaceController.batchDelete as any);
router.get('/api/interface/get', apiRateLimiter as any, authMiddleware as any, InterfaceController.get as any);
router.post('/api/interface/run', apiRateLimiter as any, authMiddleware as any, InterfaceController.run as any);

// Interface categories
router.get('/api/interface/cat/list', apiRateLimiter as any, authMiddleware as any, InterfaceCatController.list as any);
router.post('/api/interface/cat/add', apiRateLimiter as any, authMiddleware as any, InterfaceCatController.add as any);
router.put('/api/interface/cat/up', apiRateLimiter as any, authMiddleware as any, InterfaceCatController.update as any);
router.delete('/api/interface/cat/del', apiRateLimiter as any, authMiddleware as any, InterfaceCatController.delete as any);

// Mock expectations
router.get('/api/mock/expectation/list', apiRateLimiter as any, authMiddleware as any, MockExpectationController.list as any);
router.post('/api/mock/expectation/add', apiRateLimiter as any, authMiddleware as any, MockExpectationController.add as any);
router.put('/api/mock/expectation/up', apiRateLimiter as any, authMiddleware as any, MockExpectationController.update as any);
router.delete('/api/mock/expectation/del', apiRateLimiter as any, authMiddleware as any, MockExpectationController.delete as any);

// Analytics & Monitor
router.get('/api/monitor/stats', apiRateLimiter as any, authMiddleware as any, MonitorController.getStats as any);
router.get('/api/monitor/hierarchy', apiRateLimiter as any, authMiddleware as any, MonitorController.getHierarchy as any);
router.get('/api/metrics', apiRateLimiter as any, authMiddleware as any, MonitorController.getMetrics as any);
router.get('/api/projects/:projectId/health', apiRateLimiter as any, authMiddleware as any, AnalyticsController.getProjectHealth as any);

// Import/Export
router.post('/api/import', apiRateLimiter as any, authMiddleware as any, ImportExportController.import as any);
router.get('/api/export', apiRateLimiter as any, authMiddleware as any, ImportExportController.export as any);

// SSO & Third Party
router.get('/api/sso/providers', apiRateLimiter as any, authMiddleware as any, SSOController.listProviders as any);
router.get('/api/sso/providers/:id', apiRateLimiter as any, authMiddleware as any, SSOController.getProvider as any);
router.post('/api/sso/providers', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, SSOController.createProvider as any);
router.get('/api/auth/third-party/providers', authRateLimiter as any, ThirdPartyAuthController.getEnabledProviders as any);
router.get('/api/auth/github', ThirdPartyAuthController.githubAuth as any);
router.post('/api/auth/email/send-code', emailCodeRateLimiter as any, ThirdPartyAuthController.sendEmailCode as any);
router.post('/api/auth/email/login', authRateLimiter as any, ThirdPartyAuthController.emailLogin as any);
router.get('/api/admin/auth/third-party/config', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, ThirdPartyAuthController.getAdminConfigs as any);
router.post('/api/admin/auth/third-party/config/:provider', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, ThirdPartyAuthController.saveAdminConfig as any);

// Upload
router.post('/api/upload', apiRateLimiter as any, authMiddleware as any, handleUploadError as any, upload.single('file') as any, UploadController.uploadFile as any);
router.post('/api/upload/avatar', apiRateLimiter as any, authMiddleware as any, handleUploadError as any, upload.single('file') as any, UploadController.uploadAvatar as any);

// Search
router.get('/api/search', apiRateLimiter as any, authMiddleware as any, SearchController.search as any);

// Plugins
router.get('/api/plugins', apiRateLimiter as any, authMiddleware as any, PluginController.listPlugins as any);
router.get('/api/plugins/:id', apiRateLimiter as any, authMiddleware as any, PluginController.getPlugin as any);
router.post('/api/plugins/:id/enable', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, PluginController.enablePlugin as any);

// Email / Whitelist / Logs (admin)
router.get('/api/email/config', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, EmailController.getConfig as any);
router.put('/api/email/config', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, EmailController.updateConfig as any);
router.post('/api/email/test', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, EmailController.testEmail as any);
router.get('/api/whitelist/config', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, WhitelistController.getConfig as any);
router.put('/api/whitelist/config', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, WhitelistController.updateConfig as any);
router.get('/api/whitelist/entries', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, WhitelistController.listEntries as any);
router.post('/api/whitelist/entries', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, WhitelistController.addEntry as any);
router.delete('/api/whitelist/entries/:id', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, WhitelistController.deleteEntry as any);
router.get('/api/login-logs', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, LoginLogController.listLogs as any);
router.get('/api/login-logs/statistics', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, LoginLogController.getStatistics as any);
router.get('/api/logs', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, OperationLogController.listLogs as any);
router.get('/api/logs/export', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, OperationLogController.exportLogs as any);

// User center / notifications / stars
router.get('/api/user/projects', apiRateLimiter as any, authMiddleware as any, UserCenterController.getUserProjects as any);
router.get('/api/user/statistics', apiRateLimiter as any, authMiddleware as any, UserCenterController.getUserStats as any);
router.get('/api/user/notifications', apiRateLimiter as any, authMiddleware as any, NotificationController.listNotifications as any);
router.post('/api/user/notifications/:id/read', apiRateLimiter as any, authMiddleware as any, NotificationController.markAsRead as any);
router.post('/api/user/notifications/read-all', apiRateLimiter as any, authMiddleware as any, NotificationController.markAllAsRead as any);
router.delete('/api/user/notifications/:id', apiRateLimiter as any, authMiddleware as any, NotificationController.deleteNotification as any);
router.get('/api/notifications/settings', apiRateLimiter as any, authMiddleware as any, NotificationController.getSettings as any);
router.put('/api/notifications/settings', apiRateLimiter as any, authMiddleware as any, NotificationController.updateSettings as any);
router.get('/api/user/stars', apiRateLimiter as any, authMiddleware as any, ProjectFollowController.listFollowing as any);
router.delete('/api/user/stars/:projectId', apiRateLimiter as any, authMiddleware as any, ProjectFollowController.unfollowProject as any);

// AI
router.post('/api/ai/generate', apiRateLimiter as any, authMiddleware as any, AIAssistantController.generateInterface as any);
router.get('/api/ai/suggestions', apiRateLimiter as any, authMiddleware as any, AIAssistantController.getDesignSuggestions as any);
router.get('/api/admin/ai/configs', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, AIConfigController.listConfigs as any);
router.post('/api/admin/ai/configs', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, AIConfigController.saveConfig as any);
router.post('/api/admin/ai/configs/:provider/test', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, AIConfigController.testConfig as any);

// Auto test
router.get('/api/auto-test/config', apiRateLimiter as any, authMiddleware as any, AutoTestController.getConfig as any);
router.post('/api/auto-test/generate', apiRateLimiter as any, authMiddleware as any, AutoTestController.generateTestCases as any);
router.post('/api/auto-test/run', apiRateLimiter as any, authMiddleware as any, AutoTestController.runAutoTest as any);
router.get('/api/auto-test/tasks', apiRateLimiter as any, authMiddleware as any, AutoTestTaskController.listTasks as any);
router.post('/api/auto-test/tasks', apiRateLimiter as any, authMiddleware as any, AutoTestTaskController.createTask as any);
router.get('/api/auto-test/tasks/:id', apiRateLimiter as any, authMiddleware as any, AutoTestTaskController.getTask as any);
router.put('/api/auto-test/tasks/:id', apiRateLimiter as any, authMiddleware as any, AutoTestTaskController.updateTask as any);
router.delete('/api/auto-test/tasks/:id', apiRateLimiter as any, authMiddleware as any, AutoTestTaskController.deleteTask as any);
router.post('/api/auto-test/tasks/:id/run', apiRateLimiter as any, authMiddleware as any, AutoTestTaskController.runTask as any);
router.post('/api/auto-test/tasks/:id/run-single', apiRateLimiter as any, authMiddleware as any, AutoTestTaskController.runSingleCase as any);
router.get('/api/auto-test/results/:resultId', apiRateLimiter as any, authMiddleware as any, AutoTestTaskController.getResult as any);
router.post('/api/auto-test/results/:id/analyze', apiRateLimiter as any, authMiddleware as any, AutoTestTaskController.triggerAIAnalysis as any);
router.get('/api/auto-test/results/:resultId/export', apiRateLimiter as any, authMiddleware as any, AutoTestTaskController.exportResult as any);
router.get('/api/auto-test/tasks/:id/export', apiRateLimiter as any, authMiddleware as any, AutoTestTaskController.exportTask as any);
router.post('/api/auto-test/tasks/import', apiRateLimiter as any, authMiddleware as any, AutoTestTaskController.importTask as any);

// Test collections / environments / rules
router.get('/api/test/collection/list', apiRateLimiter as any, authMiddleware as any, TestController.listCollections as any);
router.post('/api/test/collection/add', apiRateLimiter as any, authMiddleware as any, TestController.createCollection as any);
router.get('/api/test/collection/:id', apiRateLimiter as any, authMiddleware as any, TestController.getCollection as any);
router.post('/api/test/case/add', apiRateLimiter as any, authMiddleware as any, TestController.createTestCase as any);
router.delete('/api/test/case/:id', apiRateLimiter as any, authMiddleware as any, TestController.deleteTestCase as any);
router.post('/api/test/run', apiRateLimiter as any, authMiddleware as any, TestController.runTest as any);
router.get('/api/test/history', apiRateLimiter as any, authMiddleware as any, TestController.getTestHistory as any);
router.get('/api/admin/test/collections', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, TestController.listAllCollections as any);
router.get('/api/admin/test/results', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, TestController.listAllResults as any);
router.get('/api/admin/test/statistics', apiRateLimiter as any, authMiddleware as any, requireSuperAdmin as any, TestController.getTestStatistics as any);
router.get('/api/test/environments', apiRateLimiter as any, authMiddleware as any, TestEnvironmentController.listEnvironments as any);
router.post('/api/test/environments', apiRateLimiter as any, authMiddleware as any, TestEnvironmentController.createEnvironment as any);
router.get('/api/test/environments/:id', apiRateLimiter as any, authMiddleware as any, TestEnvironmentController.getEnvironment as any);
router.put('/api/test/environments/:id', apiRateLimiter as any, authMiddleware as any, TestEnvironmentController.updateEnvironment as any);
router.delete('/api/test/environments/:id', apiRateLimiter as any, authMiddleware as any, TestEnvironmentController.deleteEnvironment as any);
router.get('/api/test/rules', apiRateLimiter as any, authMiddleware as any, TestRuleConfigController.listRules as any);
router.post('/api/test/rules', apiRateLimiter as any, authMiddleware as any, TestRuleConfigController.createRule as any);
router.put('/api/test/rules/:id', apiRateLimiter as any, authMiddleware as any, TestRuleConfigController.updateRule as any);
router.delete('/api/test/rules/:id', apiRateLimiter as any, authMiddleware as any, TestRuleConfigController.deleteRule as any);

// Code repository
router.get('/api/projects/:projectId/repository', apiRateLimiter as any, authMiddleware as any, CodeRepositoryController.getRepository as any);
router.post('/api/projects/:projectId/repository', apiRateLimiter as any, authMiddleware as any, CodeRepositoryController.saveRepository as any);
router.delete('/api/projects/:projectId/repository', apiRateLimiter as any, authMiddleware as any, CodeRepositoryController.deleteRepository as any);
router.post('/api/projects/:projectId/repository/pull', apiRateLimiter as any, authMiddleware as any, CodeRepositoryController.pullCode as any);
router.post('/api/projects/:projectId/repository/test', apiRateLimiter as any, authMiddleware as any, CodeRepositoryController.testConnection as any);

router.post('/api/projects/:projectId/tokens', apiRateLimiter as any, authMiddleware as any, ProjectTokenController.generateToken as any);
router.get('/api/projects/:projectId/tokens', apiRateLimiter as any, authMiddleware as any, ProjectTokenController.listTokens as any);
router.delete('/api/projects/:projectId/tokens/:tokenId', apiRateLimiter as any, authMiddleware as any, ProjectTokenController.deleteToken as any);

export default router;
