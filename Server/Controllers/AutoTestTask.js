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
      let { name, description, project_id, test_cases, environment_id, base_url, schedule, notification } = ctx.request.body;

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
        base_url: base_url ? base_url.trim() : '',
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
      const user = ctx.state.user;
      if (!user || !user._id) {
        ctx.status = 401;
        ctx.body = AutoTestTaskController.error('用户未认证');
        return;
      }

      // 检查数据库连接
      const mongoose = (await import('mongoose')).default;
      if (mongoose.connection.readyState !== 1) {
        logger.warn({ readyState: mongoose.connection.readyState }, 'Database not connected in listTasks');
        ctx.status = 503;
        ctx.body = AutoTestTaskController.success([]);
        return;
      }

      const { project_id, enabled } = ctx.query;

      // 确保 user._id 是 ObjectId 类型
      let userId = user._id;
      if (userId && !(userId instanceof mongoose.Types.ObjectId)) {
        if (mongoose.Types.ObjectId.isValid(userId)) {
          userId = new mongoose.Types.ObjectId(userId);
        }
      }

      const query = {};
      if (project_id && validateObjectId(project_id)) {
        query.project_id = project_id;
      }
      if (enabled !== undefined) {
        query.enabled = enabled === 'true' || enabled === true;
      }

      let tasks = [];
      try {
        tasks = await AutoTestTask.find(query)
          .populate({
            path: 'project_id',
            select: 'project_name uid member',
            options: { lean: true }
          })
          .populate({
            path: 'environment_id',
            select: 'name base_url',
            options: { lean: true }
          })
          .populate({
            path: 'createdBy',
            select: 'username email',
            options: { lean: true }
          })
          .sort({ createdAt: -1 })
          .lean();
      } catch (dbError) {
        logger.error({ 
          error: {
            name: dbError?.name,
            message: dbError?.message,
            stack: dbError?.stack,
          },
          query
        }, 'Failed to query auto test tasks from database');
        // 如果查询失败，返回空数组而不是错误
        ctx.body = AutoTestTaskController.success([]);
        return;
      }
      
      // 如果 tasks 为 null 或 undefined，设置为空数组
      if (!tasks || !Array.isArray(tasks)) {
        tasks = [];
      }

      // 权限过滤：如果不是超级管理员，只返回用户有权限访问的任务
      if (user.role !== 'super_admin') {
        tasks = tasks.filter(task => {
          // 如果任务是用户创建的，允许访问
          if (task.createdBy && task.createdBy._id && task.createdBy._id.toString() === userId.toString()) {
            return true;
          }
          
          // 检查用户是否有权限访问项目
          if (task.project_id) {
            const project = task.project_id;
            const isOwner = project.uid && project.uid.toString() === userId.toString();
            const isMember = project.member && Array.isArray(project.member) && 
              project.member.some(member => {
                const memberId = member?._id?.toString() || member?.toString() || member;
                return memberId === userId.toString();
              });
            return isOwner || isMember;
          }
          
          // 如果没有项目信息，不允许访问
          return false;
        });
      }

      // 确保所有任务数据都是可序列化的普通对象
      // 使用 JSON.parse(JSON.stringify()) 来深度序列化，移除所有 Mongoose 特有的属性和方法
      let serializedTasks = [];
      try {
        serializedTasks = JSON.parse(JSON.stringify(tasks));
      } catch (serializeError) {
        logger.error({ 
          error: serializeError.message,
          stack: serializeError.stack,
          taskCount: tasks.length
        }, 'Failed to serialize tasks, trying manual serialization');
        
        // 如果 JSON 序列化失败，尝试手动序列化
        serializedTasks = tasks.map((task) => {
          try {
            // 如果 task 是 Mongoose 文档，转换为普通对象
            if (task && typeof task.toObject === 'function') {
              return task.toObject({ virtuals: false });
            }
            // 如果已经是普通对象，创建一个新的纯对象
            const taskObj = {};
            Object.keys(task).forEach((key) => {
              if (key !== '__v' && key !== '_id' || key === '_id') {
                const value = task[key];
                if (value && typeof value === 'object' && !Array.isArray(value) && typeof value.toObject === 'function') {
                  taskObj[key] = value.toObject({ virtuals: false });
                } else if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'ObjectId') {
                  taskObj[key] = value.toString();
                } else {
                  taskObj[key] = value;
                }
              }
            });
            // 确保 _id 是字符串
            if (taskObj._id && typeof taskObj._id === 'object') {
              taskObj._id = taskObj._id.toString();
            }
            return taskObj;
          } catch (itemError) {
            logger.warn({ error: itemError.message, taskId: task?._id }, 'Failed to serialize task item');
            // 返回一个最小化的对象，至少包含 _id
            return { _id: task?._id?.toString() || null, name: task?.name || 'Unknown' };
          }
        });
      }

      // 确保响应体可以被正确序列化
      try {
        // 测试序列化
        JSON.stringify(serializedTasks);
        ctx.body = AutoTestTaskController.success(serializedTasks);
      } catch (testSerializeError) {
        logger.error({ 
          error: testSerializeError.message,
          stack: testSerializeError.stack,
          taskCount: serializedTasks.length
        }, 'Response body serialization test failed');
        
        // 如果测试序列化失败，返回空数组
        ctx.body = AutoTestTaskController.success([]);
      }
    } catch (error) {
      logger.error({ 
        error: {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
        }
      }, 'List auto test tasks error');
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
      const { name, description, test_cases, environment_id, base_url, schedule, notification, enabled } = ctx.request.body;

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
        // 验证接口ID并清理数据
        const cleanedTestCases = [];
        for (let i = 0; i < test_cases.length; i++) {
          const testCase = test_cases[i];
          
          // 确保 interface_id 是有效的 ObjectId
          if (!testCase.interface_id) {
            ctx.status = 400;
            ctx.body = AutoTestTaskController.error(`测试用例 ${i + 1} 缺少接口ID`);
            return;
          }
          
          // 处理 interface_id 可能是对象的情况
          const interfaceId = typeof testCase.interface_id === 'string' 
            ? testCase.interface_id 
            : (testCase.interface_id?._id || testCase.interface_id)?.toString();
          
          if (!validateObjectId(interfaceId)) {
            ctx.status = 400;
            ctx.body = AutoTestTaskController.error(`测试用例 ${i + 1} 的接口ID无效: ${interfaceId}`);
            return;
          }
          
          // 清理并验证测试用例数据
          const cleanedCase = {
            interface_id: interfaceId,
            order: typeof testCase.order === 'number' ? testCase.order : i,
            enabled: testCase.enabled !== undefined ? Boolean(testCase.enabled) : true,
            custom_headers: testCase.custom_headers && typeof testCase.custom_headers === 'object' ? testCase.custom_headers : {},
            custom_data: testCase.custom_data && typeof testCase.custom_data === 'object' ? testCase.custom_data : {},
            path_params: testCase.path_params && typeof testCase.path_params === 'object' ? testCase.path_params : {},
            query_params: testCase.query_params && typeof testCase.query_params === 'object' ? testCase.query_params : {},
            assertion_script: typeof testCase.assertion_script === 'string' ? testCase.assertion_script : '',
          };
          
          cleanedTestCases.push(cleanedCase);
        }
        task.test_cases = cleanedTestCases;
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
      if (base_url !== undefined) {
        task.base_url = typeof base_url === 'string' ? base_url.trim() : '';
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

      // 在保存前，确保 task 是 Mongoose 文档
      if (!task || !task.save) {
        ctx.status = 500;
        ctx.body = AutoTestTaskController.error('任务对象无效');
        return;
      }

      try {
        await task.save();
      } catch (saveError) {
        logger.error({ error: saveError, taskId: id, taskData: { 
          test_cases_count: task.test_cases?.length,
          test_cases: task.test_cases?.map((tc, i) => ({
            index: i,
            interface_id: tc.interface_id,
            interface_id_type: typeof tc.interface_id,
            order: tc.order,
            enabled: tc.enabled,
          }))
        }}, 'Failed to save auto test task');
        
        // 提取详细的错误信息
        let errorMessage = saveError.message || '更新自动测试任务失败';
        if (saveError.name === 'ValidationError') {
          const validationErrors = Object.values(saveError.errors || {}).map((e) => e.message).join(', ');
          errorMessage = `验证失败: ${validationErrors}`;
        } else if (saveError.name === 'CastError') {
          errorMessage = `类型转换失败: ${saveError.message}`;
        }
        
        ctx.status = 500;
        ctx.body = AutoTestTaskController.error(
          process.env.NODE_ENV === 'production'
            ? '更新自动测试任务失败'
            : errorMessage
        );
        return;
      }

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
      logger.error({ error, errorStack: error.stack }, 'Update auto test task error');
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

  // 导出测试结果报告
  static async exportResult(ctx) {
    try {
      const { resultId } = ctx.params;
      const { format = 'html' } = ctx.request.body || ctx.query;

      if (!validateObjectId(resultId)) {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error('无效的结果ID');
        return;
      }

      const result = await AutoTestResult.findById(resultId)
        .populate('task_id', 'name')
        .populate('environment_id', 'name base_url')
        .lean();

      if (!result) {
        ctx.status = 404;
        ctx.body = AutoTestTaskController.error('测试结果不存在');
        return;
      }

      // 手动 populate results 数组中的 interface_id
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
              logger.warn({ 
                interfaceId: result.results[i].interface_id,
                error: populateError.message 
              }, 'Failed to populate interface_id in result');
            }
          }
        }
      }

      if (format === 'html') {
        // 生成 HTML 报告
        const html = AutoTestTaskController.generateHTMLReport(result);
        ctx.set('Content-Type', 'text/html; charset=utf-8');
        ctx.set('Content-Disposition', `attachment; filename="test-report-${resultId}.html"`);
        ctx.body = html;
      } else if (format === 'pdf') {
        // 尝试使用 puppeteer 生成 PDF
        try {
          let puppeteer;
          try {
            puppeteer = await import('puppeteer');
          } catch (importError) {
            logger.error({ error: importError }, 'Failed to import puppeteer');
            ctx.status = 400;
            ctx.body = AutoTestTaskController.error('PDF 导出功能需要安装 puppeteer 依赖。请在 Server 目录下运行: npm install puppeteer');
            return;
          }

          const html = AutoTestTaskController.generateHTMLReport(result);
          
          let browser;
          try {
            browser = await puppeteer.default.launch({
              headless: true,
              args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
              ],
            });
          } catch (launchError) {
            logger.error({ error: launchError }, 'Failed to launch browser');
            ctx.status = 500;
            ctx.body = AutoTestTaskController.error(
              `无法启动浏览器生成 PDF: ${launchError.message}。请确保系统已安装必要的依赖。`
            );
            return;
          }
          
          try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
            
            const pdf = await page.pdf({
              format: 'A4',
              printBackground: true,
              margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm',
              },
            });
            
            await browser.close();
            
            ctx.set('Content-Type', 'application/pdf');
            ctx.set('Content-Disposition', `attachment; filename="test-report-${resultId}.pdf"`);
            ctx.body = pdf;
          } catch (pdfError) {
            // 确保浏览器被关闭
            try {
              await browser.close();
            } catch (closeError) {
              logger.warn({ error: closeError }, 'Failed to close browser');
            }
            throw pdfError;
          }
        } catch (error) {
          logger.error({ 
            error: error.message,
            stack: error.stack,
            resultId 
          }, 'PDF generation error');
          ctx.status = 500;
          const errorMessage = process.env.NODE_ENV === 'production'
            ? 'PDF 生成失败，请检查服务器日志'
            : `PDF 生成失败: ${error.message}。如果 puppeteer 未安装，请在 Server 目录下运行: npm install puppeteer`;
          ctx.body = AutoTestTaskController.error(errorMessage);
        }
      } else {
        ctx.status = 400;
        ctx.body = AutoTestTaskController.error(`不支持的导出格式: ${format}`);
      }
    } catch (error) {
      logger.error({ error }, 'Export test result error');
      ctx.status = 500;
      ctx.body = AutoTestTaskController.error(
        process.env.NODE_ENV === 'production'
          ? '导出失败'
          : error.message || '导出失败'
      );
    }
  }

  // 生成 HTML 报告
  static generateHTMLReport(result) {
    const isAllPassed = result.summary.total > 0 && 
                        result.summary.passed === result.summary.total && 
                        result.summary.failed === 0 && 
                        result.summary.error === 0;
    const overallStatus = isAllPassed ? '成功' : '失败';
    const overallStatusColor = isAllPassed ? '#52c41a' : '#ff4d4f';
    const failedCount = result.summary.failed + result.summary.error;
    
    const formatDate = (dateStr) => {
      if (!dateStr) return 'N/A';
      const date = new Date(dateStr);
      return date.toLocaleString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    };

    const formatJSON = (obj) => {
      if (!obj) return 'N/A';
      try {
        return JSON.stringify(obj, null, 2);
      } catch {
        return String(obj);
      }
    };

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>测试报告 - ${result._id}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 2px solid #e8e8e8;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 24px;
      color: #262626;
      margin-bottom: 10px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-item {
      padding: 20px;
      border-radius: 6px;
      border: 1px solid #e8e8e8;
      text-align: center;
    }
    .summary-item.result {
      background: ${overallStatusColor}15;
      border-color: ${overallStatusColor};
    }
    .summary-item.success {
      background: #52c41a15;
      border-color: #52c41a;
    }
    .summary-item.failed {
      background: ${failedCount > 0 ? '#ff4d4f15' : '#52c41a15'};
      border-color: ${failedCount > 0 ? '#ff4d4f' : '#52c41a'};
    }
    .summary-item .label {
      font-size: 14px;
      color: #8c8c8c;
      margin-bottom: 8px;
    }
    .summary-item .value {
      font-size: 28px;
      font-weight: bold;
      color: #262626;
    }
    .summary-item.result .value {
      color: ${overallStatusColor};
    }
    .summary-item.success .value {
      color: #52c41a;
    }
    .summary-item.failed .value {
      color: ${failedCount > 0 ? '#ff4d4f' : '#52c41a'};
    }
    .info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 30px;
      padding: 15px;
      background: #fafafa;
      border-radius: 6px;
    }
    .info-item {
      display: flex;
      justify-content: space-between;
    }
    .info-item .label {
      color: #8c8c8c;
    }
    .info-item .value {
      font-weight: 500;
    }
    .test-cases {
      margin-top: 30px;
    }
    .test-case {
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      margin-bottom: 20px;
      overflow: hidden;
    }
    .test-case-header {
      padding: 15px 20px;
      background: #fafafa;
      border-bottom: 1px solid #e8e8e8;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .test-case-header.passed {
      background: #f6ffed;
      border-bottom-color: #b7eb8f;
    }
    .test-case-header.failed {
      background: #fff2e8;
      border-bottom-color: #ffbb96;
    }
    .test-case-header.error {
      background: #fff1f0;
      border-bottom-color: #ffccc7;
    }
    .test-case-number {
      display: inline-block;
      width: 30px;
      height: 30px;
      line-height: 30px;
      text-align: center;
      background: #1890ff;
      color: white;
      border-radius: 4px;
      font-weight: bold;
    }
    .test-case-status {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .test-case-status.passed {
      background: #52c41a;
      color: white;
    }
    .test-case-status.failed {
      background: #ff4d4f;
      color: white;
    }
    .test-case-status.error {
      background: #ff7875;
      color: white;
    }
    .test-case-name {
      font-weight: 500;
      flex: 1;
    }
    .test-case-method {
      color: #8c8c8c;
      font-family: monospace;
    }
    .test-case-body {
      padding: 20px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e8e8e8;
    }
    .section-content {
      background: #fafafa;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
    }
    pre {
      margin: 0;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .error-message {
      color: #ff4d4f;
      font-weight: 500;
    }
    .assertion-passed {
      color: #52c41a;
      font-weight: 500;
    }
    .assertion-failed {
      color: #ff4d4f;
      font-weight: 500;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>测试报告</h1>
      <p style="color: #8c8c8c; margin-top: 5px;">报告ID: ${result._id}</p>
    </div>
    
    <div class="summary">
      <div class="summary-item result">
        <div class="label">结果</div>
        <div class="value">${overallStatus}</div>
      </div>
      <div class="summary-item success">
        <div class="label">成功用例</div>
        <div class="value">${result.summary.passed}</div>
      </div>
      <div class="summary-item failed">
        <div class="label">失败用例</div>
        <div class="value">${failedCount}</div>
      </div>
    </div>
    
    <div class="info">
      <div class="info-item">
        <span class="label">总用例数:</span>
        <span class="value">${result.summary.total}</span>
      </div>
      <div class="info-item">
        <span class="label">耗时:</span>
        <span class="value">${result.duration}ms</span>
      </div>
      <div class="info-item">
        <span class="label">开始时间:</span>
        <span class="value">${formatDate(result.started_at)}</span>
      </div>
      <div class="info-item">
        <span class="label">结束时间:</span>
        <span class="value">${formatDate(result.completed_at || '')}</span>
      </div>
    </div>
    
    <div class="test-cases">
      <h2 style="margin-bottom: 20px; font-size: 18px;">测试用例详情</h2>
      ${(result.results || []).map((testCase, index) => {
        const statusClass = testCase.status === 'passed' ? 'passed' : 
                           testCase.status === 'failed' ? 'failed' : 'error';
        const interfaceName = testCase.interface_name || 
                              (testCase.interface_id?.title || testCase.interface_id?.path || '未知接口');
        return `
        <div class="test-case">
          <div class="test-case-header ${statusClass}">
            <span class="test-case-number">${index + 1}</span>
            <span class="test-case-status ${statusClass}">${testCase.status === 'passed' ? '通过' : testCase.status === 'failed' ? '失败' : '错误'}</span>
            <span class="test-case-name">${interfaceName}</span>
            <span class="test-case-method">${testCase.request?.method || 'GET'} ${testCase.request?.url || ''}</span>
          </div>
          <div class="test-case-body">
            <div class="section">
              <div class="section-title">请求信息</div>
              <div class="section-content">
                <div style="margin-bottom: 10px;"><strong>URL:</strong> ${testCase.request?.url || 'N/A'}</div>
                <div style="margin-bottom: 10px;"><strong>方法:</strong> ${testCase.request?.method || 'N/A'}</div>
                ${testCase.request?.query && Object.keys(testCase.request.query).length > 0 ? `
                <div style="margin-bottom: 10px;"><strong>查询参数:</strong></div>
                <pre>${formatJSON(testCase.request.query)}</pre>
                ` : ''}
                ${testCase.request?.body ? `
                <div style="margin-bottom: 10px;"><strong>请求体:</strong></div>
                <pre>${formatJSON(testCase.request.body)}</pre>
                ` : ''}
                ${testCase.request?.headers && Object.keys(testCase.request.headers).length > 0 ? `
                <div style="margin-bottom: 10px;"><strong>请求头:</strong></div>
                <pre>${formatJSON(testCase.request.headers)}</pre>
                ` : ''}
              </div>
            </div>
            
            ${testCase.response ? `
            <div class="section">
              <div class="section-title">响应信息</div>
              <div class="section-content">
                <div style="margin-bottom: 10px;"><strong>状态码:</strong> ${testCase.response.status_code || 'N/A'}</div>
                <div style="margin-bottom: 10px;"><strong>耗时:</strong> ${testCase.response.duration || 0}ms</div>
                ${testCase.response.headers && Object.keys(testCase.response.headers).length > 0 ? `
                <div style="margin-bottom: 10px;"><strong>响应头:</strong></div>
                <pre>${formatJSON(testCase.response.headers)}</pre>
                ` : ''}
                ${testCase.response.body ? `
                <div style="margin-bottom: 10px;"><strong>响应体:</strong></div>
                <pre>${formatJSON(testCase.response.body)}</pre>
                ` : ''}
              </div>
            </div>
            ` : ''}
            
            ${testCase.error ? `
            <div class="section">
              <div class="section-title">错误信息</div>
              <div class="section-content">
                <div class="error-message" style="margin-bottom: 10px;"><strong>错误:</strong> ${testCase.error.message || '未知错误'}</div>
                ${testCase.error.code ? `<div style="margin-bottom: 10px;"><strong>错误码:</strong> ${testCase.error.code}</div>` : ''}
                ${testCase.error.stack ? `
                <div style="margin-bottom: 10px;"><strong>堆栈:</strong></div>
                <pre>${testCase.error.stack}</pre>
                ` : ''}
              </div>
            </div>
            ` : ''}
            
            ${testCase.assertion_result ? `
            <div class="section">
              <div class="section-title">断言结果</div>
              <div class="section-content">
                <div class="${testCase.assertion_result.passed ? 'assertion-passed' : 'assertion-failed'}" style="margin-bottom: 10px;">
                  <strong>状态:</strong> ${testCase.assertion_result.passed ? '通过' : '失败'}
                </div>
                ${testCase.assertion_result.message ? `
                <div style="margin-bottom: 10px;"><strong>消息:</strong> ${testCase.assertion_result.message}</div>
                ` : ''}
                ${testCase.assertion_result.errors && testCase.assertion_result.errors.length > 0 ? `
                <div style="margin-bottom: 10px;"><strong>错误列表:</strong></div>
                <ul style="margin-left: 20px;">
                  ${testCase.assertion_result.errors.map((err) => `<li class="error-message">${String(err).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`).join('')}
                </ul>
                ` : ''}
              </div>
            </div>
            ` : ''}
          </div>
        </div>
        `;
      }).join('')}
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e8e8e8; text-align: center; color: #8c8c8c; font-size: 12px;">
      <p>报告生成时间: ${formatDate(new Date().toISOString())}</p>
      <p>ApiAdmin Test Pipeline Report</p>
    </div>
  </div>
</body>
</html>`;
    return html;
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

