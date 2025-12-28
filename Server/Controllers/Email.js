import { BaseController } from './Base.js';
import { validateObjectId, sanitizeInput, validateEmail } from '../Utils/validation.js';
import { logger } from '../Utils/logger.js';
import EmailTemplate from '../Models/EmailTemplate.js';
import { sendEmail } from '../Utils/emailService.js';
import config from '../Utils/config.js';

class EmailController extends BaseController {
  static get ControllerName() { return 'EmailController'; }

  static async getConfig(ctx) {
    try {
      const emailConfig = {
        provider: config.EMAIL_PROVIDER || 'smtp',
        smtp: {
          host: config.SMTP_HOST || '',
          port: parseInt(config.SMTP_PORT) || 587,
          secure: config.SMTP_SECURE === 'true' || config.SMTP_PORT === '465',
          auth: {
            user: config.SMTP_USER || '',
            pass: config.SMTP_PASS || '',
          },
        },
        oci: {
          region: config.OCI_EMAIL_REGION || '',
          user: config.OCI_EMAIL_USER || '',
          pass: config.OCI_EMAIL_PASS || '',
          from: config.OCI_EMAIL_FROM || '',
          host: config.OCI_EMAIL_REGION 
            ? `smtp.email.${config.OCI_EMAIL_REGION}.oci.oraclecloud.com`
            : '',
        },
        sendgrid: {
          apiKey: config.SENDGRID_API_KEY || '',
        },
        ses: {
          accessKeyId: config.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: config.AWS_SECRET_ACCESS_KEY || '',
          region: config.AWS_REGION || '',
        },
        aliyun: {
          accessKeyId: config.ALIYUN_ACCESS_KEY_ID || '',
          accessKeySecret: config.ALIYUN_ACCESS_KEY_SECRET || '',
          region: config.ALIYUN_REGION || '',
        },
        from: {
          name: config.SMTP_FROM_NAME || 'ApiAdmin',
          email: config.EMAIL_PROVIDER === 'oci'
            ? (config.OCI_EMAIL_FROM || config.OCI_EMAIL_USER || '')
            : (config.SMTP_FROM || config.SMTP_USER || ''),
        },
      };

      ctx.body = EmailController.success(emailConfig);
    } catch (error) {
      logger.error({ error }, 'Get email config error');
      ctx.status = 500;
      ctx.body = EmailController.error(
        process.env.NODE_ENV === 'production'
          ? '获取邮件配置失败'
          : error.message || '获取邮件配置失败'
      );
    }
  }

  static async updateConfig(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = EmailController.error('无权限修改邮件配置');
        return;
      }

      // TODO: 实现配置更新逻辑
      // 需要将配置保存到数据库或环境变量

      ctx.body = EmailController.success(null, '邮件配置更新成功');
    } catch (error) {
      logger.error({ error }, 'Update email config error');
      ctx.status = 500;
      ctx.body = EmailController.error(
        process.env.NODE_ENV === 'production'
          ? '更新邮件配置失败'
          : error.message || '更新邮件配置失败'
      );
    }
  }

  static async testEmail(ctx) {
    try {
      const { to, subject, content } = ctx.request.body;

      if (!to || !validateEmail(to)) {
        ctx.status = 400;
        ctx.body = EmailController.error('有效的邮箱地址不能为空');
        return;
      }

      const testSubject = subject || 'ApiAdmin 测试邮件';
      const testContent = content || '<p>这是一封测试邮件。</p>';

      await sendEmail(to, testSubject, testContent);

      ctx.body = EmailController.success(null, '测试邮件发送成功');
    } catch (error) {
      logger.error({ error }, 'Send test email error');
      ctx.status = 500;
      ctx.body = EmailController.error(
        process.env.NODE_ENV === 'production'
          ? '发送测试邮件失败'
          : error.message || '发送测试邮件失败'
      );
    }
  }

  static async listTemplates(ctx) {
    try {
      const templates = await EmailTemplate.find({})
        .populate('createdBy', 'username')
        .sort({ createdAt: -1 });

      ctx.body = EmailController.success(templates);
    } catch (error) {
      logger.error({ error }, 'List email templates error');
      ctx.status = 500;
      ctx.body = EmailController.error(
        process.env.NODE_ENV === 'production'
          ? '获取邮件模板列表失败'
          : error.message || '获取邮件模板列表失败'
      );
    }
  }

  static async getTemplate(ctx) {
    try {
      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = EmailController.error('无效的模板 ID');
        return;
      }

      const template = await EmailTemplate.findById(id)
        .populate('createdBy', 'username');

      if (!template) {
        ctx.status = 404;
        ctx.body = EmailController.error('邮件模板不存在');
        return;
      }

      ctx.body = EmailController.success(template);
    } catch (error) {
      logger.error({ error }, 'Get email template error');
      ctx.status = 500;
      ctx.body = EmailController.error(
        process.env.NODE_ENV === 'production'
          ? '获取邮件模板失败'
          : error.message || '获取邮件模板失败'
      );
    }
  }

  static async createTemplate(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = EmailController.error('无权限创建邮件模板');
        return;
      }

      let { name, type, subject, html, text, variables } = ctx.request.body;

      if (!name || !type || !subject || !html) {
        ctx.status = 400;
        ctx.body = EmailController.error('名称、类型、主题和 HTML 内容不能为空');
        return;
      }

      if (!['verification', 'welcome', 'password-reset', 'interface-change', 'custom'].includes(type)) {
        ctx.status = 400;
        ctx.body = EmailController.error('无效的模板类型');
        return;
      }

      name = sanitizeInput(name);
      subject = sanitizeInput(subject);

      const template = new EmailTemplate({
        name,
        type,
        subject,
        html,
        text: text || '',
        variables: variables || [],
        createdBy: user._id,
      });

      await template.save();

      logger.info({ userId: user._id, templateId: template._id }, 'Email template created');

      ctx.body = EmailController.success(template, '邮件模板创建成功');
    } catch (error) {
      logger.error({ error }, 'Create email template error');
      ctx.status = 500;
      ctx.body = EmailController.error(
        process.env.NODE_ENV === 'production'
          ? '创建邮件模板失败'
          : error.message || '创建邮件模板失败'
      );
    }
  }

  static async updateTemplate(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = EmailController.error('无权限修改邮件模板');
        return;
      }

      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = EmailController.error('无效的模板 ID');
        return;
      }

      const template = await EmailTemplate.findById(id);
      if (!template) {
        ctx.status = 404;
        ctx.body = EmailController.error('邮件模板不存在');
        return;
      }

      const { name, subject, html, text, variables } = ctx.request.body;

      if (name !== undefined) {
        template.name = sanitizeInput(name);
      }
      if (subject !== undefined) {
        template.subject = sanitizeInput(subject);
      }
      if (html !== undefined) {
        template.html = html;
      }
      if (text !== undefined) {
        template.text = text;
      }
      if (variables !== undefined) {
        template.variables = variables;
      }

      await template.save();

      logger.info({ userId: user._id, templateId: template._id }, 'Email template updated');

      ctx.body = EmailController.success(template, '邮件模板更新成功');
    } catch (error) {
      logger.error({ error }, 'Update email template error');
      ctx.status = 500;
      ctx.body = EmailController.error(
        process.env.NODE_ENV === 'production'
          ? '更新邮件模板失败'
          : error.message || '更新邮件模板失败'
      );
    }
  }

  static async deleteTemplate(ctx) {
    try {
      const user = ctx.state.user;
      if (user.role !== 'super_admin') {
        ctx.status = 403;
        ctx.body = EmailController.error('无权限删除邮件模板');
        return;
      }

      const { id } = ctx.params;
      if (!validateObjectId(id)) {
        ctx.status = 400;
        ctx.body = EmailController.error('无效的模板 ID');
        return;
      }

      const template = await EmailTemplate.findById(id);
      if (!template) {
        ctx.status = 404;
        ctx.body = EmailController.error('邮件模板不存在');
        return;
      }

      await template.deleteOne();

      logger.info({ userId: user._id, templateId: id }, 'Email template deleted');

      ctx.body = EmailController.success(null, '邮件模板删除成功');
    } catch (error) {
      logger.error({ error }, 'Delete email template error');
      ctx.status = 500;
      ctx.body = EmailController.error(
        process.env.NODE_ENV === 'production'
          ? '删除邮件模板失败'
          : error.message || '删除邮件模板失败'
      );
    }
  }

  static async sendEmail(ctx) {
    try {
      const { to, templateId, variables, subject, attachments } = ctx.request.body;

      if (!to || !templateId) {
        ctx.status = 400;
        ctx.body = EmailController.error('收件人和模板 ID 不能为空');
        return;
      }

      if (!validateObjectId(templateId)) {
        ctx.status = 400;
        ctx.body = EmailController.error('无效的模板 ID');
        return;
      }

      const template = await EmailTemplate.findById(templateId);
      if (!template) {
        ctx.status = 404;
        ctx.body = EmailController.error('邮件模板不存在');
        return;
      }

      // 替换模板变量
      let html = template.html;
      let emailSubject = subject || template.subject;

      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          html = html.replace(regex, value);
          emailSubject = emailSubject.replace(regex, value);
        }
      }

      // 发送邮件
      const recipients = Array.isArray(to) ? to : [to];
      let sentCount = 0;
      let failedCount = 0;
      const messageIds = [];

      for (const recipient of recipients) {
        try {
          if (!validateEmail(recipient)) {
            failedCount++;
            continue;
          }

          const info = await sendEmail(recipient, emailSubject, html, template.text);
          messageIds.push(info.messageId);
          sentCount++;
        } catch (error) {
          logger.error({ error, to: recipient }, 'Failed to send email');
          failedCount++;
        }
      }

      logger.info({ sentCount, failedCount, templateId }, 'Emails sent');

      ctx.body = EmailController.success({
        sentCount,
        failedCount,
        messageIds,
      }, '邮件发送完成');
    } catch (error) {
      logger.error({ error }, 'Send email error');
      ctx.status = 500;
      ctx.body = EmailController.error(
        process.env.NODE_ENV === 'production'
          ? '发送邮件失败'
          : error.message || '发送邮件失败'
      );
    }
  }
}

export default EmailController;

