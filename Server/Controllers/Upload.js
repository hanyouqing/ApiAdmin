import { BaseController } from './Base.js';
import { upload, handleUploadError } from '../Middleware/upload.js';
import { logger } from '../Utils/logger.js';
import path from 'path';

class UploadController extends BaseController {
  static get ControllerName() { return 'UploadController'; }
  static async uploadFile(ctx) {
    try {
      const user = ctx.state.user;
      const file = ctx.request.file;

      if (!file) {
        ctx.status = 400;
        ctx.body = UploadController.error('请选择要上传的文件');
        return;
      }

      const fileUrl = `/uploads/${file.filename}`;

      logger.info({ userId: user._id, filename: file.filename, size: file.size }, 'File uploaded');

      ctx.body = UploadController.success(
        {
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          url: fileUrl,
        },
        '文件上传成功'
      );
    } catch (error) {
      logger.error({ error }, 'File upload error');
      ctx.status = 500;
      ctx.body = UploadController.error(
        process.env.NODE_ENV === 'production' 
          ? '上传失败' 
          : error.message || '上传失败'
      );
    }
  }

  static async uploadAvatar(ctx) {
    try {
      const user = ctx.state.user;
      const file = ctx.request.file;

      if (!file) {
        ctx.status = 400;
        ctx.body = UploadController.error('请选择要上传的头像');
        return;
      }

      if (!file.mimetype.startsWith('image/')) {
        ctx.status = 400;
        ctx.body = UploadController.error('只能上传图片文件');
        return;
      }

      const fileUrl = `/uploads/${file.filename}`;
      user.avatar = fileUrl;
      await user.save();

      logger.info({ userId: user._id, filename: file.filename }, 'Avatar uploaded');

      ctx.body = UploadController.success(
        {
          avatar: fileUrl,
        },
        '头像上传成功'
      );
    } catch (error) {
      logger.error({ error }, 'Avatar upload error');
      ctx.status = 500;
      ctx.body = UploadController.error(
        process.env.NODE_ENV === 'production' 
          ? '上传失败' 
          : error.message || '上传失败'
      );
    }
  }
}

export default UploadController;

