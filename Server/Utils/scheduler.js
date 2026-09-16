import cron from 'node-cron';
import { logger } from './logger.js';
import AutoTestTask from '../Models/AutoTestTask.js';
import AutoTestResult from '../Models/AutoTestResult.js';
import ApiMonitor from '../Models/ApiMonitor.js';
import { AutoTestRunner } from './autoTestRunner.js';
import TestEnvironment from '../Models/TestEnvironment.js';
import { runApiMonitor } from './apiMonitorRunner.js';

class TaskScheduler {
  constructor() {
    this.jobs = new Map(); // AutoTestTask jobs: taskId -> job
    this.monitorJobs = new Map(); // ApiMonitor jobs: monitorId -> job
  }

  /**
   * 启动所有启用的定时任务（Pipeline + Monitor）
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

      const monitors = await ApiMonitor.find({
        enabled: true,
        'schedule.enabled': true,
        'schedule.cron': { $ne: '' },
      });

      logger.info({ count: monitors.length }, 'Loading scheduled monitors');
      for (const monitor of monitors) {
        this.scheduleMonitor(monitor);
      }

      logger.info(
        { tasks: this.jobs.size, monitors: this.monitorJobs.size },
        'Scheduled jobs started'
      );
    } catch (error) {
      logger.error({ error }, 'Failed to start scheduled tasks');
    }
  }

  scheduleTask(task) {
    const taskId = task._id.toString();

    if (this.jobs.has(taskId)) {
      this.stopTask(taskId);
    }

    try {
      if (!cron.validate(task.schedule.cron)) {
        logger.warn({ taskId, cron: task.schedule.cron }, 'Invalid cron expression');
        return;
      }

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

  scheduleMonitor(monitor) {
    const monitorId = monitor._id.toString();

    if (this.monitorJobs.has(monitorId)) {
      this.stopMonitor(monitorId);
    }

    try {
      if (!cron.validate(monitor.schedule.cron)) {
        logger.warn({ monitorId, cron: monitor.schedule.cron }, 'Invalid monitor cron');
        return;
      }

      const job = cron.schedule(
        monitor.schedule.cron,
        async () => {
          try {
            logger.info({ monitorId, name: monitor.name }, 'Executing scheduled monitor');
            await runApiMonitor(monitorId, { triggeredBy: 'schedule' });
          } catch (error) {
            logger.error({ error, monitorId }, 'Scheduled monitor failed');
          }
        },
        {
          scheduled: true,
          timezone: monitor.schedule.timezone || 'Asia/Shanghai',
        }
      );

      this.monitorJobs.set(monitorId, job);
      logger.info(
        { monitorId, name: monitor.name, cron: monitor.schedule.cron },
        'Monitor scheduled'
      );
    } catch (error) {
      logger.error({ error, monitorId }, 'Failed to schedule monitor');
    }
  }

  stopTask(taskId) {
    const job = this.jobs.get(taskId);
    if (job) {
      job.stop();
      this.jobs.delete(taskId);
      logger.info({ taskId }, 'Task stopped');
    }
  }

  stopMonitor(monitorId) {
    const job = this.monitorJobs.get(String(monitorId));
    if (job) {
      job.stop();
      this.monitorJobs.delete(String(monitorId));
      logger.info({ monitorId }, 'Monitor stopped');
    }
  }

  stopAllTasks() {
    for (const [taskId, job] of this.jobs.entries()) {
      job.stop();
    }
    this.jobs.clear();
    for (const [monitorId, job] of this.monitorJobs.entries()) {
      job.stop();
    }
    this.monitorJobs.clear();
    logger.info('All scheduled jobs stopped');
  }

  async executeScheduledTask(task) {
    const taskId = task._id.toString();
    logger.info({ taskId, taskName: task.name }, 'Executing scheduled task');

    try {
      let environment = null;
      if (task.environment_id) {
        environment = await TestEnvironment.findById(task.environment_id);
      } else {
        const projectId = task.project_id?.toString ? task.project_id.toString() : task.project_id;
        environment = await TestEnvironment.findOne({
          project_id: projectId,
          is_default: true,
        });
      }

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

      const runner = new AutoTestRunner();
      runner.runTask(task, environment, testResult._id).catch((error) => {
        logger.error({ error, taskId, resultId: testResult._id }, 'Scheduled task execution error');
      });
    } catch (error) {
      logger.error({ error, taskId }, 'Failed to execute scheduled task');
    }
  }

  async reloadTask(taskId) {
    try {
      const task = await AutoTestTask.findById(taskId).populate('createdBy');
      if (!task) {
        this.stopTask(taskId);
        return;
      }

      if (!task.enabled || !task.schedule.enabled || !task.schedule.cron) {
        this.stopTask(taskId);
        return;
      }

      this.scheduleTask(task);
    } catch (error) {
      logger.error({ error, taskId }, 'Failed to reload task');
    }
  }

  async reloadMonitor(monitorId) {
    try {
      const id = String(monitorId);
      const monitor = await ApiMonitor.findById(id);
      if (!monitor) {
        this.stopMonitor(id);
        return;
      }

      if (!monitor.enabled || !monitor.schedule.enabled || !monitor.schedule.cron) {
        this.stopMonitor(id);
        return;
      }

      this.scheduleMonitor(monitor);
    } catch (error) {
      logger.error({ error, monitorId }, 'Failed to reload monitor');
    }
  }
}

const scheduler = new TaskScheduler();

export default scheduler;
