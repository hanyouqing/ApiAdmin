import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import SearchController from '../../Server/Controllers/Search.js';
import Interface from '../../Server/Models/Interface.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';
import User from '../../Server/Models/User.js';

function createMockCtx(params = {}, query = {}, body = {}, user = null) {
  return {
    params,
    query,
    request: { body },
    state: { user: user || { _id: new mongoose.Types.ObjectId(), role: 'guest' } },
    status: 200,
    body: null,
  };
}

describe('SearchController', () => {
  let testUser;
  let testGroup;
  let testProject;
  let testInterface;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test', {
        serverSelectionTimeoutMS: 5000,
      });
    }
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection failed');
    }
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});

    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'Test1234',
    });

    testGroup = await Group.create({
      group_name: 'Test Group',
      uid: testUser._id,
    });

    testProject = await Project.create({
      project_name: 'Test Project',
      group_id: testGroup._id,
      uid: testUser._id,
    });

    testInterface = await Interface.create({
      title: 'Test Interface',
      path: '/api/test',
      method: 'GET',
      project_id: testProject._id,
      desc: 'Test description',
    });
  });

  afterEach(async () => {
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  describe('search', () => {
    it('should return 400 if keyword is empty', async () => {
      const ctx = createMockCtx({}, { q: '' }, {}, testUser);
      await SearchController.search(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body.success).toBe(false);
    });

    it('should search all types by default', async () => {
      await Project.create({
        project_name: 'Search Project',
        group_id: testGroup._id,
        uid: testUser._id,
      });

      const ctx = createMockCtx({}, { q: 'Test' }, {}, testUser);
      await SearchController.search(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.results.length).toBeGreaterThan(0);
      expect(ctx.body.data).toHaveProperty('pagination');
    });

    it('should search interfaces', async () => {
      await Interface.create({
        title: 'Search Interface',
        path: '/api/search',
        method: 'GET',
        project_id: testProject._id,
      });

      const ctx = createMockCtx({}, { q: 'Search', type: 'interface' }, {}, testUser);
      await SearchController.search(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.results.every(r => r.type === 'interface')).toBe(true);
    });

    it('should search projects', async () => {
      await Project.create({
        project_name: 'Search Project',
        group_id: testGroup._id,
        uid: testUser._id,
      });

      const ctx = createMockCtx({}, { q: 'Search', type: 'project' }, {}, testUser);
      await SearchController.search(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.results.every(r => r.type === 'project')).toBe(true);
    });

    it('should search groups', async () => {
      await Group.create({
        group_name: 'Search Group',
        uid: testUser._id,
      });

      const ctx = createMockCtx({}, { q: 'Search', type: 'group' }, {}, testUser);
      await SearchController.search(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.results.every(r => r.type === 'group')).toBe(true);
    });

    it('should highlight keywords', async () => {
      const ctx = createMockCtx({}, { q: 'Test' }, {}, testUser);
      await SearchController.search(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      const result = ctx.body.data.results.find(r => r.title === 'Test Interface');
      if (result) {
        expect(result.highlight).toContain('Test');
      }
    });

    it('should sort by relevance score', async () => {
      await Interface.create({
        title: 'Test Exact Match',
        path: '/api/exact',
        method: 'GET',
        project_id: testProject._id,
      });

      await Interface.create({
        title: 'Something Test',
        path: '/api/something',
        method: 'GET',
        project_id: testProject._id,
      });

      const ctx = createMockCtx({}, { q: 'Test', type: 'interface' }, {}, testUser);
      await SearchController.search(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      if (ctx.body.data.results.length > 1) {
        expect(ctx.body.data.results[0].score).toBeGreaterThanOrEqual(ctx.body.data.results[1].score);
      }
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 15; i++) {
        await Interface.create({
          title: `Test Interface ${i}`,
          path: `/api/test${i}`,
          method: 'GET',
          project_id: testProject._id,
        });
      }

      const ctx = createMockCtx({}, { q: 'Test', type: 'interface', page: 1, pageSize: 10 }, {}, testUser);
      await SearchController.search(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.results.length).toBeLessThanOrEqual(10);
    });
  });

  describe('highlightText', () => {
    it('should highlight keyword in text', () => {
      const result = SearchController.highlightText('Test Interface', 'Test');
      expect(result).toContain('<mark>Test</mark>');
    });

    it('should handle case insensitive', () => {
      const result = SearchController.highlightText('Test Interface', 'test');
      expect(result).toContain('<mark>test</mark>');
    });

    it('should return original text if keyword not found', () => {
      const text = 'Test Interface';
      const result = SearchController.highlightText(text, 'NotFound');
      expect(result).toBe(text);
    });
  });

  describe('calculateScore', () => {
    it('should return 1.0 for exact match', () => {
      const score = SearchController.calculateScore('Test', 'Test');
      expect(score).toBe(1.0);
    });

    it('should return 0.9 for starts with match', () => {
      const score = SearchController.calculateScore('Test Interface', 'Test');
      expect(score).toBe(0.9);
    });

    it('should return 0.7 for contains match', () => {
      const score = SearchController.calculateScore('My Test Interface', 'Test');
      expect(score).toBe(0.7);
    });

    it('should return 0.5 for partial match', () => {
      const score = SearchController.calculateScore('Testing', 'Test');
      expect(score).toBe(0.5);
    });

    it('should be case insensitive', () => {
      const score1 = SearchController.calculateScore('Test', 'test');
      const score2 = SearchController.calculateScore('test', 'Test');
      expect(score1).toBe(score2);
    });
  });

  describe('getSuggestions', () => {
    it('should return suggestions', async () => {
      await Interface.create({
        title: 'Test Suggestion',
        path: '/api/suggestion',
        method: 'GET',
        project_id: testProject._id,
      });

      const ctx = createMockCtx({}, { q: 'Test' }, {}, testUser);
      await SearchController.getSuggestions(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(Array.isArray(ctx.body.data)).toBe(true);
    });

    it('should return empty array if keyword is empty', async () => {
      const ctx = createMockCtx({}, { q: '' }, {}, testUser);
      await SearchController.getSuggestions(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toEqual([]);
    });

    it('should limit suggestions', async () => {
      for (let i = 0; i < 10; i++) {
        await Interface.create({
          title: `Test Interface ${i}`,
          path: `/api/test${i}`,
          method: 'GET',
          project_id: testProject._id,
        });
      }

      const ctx = createMockCtx({}, { q: 'Test', limit: 5 }, {}, testUser);
      await SearchController.getSuggestions(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getHistory', () => {
    it('should return empty array', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser);
      await SearchController.getHistory(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
      expect(ctx.body.data).toEqual([]);
    });
  });

  describe('clearHistory', () => {
    it('should clear history', async () => {
      const ctx = createMockCtx({}, {}, {}, testUser);
      await SearchController.clearHistory(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.success).toBe(true);
    });
  });
});

