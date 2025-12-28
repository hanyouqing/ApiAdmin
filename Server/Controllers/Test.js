import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import { TestRunner } from '../Utils/testRunner.js';
import TestCollection from '../Models/TestCollection.js';
import TestCase from '../Models/TestCase.js';
import TestResult from '../Models/TestResult.js';
import Project from '../Models/Project.js';

class TestController extends BaseController {
  static get ControllerName() { return 'TestController'; }
  static async listCollections(ctx) {
    try {
      const user = ctx.state.user;
      const { project_id } = ctx.query;

      const query = { uid: user._id };
      if (project_id) {
        if (!validateObjectId(project_id)) {
          ctx.status = 400;
          ctx.body = TestController.error('无效的项目ID');
          return;
        }
        query.project_id = project_id;
      }

      const collections = await TestCollection.find(query)
        .populate('project_id', 'project_name')
        .sort({ created_at: -1 });

      ctx.body = TestController.success(collections);
    } catch (error) {
      logger.error({ error }, 'Test collection list error');
      ctx.status = 500;
      ctx.body = TestController.error(
        process.env.NODE_ENV === 'production'
          ? '获取测试集合列表失败'
          : error.message || '获取测试集合列表失败'
      );
    }
  }

  static async getCollection(ctx) {
    try {
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = TestController.error('无效的测试集合ID');
        return;
      }

      const collection = await TestCollection.findById(id)
        .populate('project_id', 'project_name')
        .populate('test_cases');

      if (!collection) {
        ctx.status = 404;
        ctx.body = TestController.error('测试集合不存在');
        return;
      }

      const testCases = await TestCase.find({ collection_id: id })
        .populate('interface_id', 'title path method')
        .sort({ order: 1 });

      ctx.body = TestController.success({
        ...collection.toJSON(),
        testCases,
      });
    } catch (error) {
      logger.error({ error }, 'Get test collection error');
      ctx.status = 500;
      ctx.body = TestController.error(
        process.env.NODE_ENV === 'production'
          ? '获取测试集合失败'
          : error.message || '获取测试集合失败'
      );
    }
  }

  static async createCollection(ctx) {
    try {
      const user = ctx.state.user;
      let { name, description, project_id } = ctx.request.body;

      if (!name) {
        ctx.status = 400;
        ctx.body = TestController.error('测试集合名称不能为空');
        return;
      }

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = TestController.error('无效的项目ID');
        return;
      }

      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = TestController.error('项目不存在');
        return;
      }

      name = sanitizeInput(name);
      if (name.length > 100) {
        ctx.status = 400;
        ctx.body = TestController.error('测试集合名称长度不能超过100个字符');
        return;
      }

      if (description) {
        description = sanitizeInput(description);
        if (description.length > 500) {
          ctx.status = 400;
          ctx.body = TestController.error('测试集合描述长度不能超过500个字符');
          return;
        }
      }

      const collection = new TestCollection({
        name,
        description: description || '',
        project_id,
        test_cases: [],
        uid: user._id,
      });

      await collection.save();

      logger.info({ userId: user._id, collectionId: collection._id }, 'Test collection created');

      ctx.body = TestController.success(collection, '创建成功');
    } catch (error) {
      logger.error({ error }, 'Create test collection error');
      ctx.status = 500;
      ctx.body = TestController.error(
        process.env.NODE_ENV === 'production'
          ? '创建失败'
          : error.message || '创建失败'
      );
    }
  }

  static async updateCollection(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      let { name, description } = ctx.request.body;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = TestController.error('无效的测试集合ID');
        return;
      }

      const collection = await TestCollection.findById(id);
      if (!collection) {
        ctx.status = 404;
        ctx.body = TestController.error('测试集合不存在');
        return;
      }

      if (collection.uid.toString() !== user._id.toString() && user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = TestController.error('无权限修改此测试集合');
        return;
      }

      if (name !== undefined) {
        name = sanitizeInput(name);
        if (name.length > 100) {
          ctx.status = 400;
          ctx.body = TestController.error('测试集合名称长度不能超过100个字符');
          return;
        }
        collection.name = name;
      }

      if (description !== undefined) {
        description = sanitizeInput(description);
        if (description.length > 500) {
          ctx.status = 400;
          ctx.body = TestController.error('测试集合描述长度不能超过500个字符');
          return;
        }
        collection.description = description;
      }

      await collection.save();

      logger.info({ userId: user._id, collectionId: collection._id }, 'Test collection updated');

      ctx.body = TestController.success(collection, '更新成功');
    } catch (error) {
      logger.error({ error }, 'Update test collection error');
      ctx.status = 500;
      ctx.body = TestController.error(
        process.env.NODE_ENV === 'production'
          ? '更新失败'
          : error.message || '更新失败'
      );
    }
  }

  static async deleteCollection(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = TestController.error('无效的测试集合ID');
        return;
      }

      const collection = await TestCollection.findById(id);
      if (!collection) {
        ctx.status = 404;
        ctx.body = TestController.error('测试集合不存在');
        return;
      }

      if (collection.uid.toString() !== user._id.toString() && user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = TestController.error('无权限删除此测试集合');
        return;
      }

      await TestCase.deleteMany({ collection_id: id });
      await TestResult.deleteMany({ collection_id: id });
      await collection.deleteOne();

      logger.info({ userId: user._id, collectionId: id }, 'Test collection deleted');

      ctx.body = TestController.success(null, '删除成功');
    } catch (error) {
      logger.error({ error }, 'Delete test collection error');
      ctx.status = 500;
      ctx.body = TestController.error(
        process.env.NODE_ENV === 'production'
          ? '删除失败'
          : error.message || '删除失败'
      );
    }
  }

  static async createTestCase(ctx) {
    try {
      const user = ctx.state.user;
      const { collection_id, interface_id, name, description, request, assertion_script, order } = ctx.request.body;

      if (!validateObjectId(collection_id)) {
        ctx.status = 400;
        ctx.body = TestController.error('无效的测试集合ID');
        return;
      }

      if (!validateObjectId(interface_id)) {
        ctx.status = 400;
        ctx.body = TestController.error('无效的接口ID');
        return;
      }

      if (!name) {
        ctx.status = 400;
        ctx.body = TestController.error('测试用例名称不能为空');
        return;
      }

      const collection = await TestCollection.findById(collection_id);
      if (!collection) {
        ctx.status = 404;
        ctx.body = TestController.error('测试集合不存在');
        return;
      }

      const testCase = new TestCase({
        collection_id,
        interface_id,
        name: sanitizeInput(name),
        description: description ? sanitizeInput(description) : '',
        request: request || {},
        assertion_script: assertion_script || '',
        order: order || 0,
        enabled: true,
        uid: user._id,
      });

      await testCase.save();

      collection.test_cases.push(testCase._id);
      await collection.save();

      logger.info({ userId: user._id, testCaseId: testCase._id }, 'Test case created');

      ctx.body = TestController.success(testCase, '创建成功');
    } catch (error) {
      logger.error({ error }, 'Create test case error');
      ctx.status = 500;
      ctx.body = TestController.error(
        process.env.NODE_ENV === 'production'
          ? '创建失败'
          : error.message || '创建失败'
      );
    }
  }

  static async updateTestCase(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;
      const updateData = ctx.request.body;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = TestController.error('无效的测试用例ID');
        return;
      }

      const testCase = await TestCase.findById(id);
      if (!testCase) {
        ctx.status = 404;
        ctx.body = TestController.error('测试用例不存在');
        return;
      }

      if (testCase.uid.toString() !== user._id.toString() && user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = TestController.error('无权限修改此测试用例');
        return;
      }

      if (updateData.name !== undefined) {
        testCase.name = sanitizeInput(updateData.name);
      }
      if (updateData.description !== undefined) {
        testCase.description = sanitizeInput(updateData.description);
      }
      if (updateData.request !== undefined) {
        testCase.request = updateData.request;
      }
      if (updateData.assertion_script !== undefined) {
        testCase.assertion_script = updateData.assertion_script;
      }
      if (updateData.order !== undefined) {
        testCase.order = updateData.order;
      }
      if (updateData.enabled !== undefined) {
        testCase.enabled = updateData.enabled;
      }

      await testCase.save();

      logger.info({ userId: user._id, testCaseId: testCase._id }, 'Test case updated');

      ctx.body = TestController.success(testCase, '更新成功');
    } catch (error) {
      logger.error({ error }, 'Update test case error');
      ctx.status = 500;
      ctx.body = TestController.error(
        process.env.NODE_ENV === 'production'
          ? '更新失败'
          : error.message || '更新失败'
      );
    }
  }

  static async deleteTestCase(ctx) {
    try {
      const user = ctx.state.user;
      const { id } = ctx.params;

      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = TestController.error('无效的测试用例ID');
        return;
      }

      const testCase = await TestCase.findById(id);
      if (!testCase) {
        ctx.status = 404;
        ctx.body = TestController.error('测试用例不存在');
        return;
      }

      if (testCase.uid.toString() !== user._id.toString() && user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = TestController.error('无权限删除此测试用例');
        return;
      }

      await TestResult.deleteMany({ test_case_id: id });
      await testCase.deleteOne();

      const collection = await TestCollection.findById(testCase.collection_id);
      if (collection) {
        collection.test_cases = collection.test_cases.filter(
          (tcId) => tcId.toString() !== id
        );
        await collection.save();
      }

      logger.info({ userId: user._id, testCaseId: id }, 'Test case deleted');

      ctx.body = TestController.success(null, '删除成功');
    } catch (error) {
      logger.error({ error }, 'Delete test case error');
      ctx.status = 500;
      ctx.body = TestController.error(
        process.env.NODE_ENV === 'production'
          ? '删除失败'
          : error.message || '删除失败'
      );
    }
  }

  static async runTest(ctx) {
    try {
      const user = ctx.state.user;
      const { collection_id, environment } = ctx.request.body;

      if (!validateObjectId(collection_id)) {
        ctx.status = 400;
        ctx.body = TestController.error('无效的测试集合ID');
        return;
      }

      const collection = await TestCollection.findById(collection_id);
      if (!collection) {
        ctx.status = 404;
        ctx.body = TestController.error('测试集合不存在');
        return;
      }

      const runner = new TestRunner();
      const report = await runner.runTestCollection(collection_id, environment || {});

      for (const result of report.results) {
        const testResult = new TestResult({
          collection_id,
          test_case_id: result.testCaseId,
          status: result.status,
          request: result.request,
          response: result.response,
          assertion_result: result.assertionResult,
          error: result.error,
          duration: result.duration,
          run_at: new Date(),
          uid: user._id,
        });
        await testResult.save();
      }

      logger.info({ userId: user._id, collectionId: collection_id }, 'Test collection run completed');

      ctx.body = TestController.success(report, '测试执行完成');
    } catch (error) {
      logger.error({ error }, 'Run test error');
      ctx.status = 500;
      ctx.body = TestController.error(
        process.env.NODE_ENV === 'production'
          ? '测试执行失败'
          : error.message || '测试执行失败'
      );
    }
  }

  static async getTestHistory(ctx) {
    try {
      const { collection_id } = ctx.query;

      if (!validateObjectId(collection_id)) {
        ctx.status = 400;
        ctx.body = TestController.error('无效的测试集合ID');
        return;
      }

      const results = await TestResult.find({ collection_id })
        .populate('test_case_id', 'name')
        .sort({ run_at: -1 })
        .limit(100);

      ctx.body = TestController.success(results);
    } catch (error) {
      logger.error({ error }, 'Get test history error');
      ctx.status = 500;
      ctx.body = TestController.error(
        process.env.NODE_ENV === 'production'
          ? '获取测试历史失败'
          : error.message || '获取测试历史失败'
      );
    }
  }
}

export default TestController;

