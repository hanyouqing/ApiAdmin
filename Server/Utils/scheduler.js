import cron from 'node-cron';
import { logger } from './logger.js';
import AutoTestTask from '../Models/AutoTestTask.js';
import AutoTestResult from '../Models/AutoTestResult.js';
import { AutoTestRunner } from './autoTestRunner.js';
import TestEnvironment from '../Models/TestEnvironment.js';

class TaskScheduler {
  constructor() {
    this.jobs = new Map(); // 存储所有定时任务
  }

  /**
   * 启动所有启用的定时任务
   */
  async startAllTasks() {
    try {
      const tasks = await AutoTestTask.find({
        enabled: true,
        'schedule.enabled': true,
        'schedule.cron': { $ne: '' },
      }).populate('createdBy');

      logger.info({ count: tasks.length }, 'Loading scheduled tasks');

      for (const task of tasks) {
        this.scheduleTask(task);
      }

      logger.info({ count: this.jobs.size }, 'Scheduled tasks started');
    } catch (error) {
      logger.error({ error }, 'Failed to start scheduled tasks');
    }
  }

  /**
   * 为单个任务创建定时任务
   */
  scheduleTask(task) {
    const taskId = task._id.toString();

    // 如果任务已存在，先停止
    if (this.jobs.has(taskId)) {
      this.stopTask(taskId);
    }

    try {
      // 验证 cron 表达式
      if (!cron.validate(task.schedule.cron)) {
        logger.warn({ taskId, cron: task.schedule.cron }, 'Invalid cron expression');
        return;
      }

      // 创建定时任务
      const job = cron.schedule(
        task.schedule.cron,
        async () => {
          await this.executeScheduledTask(task);
        },
        {
          scheduled: true,
          timezone: task.schedule.timezone || 'Asia/Shanghai',
        }
      );

      this.jobs.set(taskId, job);
      logger.info({ taskId, taskName: task.name, cron: task.schedule.cron }, 'Task scheduled');
    } catch (error) {
      logger.error({ error, taskId }, 'Failed to schedule task');
    }
  }

  /**
   * 停止单个任务
   */
  stopTask(taskId) {
    const job = this.jobs.get(taskId);
    if (job) {
      job.stop();
      this.jobs.delete(taskId);
      logger.info({ taskId }, 'Task stopped');
    }
  }

  /**
   * 停止所有任务
   */
  stopAllTasks() {
    for (const [taskId, job] of this.jobs.entries()) {
      job.stop();
    }
    this.jobs.clear();
    logger.info('All scheduled tasks stopped');
  }

  /**
   * 执行定时任务
   */
  async executeScheduledTask(task) {
    const taskId = task._id.toString();
    logger.info({ taskId, taskName: task.name }, 'Executing scheduled task');

    try {
      // 获取环境
      let environment = null;
      if (task.environment_id) {
        environment = await TestEnvironment.findById(task.environment_id);
      } else {
        // 使用项目的默认环境
        const projectId = task.project_id?.toString ? task.project_id.toString() : task.project_id;
        environment = await TestEnvironment.findOne({
          project_id: projectId,
          is_default: true,
        });
      }

      // 创建测试结果记录
      const testResult = new AutoTestResult({
        task_id: task._id,
        environment_id: environment?._id || null,
        status: 'running',
        summary: {
          total: task.test_cases.filter((tc) => tc.enabled).length,
          passed: 0,
          failed: 0,
          error: 0,
          skipped: 0,
        },
        results: [],
        started_at: new Date(),
        triggered_by: 'schedule',
        triggered_by_user: task.createdBy?._id || null,
      });

      await testResult.save();

      // 异步执行测试
      const runner = new AutoTestRunner();
      runner.runTask(task, environment, testResult._id).catch((error) => {
        logger.error({ error, taskId, resultId: testResult._id }, 'Scheduled task execution error');
      });
    } catch (error) {
      logger.error({ error, taskId }, 'Failed to execute scheduled task');
    }
  }

  /**
   * 重新加载任务（当任务被更新时调用）
   */
  async reloadTask(taskId) {
    try {
      const task = await AutoTestTask.findById(taskId).populate('createdBy');
      if (!task) {
        this.stopTask(taskId);
        return;
      }

      // 如果任务已禁用或定时任务未启用，停止任务
      if (!task.enabled || !task.schedule.enabled || !task.schedule.cron) {
        this.stopTask(taskId);
        return;
      }

      // 重新调度任务
      this.scheduleTask(task);
    } catch (error) {
      logger.error({ error, taskId }, 'Failed to reload task');
    }
  }
}

// 创建单例
const scheduler = new TaskScheduler();

export default scheduler;

