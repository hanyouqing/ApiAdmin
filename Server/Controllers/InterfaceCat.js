import InterfaceCat from '../Models/InterfaceCat.js';
import Interface from '../Models/Interface.js';
import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import { logOperation } from '../Utils/operationLogger.js';

class InterfaceCatController extends BaseController {
  static get ControllerName() { return 'InterfaceCatController'; }
  static async list(ctx) {
    try {
      const { project_id } = ctx.query;

      if (!project_id) {
        ctx.status = 400;
        ctx.body = InterfaceCatController.error('项目ID不能为空');
        return;
      }

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = InterfaceCatController.error('无效的项目ID');
        return;
      }

      const cats = await InterfaceCat.find({ project_id })
        .populate('uid', 'username email avatar')
        .sort({ index: 1, created_at: 1 });

      ctx.body = InterfaceCatController.success(cats);
    } catch (error) {
      logger.error({ error }, 'InterfaceCat list error');
      ctx.status = 500;
      ctx.body = InterfaceCatController.error(
        process.env.NODE_ENV === 'production' 
          ? '获取分类列表失败' 
          : error.message || '获取分类列表失败'
      );
    }
  }

  static async add(ctx) {
    try {
      const user = ctx.state.user;
      let { project_id, name, desc, index } = ctx.request.body;

      if (!project_id || !name) {
        ctx.status = 400;
        ctx.body = InterfaceCatController.error('项目ID和分类名称不能为空');
        return;
      }

      if (!validateObjectId(project_id)) {
        ctx.status = 400;
        ctx.body = InterfaceCatController.error('无效的项目ID');
        return;
      }

      const Project = (await import('../Models/Project.js')).default;
      const project = await Project.findById(project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = InterfaceCatController.error('项目不存在');
        return;
      }

      const isMember = project.member.some(
        (memberId) => memberId.toString() === user._id.toString()
      );
      const isOwner = project.uid.toString() === user._id.toString();
      const isSuperAdmin = user.role === 'super_admin';

      if (!isMember && !isOwner && !isSuperAdmin) {
        ctx.status = 403;
        ctx.body = InterfaceCatController.error('无权限在此项目中创建分类');
        return;
      }

      name = sanitizeInput(name);
      if (name.length > 50) {
        ctx.status = 400;
        ctx.body = InterfaceCatController.error('分类名称长度不能超过50个字符');
        return;
      }

      if (desc) {
        desc = sanitizeInput(desc);
        if (desc.length > 500) {
          ctx.status = 400;
          ctx.body = InterfaceCatController.error('分类描述长度不能超过500个字符');
          return;
        }
      }

      if (index !== undefined && (typeof index !== 'number' || index < 0)) {
        ctx.status = 400;
        ctx.body = InterfaceCatController.error('索引必须是非负整数');
        return;
      }

      const cat = new InterfaceCat({
        project_id,
        name,
        desc: desc || '',
        index: index || 0,
        uid: user._id,
      });

      await cat.save();

      logger.info({ userId: user._id, catId: cat._id }, 'InterfaceCat created');
      
      // 记录操作日志
      await logOperation({
        type: 'interface',
        action: 'create_category',
        targetId: cat._id,
        targetName: name,
        userId: user._id,
        username: user.username,
        projectId: project_id,
        details: { categoryName: name, desc },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = InterfaceCatController.success(cat, '创建成功');
    } catch (error) {
      logger.error({ error }, 'InterfaceCat add error');
      ctx.status = 500;
      ctx.body = InterfaceCatController.error(
        process.env.NODE_ENV === 'production' 
          ? '创建失败' 
          : error.message || '创建失败'
      );
    }
  }

  static async update(ctx) {
    try {
      const user = ctx.state.user;
      const { _id, name, desc, index } = ctx.request.body;

      const cat = await InterfaceCat.findById(_id);

      if (!cat) {
        ctx.status = 404;
        ctx.body = InterfaceCatController.error('分类不存在');
        return;
      }

      if (name !== undefined) {
        cat.name = name;
      }
      if (desc !== undefined) {
        cat.desc = desc;
      }
      if (index !== undefined) {
        cat.index = index;
      }

      await cat.save();
      
      // 记录操作日志
      await logOperation({
        type: 'interface',
        action: 'update_category',
        targetId: cat._id,
        targetName: cat.name,
        userId: user._id,
        username: user.username,
        projectId: cat.project_id,
        details: { name, desc, index },
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = InterfaceCatController.success(cat, '更新成功');
    } catch (error) {
      ctx.status = 500;
      ctx.body = InterfaceCatController.error(error.message || '更新失败');
    }
  }

  static async delete(ctx) {
    try {
      const user = ctx.state.user;
      const { _id } = ctx.query;

      if (!_id || !validateObjectId(_id)) {
        ctx.status = 400;
        ctx.body = InterfaceCatController.error('无效的分类ID');
        return;
      }

      const cat = await InterfaceCat.findById(_id);

      if (!cat) {
        ctx.status = 404;
        ctx.body = InterfaceCatController.error('分类不存在');
        return;
      }

      const Project = (await import('../Models/Project.js')).default;
      const project = await Project.findById(cat.project_id);
      if (!project) {
        ctx.status = 404;
        ctx.body = InterfaceCatController.error('项目不存在');
        return;
      }

      const isOwner = cat.uid.toString() === user._id.toString();
      const isProjectOwner = project.uid.toString() === user._id.toString();
      const isMember = project.member.some(
        (memberId) => memberId.toString() === user._id.toString()
      );
      const isSuperAdmin = user.role === 'super_admin';

      if (!isOwner && !isProjectOwner && !isMember && !isSuperAdmin) {
        ctx.status = 403;
        ctx.body = InterfaceCatController.error('无权限删除此分类');
        return;
      }

      const interfaceCount = await Interface.countDocuments({ catid: _id });

      if (interfaceCount > 0) {
        ctx.status = 400;
        ctx.body = InterfaceCatController.error(`该分类下还有${interfaceCount}个接口，请先删除接口`);
        return;
      }

      const catName = cat.name;
      const projectId = cat.project_id;
      await InterfaceCat.findByIdAndDelete(_id);

      logger.info({ userId: user._id, catId: _id }, 'InterfaceCat deleted');
      
      // 记录操作日志
      await logOperation({
        type: 'interface',
        action: 'delete_category',
        targetId: _id,
        targetName: catName,
        userId: user._id,
        username: user.username,
        projectId: projectId,
        ip: ctx.ip || ctx.request.ip || '',
        userAgent: ctx.headers['user-agent'] || '',
        uri: ctx.request.url || '',
      });

      ctx.body = InterfaceCatController.success(null, '删除成功');
    } catch (error) {
      logger.error({ error }, 'InterfaceCat delete error');
      ctx.status = 500;
      ctx.body = InterfaceCatController.error(
        process.env.NODE_ENV === 'production' 
          ? '删除失败' 
          : error.message || '删除失败'
      );
    }
  }
}

export default InterfaceCatController;

