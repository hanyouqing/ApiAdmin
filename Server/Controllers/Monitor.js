import { BaseController } from './Base.js';
import mongoose from 'mongoose';
import os from 'os';
import User from '../Models/User.js';
import Group from '../Models/Group.js';
import Project from '../Models/Project.js';
import Interface from '../Models/Interface.js';
import { logger } from '../Utils/logger.js';

class MonitorController extends BaseController {
  static get ControllerName() { return 'MonitorController'; }
  static async getStats(ctx) {
    try {
      const user = ctx.state.user;

      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = MonitorController.error('只有超级管理员可以查看统计信息');
        return;
      }

      const [
        userCount,
        groupCount,
        projectCount,
        interfaceCount,
      ] = await Promise.all([
        User.countDocuments(),
        Group.countDocuments(),
        Project.countDocuments(),
        Interface.countDocuments(),
      ]);

      // 获取系统内存信息
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const memoryUsagePercent = Math.round((usedMemory / totalMemory) * 100);

      // 获取 CPU 使用率
      // 注意：os.loadavg() 在 Windows 上可能不可用，需要处理
      // 负载平均值不是直接的CPU使用率，需要使用更准确的方法
      let cpuUsagePercent = 0;
      try {
        // 尝试使用更准确的方法：通过计算CPU时间差来获取使用率
        // 但由于这是单次调用，无法计算时间差，所以使用负载平均值作为近似值
        const cpuLoad = os.loadavg();
        const cpuCores = os.cpus().length;
        
        if (cpuLoad && cpuLoad.length > 0 && cpuCores > 0 && cpuLoad[0] > 0) {
          // 负载平均值表示系统负载，不是直接的CPU使用率
          // 负载平均值通常表示等待CPU的进程数
          // 更合理的计算：使用负载平均值，但进行归一化处理
          // 负载平均值 / 核心数 = 负载比率
          // 负载比率 > 1.0 表示系统过载
          // 为了更准确地表示CPU使用率，我们使用以下公式：
          // CPU使用率 = min(100, (负载平均值 / 核心数) * 100)
          // 但考虑到负载平均值可能不准确，我们使用更保守的计算
          const loadRatio = cpuLoad[0] / cpuCores;
          
          // 如果负载比率 <= 1.0，直接转换为百分比
          // 如果负载比率 > 1.0，说明系统过载，但我们仍然限制在100%
          // 这样可以避免显示超过100%的情况，同时更准确地反映系统状态
          if (loadRatio <= 1.0) {
            cpuUsagePercent = Math.round(loadRatio * 100);
          } else {
            // 系统过载，但显示时限制在100%
            // 可以考虑显示警告信息
            cpuUsagePercent = 100;
          }
        } else {
          // 如果无法获取负载平均值，尝试使用其他方法
          // 在 Windows 上，os.loadavg() 可能返回 [0, 0, 0]
          // 在这种情况下，我们设置为0，表示无法获取
          cpuUsagePercent = 0;
        }
      } catch (error) {
        logger.warn({ error }, 'Failed to get CPU usage');
        // 如果无法获取，设置为0，避免显示错误数据
        cpuUsagePercent = 0;
      }

      // 获取磁盘使用率
      let diskUsagePercent = 0;
      try {
        // 使用 child_process 执行系统命令获取磁盘使用率
        const { execSync } = await import('child_process');
        try {
          let diskInfo;
          if (process.platform === 'win32') {
            // Windows: 使用 wmic 获取 C 盘信息
            diskInfo = execSync('wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /format:list', { encoding: 'utf8', timeout: 5000 });
            const sizeMatch = diskInfo.match(/Size=(\d+)/);
            const freeMatch = diskInfo.match(/FreeSpace=(\d+)/);
            if (sizeMatch && freeMatch) {
              const total = parseInt(sizeMatch[1]);
              const free = parseInt(freeMatch[1]);
              const used = total - free;
              if (total > 0) {
                diskUsagePercent = Math.round((used / total) * 100);
              }
            }
          } else {
            // Unix/Linux/macOS: 使用 df 命令
            diskInfo = execSync('df -k /', { encoding: 'utf8', timeout: 5000 });
            const lines = diskInfo.split('\n');
            if (lines.length > 1) {
              // 跳过标题行，处理数据行
              const dataLine = lines[1];
              // 首先尝试从 Capacity 列解析（格式如 "30%"）
              const capacityMatch = dataLine.match(/(\d+)%/);
              if (capacityMatch) {
                diskUsagePercent = parseInt(capacityMatch[1]);
              } else {
                // 如果没有找到 Capacity 列，尝试从数值计算
                const parts = dataLine.split(/\s+/).filter(p => p);
                if (parts.length >= 4) {
                  // df 输出格式: Filesystem 1024-blocks Used Available Capacity iused ifree %iused Mounted on
                  // 或者: Filesystem 1K-blocks Used Available Use% Mounted on
                  const total = parseInt(parts[1]);
                  const used = parseInt(parts[2]);
                  if (total > 0 && !isNaN(total) && !isNaN(used) && used >= 0) {
                    diskUsagePercent = Math.round((used / total) * 100);
                  }
                }
              }
            }
          }
        } catch (execError) {
          logger.warn({ error: execError }, 'Failed to get disk usage via command');
          // 如果命令执行失败，设置为0
          diskUsagePercent = 0;
        }
      } catch (error) {
        logger.warn({ error }, 'Failed to get disk usage');
        // 如果所有方法都失败，设置为0而不是使用内存使用率
        diskUsagePercent = 0;
      }

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
          cpu: cpuUsagePercent,
          memory: memoryUsagePercent,
          disk: diskUsagePercent,
          memoryDetail: {
            used: Math.round(usedMemory / 1024 / 1024),
            total: Math.round(totalMemory / 1024 / 1024),
            free: Math.round(freeMemory / 1024 / 1024),
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            external: Math.round(process.memoryUsage().external / 1024 / 1024),
          },
          nodeVersion: process.version,
          platform: process.platform,
        },
      };

      ctx.body = MonitorController.success(stats);
    } catch (error) {
      logger.error({ error }, 'Get stats error');
      ctx.status = 500;
      ctx.body = MonitorController.error(
        process.env.NODE_ENV === 'production' 
          ? '获取统计信息失败' 
          : error.message || '获取统计信息失败'
      );
    }
  }

  static async getMetrics(ctx) {
    try {
      const promClient = await import('prom-client');
      const register = promClient.register;

      ctx.set('Content-Type', register.contentType);
      ctx.body = await register.metrics();
    } catch (error) {
      logger.error({ error }, 'Get metrics error');
      ctx.status = 500;
      ctx.body = MonitorController.error('获取指标失败');
    }
  }
}

export default MonitorController;

