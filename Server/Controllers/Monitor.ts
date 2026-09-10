import Koa from 'koa';
import { BaseController } from './Base.js';
import mongoose from 'mongoose';
import os from 'os';
import User from '../Models/User.js';
import Group from '../Models/Group.js';
import Project from '../Models/Project.js';
import Interface from '../Models/Interface.js';
import AutoTestTask from '../Models/AutoTestTask.js';
import AutoTestResult from '../Models/AutoTestResult.js';
import { logger } from '../Utils/logger.js';

class MonitorController extends BaseController {
  static get ControllerName() { return 'MonitorController'; }

  static async getStats(ctx: Koa.Context) {
    try {
      if (ctx.state.user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = MonitorController.error('只有超级管理员可以查看统计信息');
        return;
      }

      const [userCount, groupCount, projectCount, interfaceCount] = await Promise.all([
        User.countDocuments(),
        Group.countDocuments(),
        Project.countDocuments(),
        Interface.countDocuments(),
      ]);

      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = Math.round((usedMemory / totalMemory) * 100);

      const stats = {
        users: userCount,
        groups: groupCount,
        projects: projectCount,
        interfaces: interfaceCount,
        database: {
          status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
          name: mongoose.connection.name,
        },
        system: {
          uptime: process.uptime(),
          memory: memoryUsagePercent,
          memoryDetail: {
            used: Math.round(usedMemory / 1024 / 1024),
            total: Math.round(totalMemory / 1024 / 1024),
            free: Math.round(freeMemory / 1024 / 1024),
          },
          nodeVersion: process.version,
          platform: process.platform,
        },
      };

      ctx.body = MonitorController.success(stats);
    } catch (error: any) {
      logger.error({ error }, 'Get stats error');
      ctx.status = 500;
      ctx.body = MonitorController.error(error.message || '获取统计信息失败');
    }
  }

  static async getMetrics(ctx: Koa.Context) {
    try {
      const metricsToken = process.env.METRICS_TOKEN;
      const authHeader = ctx.headers.authorization?.replace(/^Bearer\s+/i, '');
      const isSuperAdmin = ctx.state.user?.role === 'super_admin';
      const tokenOk = metricsToken && (authHeader === metricsToken || ctx.get('X-Metrics-Token') === metricsToken);

      if (!isSuperAdmin && !tokenOk) {
        ctx.status = 403;
        ctx.body = MonitorController.error('无权访问指标');
        return;
      }

      const promClient = await import('prom-client');
      ctx.set('Content-Type', promClient.register.contentType);
      ctx.body = await promClient.register.metrics();
    } catch (error) {
      ctx.status = 500;
      ctx.body = MonitorController.error('获取指标失败');
    }
  }

  static async getHierarchy(ctx: Koa.Context) {
    try {
      if (ctx.state.user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = MonitorController.error('只有超级管理员可以查看监控信息');
        return;
      }

      const groups = await Group.find().lean();
      const projects = await Project.find().populate('group_id', 'group_name').lean();
      const tasks = await AutoTestTask.find()
        .populate('project_id', 'project_name group_id')
        .populate('environment_id', 'name base_url')
        .populate('createdBy', 'username email')
        .lean();
      
      const taskIds = tasks.map(t => t._id);
      
      const [latestResults, allStats] = await Promise.all([
        AutoTestResult.aggregate([
          { $match: { task_id: { $in: taskIds } } },
          { $sort: { started_at: -1 } },
          { $group: { _id: '$task_id', latest: { $first: '$$ROOT' } } }
        ]),
        AutoTestResult.aggregate([
          { $match: { task_id: { $in: taskIds } } },
          { $group: { _id: { task_id: '$task_id', status: '$status' }, count: { $sum: 1 } } }
        ])
      ]);

      const resultMap = new Map();
      latestResults.forEach(item => resultMap.set(item._id.toString(), item.latest));

      const statsMap = new Map();
      allStats.forEach(stat => {
        const taskId = stat._id.task_id.toString();
        if (!statsMap.has(taskId)) {
          statsMap.set(taskId, { total: 0, passed: 0, failed: 0, error: 0, running: 0, cancelled: 0 });
        }
        const taskStats = statsMap.get(taskId);
        taskStats[stat._id.status] = stat.count;
        taskStats.total += stat.count;
      });

      const groupMap = new Map();
      groups.forEach((group: any) => groupMap.set(group._id.toString(), { ...group, projects: [], projectCount: 0, totalTasks: 0 }));

      const projectMap = new Map();
      projects.forEach((project: any) => {
        const groupId = project.group_id?._id?.toString() || project.group_id?.toString();
        if (groupId && groupMap.has(groupId)) {
          projectMap.set(project._id.toString(), { ...project, tasks: [], taskCount: 0 });
        }
      });

      tasks.forEach((task: any) => {
        const projectId = task.project_id?._id?.toString() || task.project_id?.toString();
        if (projectId && projectMap.has(projectId)) {
          const taskIdStr = task._id.toString();
          const project = projectMap.get(projectId);
          project.tasks.push({
            ...task,
            latestResult: resultMap.get(taskIdStr),
            stats: statsMap.get(taskIdStr) || { total: 0, passed: 0, failed: 0, error: 0, running: 0, cancelled: 0 }
          });
          project.taskCount = project.tasks.length;
        }
      });

      projectMap.forEach(project => {
        const groupId = project.group_id?._id?.toString() || project.group_id?.toString();
        if (groupId && groupMap.has(groupId)) {
          const group = groupMap.get(groupId);
          group.projects.push(project);
          group.projectCount = group.projects.length;
          group.totalTasks += project.taskCount;
        }
      });

      ctx.body = MonitorController.success(Array.from(groupMap.values()).filter(g => g.projectCount > 0));
    } catch (error: any) {
      ctx.status = 500;
      ctx.body = MonitorController.error(error.message || '获取监控数据失败');
    }
  }
}

export default MonitorController;
