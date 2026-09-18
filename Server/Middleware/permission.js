export const checkPermission = (requiredRole) => {
  return async (ctx, next) => {
    const user = ctx.state.user;

    if (!user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '未授权',
      };
      return;
    }

    const roleHierarchy = {
      guest: 0,
      developer: 1,
      project_leader: 2,
      group_leader: 3,
      super_admin: 4,
    };

    const userRoleLevel = roleHierarchy[user.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足',
      };
      return;
    }

    await next();
  };
};

function resolveResourceId(ctx, ...keys) {
  for (const key of keys) {
    const fromParams = ctx.params?.[key];
    const fromQuery = ctx.query?.[key];
    const fromBody = ctx.request?.body?.[key];
    const value = fromParams || fromQuery || fromBody;
    if (value && (typeof value === 'string' || typeof value === 'object')) {
      return value.toString();
    }
  }
  return null;
}

async function resolveProjectId(ctx) {
  const path = ctx.path || '';

  // Prefer explicit project keys
  const explicit = resolveResourceId(ctx, 'project_id', 'projectId');
  if (explicit) {
    return explicit;
  }
  if (ctx.params?.projectId) {
    return ctx.params.projectId.toString();
  }

  // Project CRUD uses `_id` as project id (not interface/mock)
  if (path.includes('/api/project/') || path.includes('/api/projects/')) {
    const projectId = resolveResourceId(ctx, '_id', 'id');
    if (projectId) return projectId;
  }

  // Resolve via interface _id / interface_id
  const interfaceId = resolveResourceId(ctx, 'interface_id', 'interfaceId')
    || (path.includes('/interface/') ? resolveResourceId(ctx, '_id') : null);
  if (interfaceId) {
    const Interface = (await import('../Models/Interface.js')).default;
    const iface = await Interface.findById(interfaceId).select('project_id').lean();
    if (iface?.project_id) {
      return iface.project_id.toString();
    }
  }

  // Resolve via mock expectation _id
  if (ctx.path?.includes('/mock/expectation/')) {
    const expectationId = resolveResourceId(ctx, '_id', 'id');
    if (expectationId) {
      const MockExpectation = (await import('../Models/MockExpectation.js')).default;
      const exp = await MockExpectation.findById(expectationId).select('project_id').lean();
      if (exp?.project_id) {
        return exp.project_id.toString();
      }
    }
  }

  // Resolve via collection / test case / auto-test task
  const collectionId = resolveResourceId(ctx, 'collectionId', 'collection_id');
  if (collectionId) {
    const TestCollection = (await import('../Models/TestCollection.js')).default;
    const col = await TestCollection.findById(collectionId).select('project_id').lean();
    if (col?.project_id) {
      return col.project_id.toString();
    }
  }

  if (ctx.path?.includes('/auto-test/tasks') && ctx.params?.id) {
    const AutoTestTask = (await import('../Models/AutoTestTask.js')).default;
    const task = await AutoTestTask.findById(ctx.params.id).select('project_id').lean();
    if (task?.project_id) {
      return task.project_id.toString();
    }
  }

  // Resolve via DocumentVersion documentId
  const documentId = resolveResourceId(ctx, 'documentId', 'document_id');
  if (documentId && (path.includes('/api/docs/') || path.includes('/document'))) {
    const DocumentVersion = (await import('../Models/DocumentVersion.js')).default;
    const doc = await DocumentVersion.findById(documentId).select('project_id').lean();
    if (doc?.project_id) {
      return doc.project_id.toString();
    }
  }

  // CLI token scoped project
  if (ctx.state?.projectId) {
    return ctx.state.projectId.toString();
  }

  return null;
}

export const checkGroupPermission = async (ctx, next) => {
  const user = ctx.state.user;
  const _id = resolveResourceId(ctx, 'group_id', 'groupId', '_id', 'id');

  if (!_id) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      message: '缺少分组ID',
    };
    return;
  }

  const Group = (await import('../Models/Group.js')).default;
  const group = await Group.findById(_id);

  if (!group) {
    ctx.status = 404;
    ctx.body = {
      success: false,
      message: '分组不存在',
    };
    return;
  }

  const isOwner = group.uid.toString() === user._id.toString();
  const isMember = group.member.some(
    (memberId) => memberId.toString() === user._id.toString()
  );
  const isSuperAdmin = user.role === 'super_admin';

  if (!isOwner && !isSuperAdmin && !isMember) {
    ctx.status = 403;
    ctx.body = {
      success: false,
      message: '无权限访问此分组',
    };
    return;
  }

  ctx.state.group = group;
  await next();
};

export const checkProjectPermission = async (ctx, next) => {
  const user = ctx.state.user;
  const _id = await resolveProjectId(ctx);

  if (!_id) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      message: '缺少项目ID',
    };
    return;
  }

  const Project = (await import('../Models/Project.js')).default;
  const project = await Project.findById(_id);

  if (!project) {
    ctx.status = 404;
    ctx.body = {
      success: false,
      message: '项目不存在',
    };
    return;
  }

  const isOwner = project.uid.toString() === user._id.toString();
  const isMember = project.member.some(
    (memberId) => memberId.toString() === user._id.toString()
  );
  const isSuperAdmin = user.role === 'super_admin';

  if (!isOwner && !isSuperAdmin && !isMember) {
    ctx.status = 403;
    ctx.body = {
      success: false,
      message: '无权限访问此项目',
    };
    return;
  }

  ctx.state.project = project;
  await next();
};

/**
 * For create-group / create-project: any authenticated user may create;
 * mutating existing resources must use checkGroupPermission / checkProjectPermission.
 */
export const requireAuthenticated = async (ctx, next) => {
  if (!ctx.state.user) {
    ctx.status = 401;
    ctx.body = { success: false, message: '未授权' };
    return;
  }
  await next();
};
