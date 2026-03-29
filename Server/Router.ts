import Router from 'koa-router';
import UserController from './Controllers/User.js';
import GroupController from './Controllers/Group.js';
import ProjectController from './Controllers/Project.js';
import InterfaceController from './Controllers/Interface.js';
import AnalyticsController from './Controllers/Analytics.js';
import MonitorController from './Controllers/Monitor.js';
import ImportExportController from './Controllers/ImportExport.js';
import SSOController from './Controllers/SSO.js';
import ThirdPartyAuthController from './Controllers/ThirdPartyAuth.js';
import AutoTestController from './Controllers/AutoTest.js';
import AIAssistantController from './Controllers/AIAssistant.js';
import { authMiddleware } from './Middleware/auth.js';
import { apiRateLimiter, authRateLimiter, registerRateLimiter, emailCodeRateLimiter } from './Middleware/rateLimiter.js';
import { getVersionInfoFormatted } from './Utils/version.js';
import Koa from 'koa';

const router = new Router();

router.get('/api/health', async (ctx: Koa.Context) => {
  const { isReady, getDependencyStatus } = await import('./Utils/dependencyChecker.js');
  const ready = isReady();
  const dependencyStatus = getDependencyStatus();
  
  ctx.body = {
    status: ready ? 'ready' : 'not ready',
    timestamp: new Date().toISOString(),
    dependencies: dependencyStatus,
    uptime: process.uptime(),
  };
  if (!ready) ctx.status = 503;
});

router.get('/api/version', async (ctx: Koa.Context) => {
  ctx.body = getVersionInfoFormatted();
});

// User Routes
router.post('/api/user/register', registerRateLimiter as any, UserController.register as any);
router.post('/api/user/login', authRateLimiter as any, UserController.login as any);
router.post('/api/user/logout', authMiddleware as any, UserController.logout as any);
router.get('/api/user/info', authMiddleware as any, UserController.getInfo as any);
router.put('/api/user/info', authMiddleware as any, UserController.updateInfo as any);

// Group Routes
router.get('/api/group/list', apiRateLimiter as any, authMiddleware as any, GroupController.list as any);
router.post('/api/group/add', apiRateLimiter as any, authMiddleware as any, GroupController.add as any);
router.put('/api/group/up', apiRateLimiter as any, authMiddleware as any, GroupController.update as any);
router.delete('/api/group/del', apiRateLimiter as any, authMiddleware as any, GroupController.delete as any);
router.get('/api/group/get', apiRateLimiter as any, authMiddleware as any, GroupController.get as any);

// Project Routes
router.get('/api/project/list', apiRateLimiter as any, authMiddleware as any, ProjectController.list as any);
router.post('/api/project/add', apiRateLimiter as any, authMiddleware as any, ProjectController.add as any);
router.put('/api/project/up', apiRateLimiter as any, authMiddleware as any, ProjectController.update as any);
router.delete('/api/project/del', apiRateLimiter as any, authMiddleware as any, ProjectController.delete as any);
router.get('/api/project/get', apiRateLimiter as any, authMiddleware as any, ProjectController.get as any);

// Interface Routes
router.get('/api/interface/list', apiRateLimiter as any, authMiddleware as any, InterfaceController.list as any);
router.post('/api/interface/add', apiRateLimiter as any, authMiddleware as any, InterfaceController.add as any);
router.put('/api/interface/up', apiRateLimiter as any, authMiddleware as any, InterfaceController.update as any);
router.delete('/api/interface/del', apiRateLimiter as any, authMiddleware as any, InterfaceController.delete as any);
router.get('/api/interface/get', apiRateLimiter as any, authMiddleware as any, InterfaceController.get as any);
router.post('/api/interface/run', apiRateLimiter as any, authMiddleware as any, InterfaceController.run as any);

// Analytics & Monitor
router.get('/api/monitor/stats', apiRateLimiter as any, authMiddleware as any, MonitorController.getStats as any);
router.get('/api/projects/:projectId/health', apiRateLimiter as any, authMiddleware as any, AnalyticsController.getProjectHealth as any);

// Import/Export
router.post('/api/import', apiRateLimiter as any, authMiddleware as any, ImportExportController.import as any);
router.get('/api/export', apiRateLimiter as any, authMiddleware as any, ImportExportController.export as any);

// SSO & Third Party
router.get('/api/sso/providers', apiRateLimiter as any, authMiddleware as any, SSOController.listProviders as any);
router.get('/api/auth/third-party/providers', authRateLimiter as any, ThirdPartyAuthController.getEnabledProviders as any);
router.get('/api/auth/github', ThirdPartyAuthController.githubAuth as any);

// AI Assistant
router.post('/api/ai/generate', apiRateLimiter as any, authMiddleware as any, AIAssistantController.generateInterface as any);
router.get('/api/ai/suggestions', apiRateLimiter as any, authMiddleware as any, AIAssistantController.getDesignSuggestions as any);

// Auto Test
router.get('/api/auto-test/config', apiRateLimiter as any, authMiddleware as any, AutoTestController.getConfig as any);
router.post('/api/auto-test/generate', apiRateLimiter as any, authMiddleware as any, AutoTestController.generateTestCases as any);
router.post('/api/auto-test/run', apiRateLimiter as any, authMiddleware as any, AutoTestController.runAutoTest as any);

export default router;
