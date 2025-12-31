import multer from 'koa-multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import config from '../Utils/config.js';
import { logger } from '../Utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '../../', config.UPLOAD_PATH || './uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/json',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(config.UPLOAD_MAX_SIZE) || 10485760,
  },
  fileFilter,
});

export const handleUploadError = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '文件大小超过限制',
        };
        return;
      }
      logger.error({ error }, 'Upload error');
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.message || '文件上传失败',
      };
      return;
    }
    throw error;
  }
};


