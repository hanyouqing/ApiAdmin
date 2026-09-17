import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import DocumentVersion from '../../Server/Models/DocumentVersion.js';
import Project from '../../Server/Models/Project.js';
import Group from '../../Server/Models/Group.js';
import User from '../../Server/Models/User.js';
import Interface from '../../Server/Models/Interface.js';
import DocumentCenterController from '../../Server/Controllers/DocumentCenter.js';

function mockCtx(overrides = {}) {
  const ctx = {
    state: { user: overrides.user },
    request: { body: overrides.body || {} },
    query: overrides.query || {},
    params: overrides.params || {},
    status: 200,
    body: null,
    set: () => {},
  };
  return ctx;
}

describe('DocumentCenter', () => {
  let user;
  let project;

  beforeEach(async () => {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB connection failed');
    }
    await DocumentVersion.deleteMany({});
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});

    user = await User.create({
      username: 'docuser',
      email: 'doc@example.com',
      password: 'Test1234',
    });

    const group = await Group.create({
      group_name: 'Doc Group',
      uid: user._id,
    });

    project = await Project.create({
      project_name: 'Doc Project',
      project_desc: 'Docs demo',
      uid: user._id,
      group_id: group._id,
      basepath: '/api',
      member: [user._id],
    });

    await Interface.create({
      title: 'Health',
      path: '/health',
      method: 'GET',
      project_id: project._id,
      uid: user._id,
      status: 'developing',
    });
  });

  afterEach(async () => {
    await DocumentVersion.deleteMany({});
    await Interface.deleteMany({});
    await Project.deleteMany({});
    await Group.deleteMany({});
    await User.deleteMany({});
  });

  it('generates an unpublished document version', async () => {
    const ctx = mockCtx({
      user,
      body: { projectId: project._id.toString() },
    });
    await DocumentCenterController.generateDocument(ctx);
    expect(ctx.body?.success).toBe(true);
    expect(ctx.body?.data?.documentId).toBeDefined();

    const doc = await DocumentVersion.findById(ctx.body.data.documentId);
    expect(doc.published).toBe(false);
    expect(doc.content?.interfaces?.length).toBe(1);
    expect(doc.openapi_spec?.paths?.['/health']).toBeDefined();
  });

  it('publishes a document and returns it as published', async () => {
    const gen = mockCtx({
      user,
      body: { projectId: project._id.toString() },
    });
    await DocumentCenterController.generateDocument(gen);
    const documentId = gen.body.data.documentId;

    const pub = mockCtx({
      user,
      body: { documentId: documentId.toString(), projectId: project._id.toString() },
    });
    await DocumentCenterController.publishDocument(pub);
    expect(pub.body?.success).toBe(true);

    const get = mockCtx({
      user,
      query: { projectId: project._id.toString() },
    });
    await DocumentCenterController.getPublishedDocument(get);
    expect(get.body?.success).toBe(true);
    expect(get.body?.data?.published).toBe(true);
    expect(get.body?.data?._id.toString()).toBe(documentId.toString());
  });

  it('lists document versions', async () => {
    const gen = mockCtx({
      user,
      body: { projectId: project._id.toString() },
    });
    await DocumentCenterController.generateDocument(gen);

    const list = mockCtx({
      user,
      query: { projectId: project._id.toString() },
    });
    await DocumentCenterController.listDocumentVersions(list);
    expect(list.body?.success).toBe(true);
    expect(list.body?.data?.length).toBeGreaterThanOrEqual(1);
  });
});
