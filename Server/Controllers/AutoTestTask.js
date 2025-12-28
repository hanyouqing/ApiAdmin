import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import { logOperation } from '../Utils/operationLogger.js';
import mongoose from 'mongoose';
import AutoTestTask from '../Models/AutoTestTask.js';
import AutoTestResult from '../Models/AutoTestResult.js';
import TestEnvironment from '../Models/TestEnvironment.js';
import Interface from '../Models/Interface.js';
import Project from '../Models/Project.js';
import { AutoTestRunner } from '../Utils/autoTestRunner.js';

class AutoTestTaskController extends BaseController {
  static get ControllerName() { return 'AutoTestTaskController'; }

  // 创建自动测试任务
  static async createTask(ctx) {
    try {
      const user = ctx.state.user;
      let { name, description, project_id, test_cases, environment_id, schedule, notification } = ctx.request.body;

      if (!name || !project_id) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('任务名称和项目ID不能为空');
        return;
      }

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('无效的项目ID');
        return;
      }

      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = AutoTestTaskController.error('项目不存在');
        return;
      }

      name = sanitizeInput(name);
      if (description) {
        description = sanitizeInput(description);
      }

      // 验证接口ID
      if (test_cases && Array.isArray(test_cases)) {
        for (const testCase of test_cases) {
          if (!validateObjectId(testCase.interface_id)) {
            ctx.status = 400;
            ctx.body = AutoTestTaskController.error(`无效的接口ID: ${testCase.interface_id}`);
            return;
          }

          const interfaceData = await Interface.findById(testCase.interface_id);
          if (!interfaceData || interfaceData.project_id.toString() !== project_id) {
            ctx.status = 400;
            ctx.body = AutoTestTaskController.error(`接口 ${testCase.interface_id} 不属于该项目`);
            return;
          }
        }
      }

      // 验证环境ID
      if (environment_id && validateObjectId(environment_id)) {
        const environment = await TestEnvironment.findById(environment_id);
        if (!environment || environment.project_id.toString() !== project_id) {
          ctx.status = 400;
          ctx.body = AutoTestTaskController.error('测试环境不存在或不属于该项目');
          return;
        }
      }

      const task = new AutoTestTask({
        name,
        description: description || '',
        project_id,
        test_cases: test_cases || [],
        environment_id: environment_id || null,
        schedule: schedule || { enabled: false },
        notification: notification || { enabled: false },
        enabled: true,
        createdBy: user._id,
      });

      await task.save();

      logger.info({ userId: user._id, taskId: task._id }, 'Auto test task created');

      // 记录操作日志
      await logOperation({
        type: 'test',
        action: 'create',
        targetId: task._id,
        targetName: name,
        userId: user._id,
        username: user.username,
        projectId: project_id,
        details: {
          test_cases_count: test_cases?.length || 0,
          environment_id: environment_id || null,
        },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = AutoTestTaskController.success(task, '自动测试任务创建成功');
    } catch (error) {
      logger.error({ error }, 'Create auto test task error');
      ctx.status = 500;
      ctx.body = AutoTestTaskController.error(
        process.env.NODE_ENV === 'production'
          ? '创建自动测试任务失败'
          : error.message || '创建自动测试任务失败'
      );
    }
  }

  // 获取任务列表
  static async listTasks(ctx) {
    try {
      const { project_id, enabled } = ctx.query;

      const query = {};
      if (project_id && validateObjectId(project_id)) {
        query.project_id = project_id;
      }
      if (enabled !== undefined) {
        query.enabled = enabled === 'true' || enabled === true;
      }

      const tasks = await AutoTestTask.find(query)
        .populate('project_id', 'project_name')
        .populate('environment_id', 'name base_url')
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 });

      ctx.body = AutoTestTaskController.success(tasks);
    } catch (error) {
      logger.error({ error }, 'List auto test tasks error');
      ctx.status = 500;
      ctx.body = AutoTestTaskController.error(
        process.env.NODE_ENV === 'production'
          ? '获取自动测试任务列表失败'
          : error.message || '获取自动测试任务列表失败'
      );
    }
  }

  // 获取任务详情
  static async getTask(ctx) {
    try {
      const { id } = ctx.params;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('无效的任务ID');
        return;
      }

      const task = await AutoTestTask.findById(id)
        .populate('project_id', 'project_name')
        .populate('environment_id')
        .populate('test_cases.interface_id', 'title path method desc');

      if (!task) {
        ctx.status = 404;
        ctx.body = AutoTestTaskController.error('自动测试任务不存在');
        return;
      }

      ctx.body = AutoTestTaskController.success(task);
    } catch (error) {
      logger.error({ error }, 'Get auto test task error');
      ctx.status = 500;
      ctx.body = AutoTestTaskController.error(
        process.env.NODE_ENV === 'production'
          ? '获取自动测试任务失败'
          : error.message || '获取自动测试任务失败'
      );
    }
  }

  // 更新任务
  static async updateTask(ctx) {
    try {
      const { id } = ctx.params;
      const { name, description, test_cases, environment_id, schedule, notification, enabled } = ctx.request.body;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('无效的任务ID');
        return;
      }

      const task = await AutoTestTask.findById(id);
      if (!task) {
        ctx.status = 404;
        ctx.body = AutoTestTaskController.error('自动测试任务不存在');
        return;
      }

      if (name !== undefined) {
        task.name = sanitizeInput(name);
      }
      if (description !== undefined) {
        task.description = sanitizeInput(description);
      }
      if (test_cases !== undefined) {
        // 验证接口ID
        for (const testCase of test_cases) {
          if (!validateObjectId(testCase.interface_id)) {
            ctx.status = 400;
            ctx.body = AutoTestTaskController.error(`无效的接口ID: ${testCase.interface_id}`);
            return;
          }
        }
        task.test_cases = test_cases;
      }
      // 处理 environment_id：支持 null、undefined、空字符串
      if (environment_id !== undefined) {
        // 处理空字符串、null、undefined 等情况
        if (environment_id && typeof environment_id === 'string' && environment_id.trim() !== '' && validateObjectId(environment_id)) {
          const environment = await TestEnvironment.findById(environment_id);
          if (!environment) {
            ctx.status = 400;
            ctx.body = AutoTestTaskController.error('测试环境不存在');
            return;
          }
          // 获取项目ID（可能是对象或字符串）
          const projectId = task.project_id?._id ? task.project_id._id.toString() : task.project_id.toString();
          const envProjectId = environment.project_id.toString();
          if (envProjectId !== projectId) {
            ctx.status = 400;
            ctx.body = AutoTestTaskController.error('测试环境不属于该项目');
            return;
          }
          task.environment_id = environment_id;
        } else {
          // 空字符串、null、undefined 或其他无效值都设置为 null
          task.environment_id = null;
        }
      }
      if (schedule !== undefined) {
        task.schedule = schedule;
      }
      if (notification !== undefined) {
        task.notification = notification;
      }
      if (enabled !== undefined) {
        task.enabled = enabled;
      }

      await task.save();

      logger.info({ taskId: task._id }, 'Auto test task updated');

      // 记录操作日志
      const user = ctx.state.user;
      const projectId = task.project_id?._id ? task.project_id._id.toString() : task.project_id.toString();
      await logOperation({
        type: 'test',
        action: 'update',
        targetId: task._id,
        targetName: task.name,
        userId: user._id,
        username: user.username,
        projectId: projectId,
        details: {
          test_cases_count: task.test_cases?.length || 0,
          environment_id: task.environment_id || null,
          enabled: task.enabled,
        },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = AutoTestTaskController.success(task, '自动测试任务更新成功');
    } catch (error) {
      logger.error({ error }, 'Update auto test task error');
      ctx.status = 500;
      ctx.body = AutoTestTaskController.error(
        process.env.NODE_ENV === 'production'
          ? '更新自动测试任务失败'
          : error.message || '更新自动测试任务失败'
      );
    }
  }

  // 删除任务
  static async deleteTask(ctx) {
    try {
      const { id } = ctx.params;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('无效的任务ID');
        return;
      }

      const task = await AutoTestTask.findById(id);
      if (!task) {
        ctx.status = 404;
        ctx.body = AutoTestTaskController.error('自动测试任务不存在');
        return;
      }

      const user = ctx.state.user;
      const taskName = task.name;
      const projectId = task.project_id?._id ? task.project_id._id.toString() : task.project_id.toString();

      await task.deleteOne();

      logger.info({ taskId: id }, 'Auto test task deleted');

      // 记录操作日志
      await logOperation({
        type: 'test',
        action: 'delete',
        targetId: id,
        targetName: taskName,
        userId: user._id,
        username: user.username,
        projectId: projectId,
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = AutoTestTaskController.success(null, '自动测试任务删除成功');
    } catch (error) {
      logger.error({ error }, 'Delete auto test task error');
      ctx.status = 500;
      ctx.body = AutoTestTaskController.error(
        process.env.NODE_ENV === 'production'
          ? '删除自动测试任务失败'
          : error.message || '删除自动测试任务失败'
      );
    }
  }

  // 执行测试任务
  static async runTask(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      const { environment_id } = ctx.request.body;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('无效的任务ID');
        return;
      }

      const task = await AutoTestTask.findById(id)
        .populate('project_id')
        .populate('test_cases.interface_id');

      if (!task) {
        ctx.status = 404;
        ctx.body = AutoTestTaskController.error('自动测试任务不存在');
        return;
      }

      if (!task.enabled) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('任务已禁用');
        return;
      }

      // 确定使用的环境
      let environment = null;
      // 获取项目ID（可能是对象或字符串）
      const projectId = task.project_id?._id ? task.project_id._id.toString() : task.project_id.toString();
      
      const envId = environment_id || task.environment_id;
      if (envId && validateObjectId(envId)) {
        environment = await TestEnvironment.findById(envId);
        if (!environment) {
          ctx.status = 400;
          ctx.body = AutoTestTaskController.error('测试环境不存在');
          return;
        }
        // 比较项目ID
        const envProjectId = environment.project_id.toString();
        if (envProjectId !== projectId) {
          ctx.status = 400;
          ctx.body = AutoTestTaskController.error('测试环境不属于该项目');
          return;
        }
      } else {
        // 使用项目的默认环境
        // Mongoose 可以接受字符串格式的 ObjectId，但为了确保一致性，使用 ObjectId 对象
        const projectObjectId = mongoose.Types.ObjectId.isValid(projectId) 
          ? new mongoose.Types.ObjectId(projectId) 
          : projectId;
        environment = await TestEnvironment.findOne({
          project_id: projectObjectId,
          is_default: true,
        });
        // 如果没有默认环境，允许继续执行（环境是可选的）
      }

      // 创建测试结果记录
      const testResult = new AutoTestResult({
        task_id: task._id,
        environment_id: environment?._id || null,
        status: 'running',
        summary: {
          total: task.test_cases.filter(tc => tc.enabled).length,
          passed: 0,
          failed: 0,
          error: 0,
          skipped: 0,
        },
        results: [],
        started_at: new Date(),
        triggered_by: 'manual',
        triggered_by_user: user._id,
      });

      await testResult.save();

      // 记录操作日志（使用上面已声明的 projectId）
      await logOperation({
        type: 'test',
        action: 'run',
        targetId: task._id,
        targetName: task.name,
        userId: user._id,
        username: user.username,
        projectId: projectId,
        details: {
          resultId: testResult._id,
          environment_id: environment?._id || null,
          environment_name: environment?.name || null,
        },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      // 异步执行测试
      const runner = new AutoTestRunner();
      runner.runTask(task, environment, testResult._id).catch((error) => {
        logger.error({ error, taskId: id, resultId: testResult._id }, 'Auto test task execution error');
      });

      ctx.body = AutoTestTaskController.success(
        {
          resultId: testResult._id,
          status: 'running',
          message: '测试任务已开始执行',
        },
        '测试任务已开始执行'
      );
    } catch (error) {
      logger.error({ error }, 'Run auto test task error');
      ctx.status = 500;
      ctx.body = AutoTestTaskController.error(
        process.env.NODE_ENV === 'production'
          ? '执行测试任务失败'
          : error.message || '执行测试任务失败'
      );
    }
  }

  // 执行单个测试用例
  static async runSingleCase(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      const { test_case_index, environment_id } = ctx.request.body;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('无效的任务ID');
        return;
      }

      if (typeof test_case_index !== 'number' || test_case_index < 0) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('无效的测试用例索引');
        return;
      }

      const task = await AutoTestTask.findById(id)
        .populate('project_id')
        .populate('test_cases.interface_id');

      if (!task) {
        ctx.status = 404;
        ctx.body = AutoTestTaskController.error('自动测试任务不存在');
        return;
      }

      if (test_case_index >= task.test_cases.length) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('测试用例索引超出范围');
        return;
      }

      // 确定使用的环境
      let environment = null;
      const projectId = task.project_id?._id ? task.project_id._id.toString() : task.project_id.toString();
      
      const envId = environment_id || task.environment_id;
      if (envId && validateObjectId(envId)) {
        const TestEnvironment = (await import('../Models/TestEnvironment.js')).default;
        environment = await TestEnvironment.findById(envId);
        if (!environment) {
          ctx.status = 400;
          ctx.body = AutoTestTaskController.error('测试环境不存在');
          return;
        }
        const envProjectId = environment.project_id.toString();
        if (envProjectId !== projectId) {
          ctx.status = 400;
          ctx.body = AutoTestTaskController.error('测试环境不属于该项目');
          return;
        }
      } else {
        const mongoose = (await import('mongoose')).default;
        const TestEnvironment = (await import('../Models/TestEnvironment.js')).default;
        const projectObjectId = mongoose.Types.ObjectId.isValid(projectId) 
          ? new mongoose.Types.ObjectId(projectId) 
          : projectId;
        environment = await TestEnvironment.findOne({
          project_id: projectObjectId,
          is_default: true,
        });
      }

      // 执行单个测试用例
      const runner = new AutoTestRunner();
      const result = await runner.runSingleCase(task, test_case_index, environment);

      ctx.body = AutoTestTaskController.success(result, '测试用例执行完成');
    } catch (error) {
      logger.error({ error }, 'Run single test case error');
      ctx.status = 500;
      ctx.body = AutoTestTaskController.error(
        process.env.NODE_ENV === 'production'
          ? '执行测试用例失败'
          : error.message || '执行测试用例失败'
      );
    }
  }

  // 获取测试结果
  static async getResult(ctx) {
    try {
      const user = ctx.state.user;
      const { resultId } = ctx.params;

      if (!validateObjectId(resultId)) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('无效的结果ID');
        return;
      }

      logger.debug({ resultId, userId: user._id?.toString() }, 'Fetching test result');

      // 先获取结果，不 populate，用于权限检查
      let result = await AutoTestResult.findById(resultId)
        .populate('task_id', 'name project_id createdBy')
        .lean();

      if (!result) {
        ctx.status = 404;
        ctx.body = AutoTestTaskController.error('测试结果不存在');
        return;
      }

      // 权限检查：验证用户是否有权限访问该测试结果
      if (user.role !== 'super_admin') {
        const task = result.task_id;
        if (!task) {
          ctx.status = 404;
          ctx.body = AutoTestTaskController.error('关联的测试任务不存在');
          return;
        }

        // 检查用户是否是任务创建者
        const isCreator = task.createdBy && task.createdBy.toString() === user._id.toString();
        
        // 检查用户是否有权限访问项目
        if (!isCreator && task.project_id) {
          const Project = (await import('../Models/Project.js')).default;
          const project = await Project.findOne({
            _id: task.project_id,
            $or: [{ uid: user._id }, { member: user._id }],
          });

          if (!project) {
            ctx.status = 403;
            ctx.body = AutoTestTaskController.error('无权限访问该测试结果');
            return;
          }
        }
      }

      // 重新获取完整的结果数据，包含 populate
      try {
        result = await AutoTestResult.findById(resultId)
          .populate('task_id', 'name')
          .populate('environment_id', 'name base_url')
          .lean();
        
        // 手动 populate results 数组中的 interface_id
        // 因为 Mongoose 的 populate 对嵌套数组的支持有限
        if (result && result.results && Array.isArray(result.results)) {
          const Interface = (await import('../Models/Interface.js')).default;
          for (let i = 0; i < result.results.length; i++) {
            if (result.results[i].interface_id) {
              try {
                const interfaceDoc = await Interface.findById(result.results[i].interface_id)
                  .select('title path method')
                  .lean();
                if (interfaceDoc) {
                  result.results[i].interface_id = interfaceDoc;
                }
              } catch (populateError) {
                // 如果 populate 失败，保留原始的 interface_id
                logger.warn({ 
                  interfaceId: result.results[i].interface_id,
                  error: populateError.message 
                }, 'Failed to populate interface_id in result');
              }
            }
          }
        }
      } catch (populateError) {
        // 如果 populate 失败，尝试不使用 populate
        logger.warn({ error: populateError.message }, 'Populate failed, trying without populate');
        result = await AutoTestResult.findById(resultId).lean();
      }

      logger.info({ 
        resultId,
        status: result.status,
        resultsCount: result.results?.length || 0,
      }, 'Test result fetched successfully');

      ctx.body = AutoTestTaskController.success(result);
    } catch (error) {
      logger.error({ 
        error: error.message,
        stack: error.stack,
        resultId: ctx.params.resultId,
        userId: ctx.state.user?._id,
      }, 'Get test result error');
      ctx.status = 500;
      ctx.body = AutoTestTaskController.error(
        process.env.NODE_ENV === 'production'
          ? '获取测试结果失败'
          : error.message || '获取测试结果失败'
      );
    }
  }

  // 获取任务的历史结果
  static async getTaskHistory(ctx) {
    try {
      const { id } = ctx.params;
      const { page = 1, pageSize = 10 } = ctx.query;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('无效的任务ID');
        return;
      }

      const skip = (parseInt(page) - 1) * parseInt(pageSize);
      const limit = parseInt(pageSize);

      const [results, total] = await Promise.all([
        AutoTestResult.find({ task_id: id })
          .populate('environment_id', 'name base_url')
          .sort({ started_at: -1 })
          .skip(skip)
          .limit(limit),
        AutoTestResult.countDocuments({ task_id: id }),
      ]);

      ctx.body = AutoTestTaskController.success({
        list: results,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize)),
        },
      });
    } catch (error) {
      logger.error({ error }, 'Get task history error');
      ctx.status = 500;
      ctx.body = AutoTestTaskController.error(
        process.env.NODE_ENV === 'production'
          ? '获取任务历史失败'
          : error.message || '获取任务历史失败'
      );
    }
  }

  // 导出测试流水线
  static async exportTask(ctx) {
    try {
      const { id } = ctx.params;
      const { format = 'json' } = ctx.query;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('无效的任务ID');
        return;
      }

      const task = await AutoTestTask.findById(id)
        .populate('project_id', 'project_name project_desc basepath')
        .populate('environment_id', 'name base_url')
        .populate('test_cases.interface_id', 'title path method');

      if (!task) {
        ctx.status = 404;
        ctx.body = AutoTestTaskController.error('测试流水线不存在');
        return;
      }

      // 构建导出数据
      const exportData = {
        version: '1.0',
        task: {
          name: task.name,
          description: task.description,
          enabled: task.enabled,
          schedule: task.schedule,
          notification: task.notification,
          project: {
            name: task.project_id?.project_name || '',
            desc: task.project_id?.project_desc || '',
            basepath: task.project_id?.basepath || '',
          },
          environment: task.environment_id
            ? {
                name: task.environment_id.name,
                base_url: task.environment_id.base_url,
              }
            : null,
          test_cases: task.test_cases.map((tc) => ({
            interface: tc.interface_id
              ? {
                  title: tc.interface_id.title,
                  path: tc.interface_id.path,
                  method: tc.interface_id.method,
                }
              : null,
            order: tc.order,
            enabled: tc.enabled,
            custom_headers: tc.custom_headers || {},
            custom_data: tc.custom_data || {},
            path_params: tc.path_params || {},
            query_params: tc.query_params || {},
            assertion_script: tc.assertion_script || '',
          })),
        },
        exported_at: new Date().toISOString(),
      };

      // 记录操作日志
      const user = ctx.state.user;
      const projectId = task.project_id?._id ? task.project_id._id.toString() : task.project_id.toString();
      await logOperation({
        type: 'test',
        action: 'export',
        targetId: task._id,
        targetName: task.name,
        userId: user._id,
        username: user.username,
        projectId: projectId,
        details: {
          format: format,
          test_cases_count: task.test_cases?.length || 0,
        },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      if (format === 'json') {
        ctx.set('Content-Type', 'application/json');
        ctx.set('Content-Disposition', `attachment; filename="${task.name}.json"`);
        ctx.body = JSON.stringify(exportData, null, 2);
      } else {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error(`不支持的导出格式: ${format}`);
      }
    } catch (error) {
      logger.error({ error }, 'Export test task error');
      ctx.status = 500;
      ctx.body = AutoTestTaskController.error(
        process.env.NODE_ENV === 'production'
          ? '导出失败'
          : error.message || '导出失败'
      );
    }
  }

  // 导入测试流水线
  static async importTask(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id, data, mode = 'normal' } = ctx.request.body;

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('无效的项目ID');
        return;
      }

      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = AutoTestTaskController.error('项目不存在');
        return;
      }

      // 解析导入数据
      let importData;
      if (typeof data === 'string') {
        importData = JSON.parse(data);
      } else {
        importData = data;
      }

      if (!importData.task) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('无效的导入数据格式');
        return;
      }

      const taskData = importData.task;
      const results = {
        imported: 0,
        skipped: 0,
        errors: [],
      };

      // 检查是否已存在同名任务
      const existingTask = await AutoTestTask.findOne({
        project_id,
        name: taskData.name,
      });

      if (existingTask && mode === 'normal') {
        results.skipped++;
        ctx.body = AutoTestTaskController.success(results, '任务已存在，已跳过');
        return;
      }

      // 处理环境ID
      let environmentId = null;
      if (taskData.environment?.name) {
        const environment = await TestEnvironment.findOne({
          project_id,
          name: taskData.environment.name,
        });
        if (environment) {
          environmentId = environment._id;
        }
      }

      // 处理测试用例中的接口ID
      const testCases = [];
      for (const testCase of taskData.test_cases || []) {
        if (!testCase.interface) {
          results.errors.push(`测试用例缺少接口信息`);
          continue;
        }

        // 根据接口路径和方法查找接口
        const interfaceData = await Interface.findOne({
          project_id,
          path: testCase.interface.path,
          method: testCase.interface.method?.toUpperCase(),
        });

        if (!interfaceData) {
          results.errors.push(
            `接口不存在: ${testCase.interface.method} ${testCase.interface.path}`
          );
          continue;
        }

        testCases.push({
          interface_id: interfaceData._id,
          order: testCase.order || 0,
          enabled: testCase.enabled !== undefined ? testCase.enabled : true,
          custom_headers: testCase.custom_headers || {},
          custom_data: testCase.custom_data || {},
          path_params: testCase.path_params || {},
          query_params: testCase.query_params || {},
          assertion_script: testCase.assertion_script || '',
        });
      }

      if (testCases.length === 0) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('没有有效的测试用例');
        return;
      }

      // 创建或更新任务
      if (existingTask && mode === 'mergin') {
        // 完全覆盖模式
        existingTask.description = taskData.description || '';
        existingTask.test_cases = testCases;
        existingTask.environment_id = environmentId;
        existingTask.schedule = taskData.schedule || { enabled: false };
        existingTask.notification = taskData.notification || { enabled: false };
        existingTask.enabled = taskData.enabled !== undefined ? taskData.enabled : true;
        await existingTask.save();
        results.imported++;
      } else if (existingTask && mode === 'good') {
        // 智能合并模式：合并测试用例，保留已有修改
        existingTask.description = taskData.description || existingTask.description;
        existingTask.test_cases = testCases;
        existingTask.environment_id = environmentId || existingTask.environment_id;
        await existingTask.save();
        results.imported++;
      } else {
        // 创建新任务
        const newTask = new AutoTestTask({
          name: taskData.name,
          description: taskData.description || '',
          project_id,
          test_cases: testCases,
          environment_id: environmentId,
          schedule: taskData.schedule || { enabled: false },
          notification: taskData.notification || { enabled: false },
          enabled: taskData.enabled !== undefined ? taskData.enabled : true,
          createdBy: user._id,
        });
        await newTask.save();
        results.imported++;
      }

      logger.info({ userId: user._id, projectId: project_id, results }, 'Test task imported');

      // 记录操作日志
      await logOperation({
        type: 'test',
        action: 'import',
        targetId: project_id, // 导入操作的目标是项目
        targetName: project.project_name,
        userId: user._id,
        username: user.username,
        projectId: project_id,
        details: {
          mode: mode,
          imported: results.imported,
          skipped: results.skipped,
          errors_count: results.errors.length,
          task_name: taskData.name,
        },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = AutoTestTaskController.success(results, '导入成功');
    } catch (error) {
      logger.error({ error }, 'Import test task error');
      ctx.status = 500;
      ctx.body = AutoTestTaskController.error(
        process.env.NODE_ENV === 'production'
          ? '导入失败'
          : error.message || '导入失败'
      );
    }
  }
}

export default AutoTestTaskController;

