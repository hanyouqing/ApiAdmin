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

export const checkGroupPermission = async (ctx, next) => {
  const user = ctx.state.user;
  const { _id } = ctx.params._id || ctx.query._id || ctx.request.body._id;

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
  const isGroupLeader = user.role === 'group_leader' && isMember;

  if (!isOwner && !isSuperAdmin && !isGroupLeader) {
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
  const { _id } = ctx.params._id || ctx.query._id || ctx.request.body._id || ctx.request.body.project_id;

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
  const isProjectLeader = user.role === 'project_leader' && isMember;

  if (!isOwner && !isSuperAdmin && !isProjectLeader && !isMember) {
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


