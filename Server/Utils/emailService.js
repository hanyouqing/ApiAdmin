import nodemailer from 'nodemailer';
import config from './config.js';
import { logger } from './logger.js';

let transporter = null;
let currentConfig = null;

const initEmailService = (emailConfig = null) => {
  // Use provided config or fall back to environment variables
  const provider = emailConfig?.provider || config.EMAIL_PROVIDER || 'smtp';
  
  if (provider === 'oci') {
    const region = emailConfig?.oci?.region || config.OCI_EMAIL_REGION;
    const user = emailConfig?.oci?.user || config.OCI_EMAIL_USER;
    const pass = emailConfig?.oci?.pass || config.OCI_EMAIL_PASS;
    
    if (region && user && pass) {
      const ociHost = `smtp.email.${region}.oci.oraclecloud.com`;
      transporter = nodemailer.createTransport({
        host: ociHost,
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user,
          pass,
        },
      });

      logger.info({ provider: 'oci', region, host: ociHost }, 'OCI Email Delivery service initialized');
      currentConfig = emailConfig || { provider: 'oci', oci: { region, user, pass } };
      return;
    } else {
      logger.warn('OCI Email Delivery not configured. OCI_EMAIL_REGION, OCI_EMAIL_USER, and OCI_EMAIL_PASS are required.');
    }
  } else if (provider === 'smtp') {
    const smtpConfig = emailConfig?.smtp || {};
    const host = smtpConfig.host || config.SMTP_HOST;
    const port = smtpConfig.port || parseInt(config.SMTP_PORT) || 587;
    const secure = smtpConfig.secure !== undefined ? smtpConfig.secure : (config.SMTP_SECURE === 'true' || config.SMTP_PORT === '465');
    const user = smtpConfig.auth?.user || config.SMTP_USER;
    const pass = smtpConfig.auth?.pass || config.SMTP_PASS;
    
    if (host && user && pass) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });

      logger.info({ provider: 'smtp', host, port }, 'Email service initialized');
      currentConfig = emailConfig || { provider: 'smtp', smtp: { host, port, secure, auth: { user, pass } } };
      return;
    } else {
      logger.warn('Email service not configured. SMTP settings missing.');
    }
  } else if (provider === 'sendgrid') {
    // SendGrid uses SMTP with specific settings
    const sendgridConfig = emailConfig?.sendgrid || {};
    const apiKey = sendgridConfig.apiKey || config.SENDGRID_API_KEY;
    
    if (apiKey) {
      transporter = nodemailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: apiKey,
        },
      });

      logger.info({ provider: 'sendgrid' }, 'SendGrid email service initialized');
      currentConfig = emailConfig || { provider: 'sendgrid', sendgrid: { apiKey } };
      return;
    } else {
      logger.warn('SendGrid not configured. API key is required.');
    }
  } else if (provider === 'ses') {
    // AWS SES - would need AWS SDK, for now log warning
    logger.warn('AWS SES provider not yet implemented in emailService');
  } else if (provider === 'aliyun') {
    // Aliyun - would need Aliyun SDK, for now log warning
    logger.warn('Aliyun provider not yet implemented in emailService');
  } else if (provider === 'resend') {
    // Resend uses SMTP with specific settings
    const resendConfig = emailConfig?.resend || {};
    const apiKey = resendConfig.apiKey;
    
    if (apiKey) {
      transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 587,
        secure: false,
        auth: {
          user: 'resend',
          pass: apiKey,
        },
      });

      logger.info({ provider: 'resend' }, 'Resend email service initialized');
      currentConfig = emailConfig || { provider: 'resend', resend: { apiKey } };
      return;
    } else {
      logger.warn('Resend not configured. API key is required.');
    }
  }
  
  transporter = null;
  currentConfig = null;
};

export const sendEmail = async (to, subject, html, text, emailConfig = null) => {
  // If new config provided, reinitialize
  if (emailConfig && JSON.stringify(emailConfig) !== JSON.stringify(currentConfig)) {
    initEmailService(emailConfig);
  } else if (!transporter) {
    initEmailService();
  }

  if (!transporter) {
    throw new Error('Email service not configured. Please configure email settings first.');
  }

  try {
    const provider = currentConfig?.provider || emailConfig?.provider || config.EMAIL_PROVIDER || 'smtp';
    let fromEmail;
    
    // Priority: emailConfig > currentConfig > environment variables
    if (emailConfig?.from?.email) {
      fromEmail = emailConfig.from.email;
    } else if (currentConfig?.from?.email) {
      fromEmail = currentConfig.from.email;
    } else if (provider === 'oci') {
      fromEmail = config.OCI_EMAIL_FROM || config.OCI_EMAIL_USER;
    } else if (provider === 'resend' && emailConfig?.from?.email) {
      fromEmail = emailConfig.from.email;
    } else {
      fromEmail = config.SMTP_FROM || config.SMTP_USER;
    }
    
    if (!fromEmail) {
      throw new Error('Email "from" address is not configured');
    }
    
    const info = await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      html,
      text,
    });

    logger.info({ to, subject, messageId: info.messageId }, 'Email sent');
    return info;
  } catch (error) {
    logger.error({ error, to, subject }, 'Failed to send email');
    throw error;
  }
};

export const sendPasswordResetEmail = async (email, resetToken, resetUrl) => {
  const subject = '密码重置请求';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>密码重置请求</h2>
      <p>您请求重置密码。请点击下面的链接重置您的密码：</p>
      <p><a href="${resetUrl}?token=${resetToken}" style="background-color: #1890ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">重置密码</a></p>
      <p>或者复制以下链接到浏览器：</p>
      <p style="word-break: break-all;">${resetUrl}?token=${resetToken}</p>
      <p>此链接将在1小时后过期。</p>
      <p>如果您没有请求重置密码，请忽略此邮件。</p>
    </div>
  `;
  const text = `密码重置请求\n\n请访问以下链接重置您的密码：\n${resetUrl}?token=${resetToken}\n\n此链接将在1小时后过期。`;

  return sendEmail(email, subject, html, text);
};

export const sendVerificationCodeEmail = async (email, code) => {
  const subject = '验证码';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>验证码</h2>
      <p>您的验证码是：</p>
      <h1 style="color: #1890ff; font-size: 32px; text-align: center;">${code}</h1>
      <p>此验证码将在5分钟后过期。</p>
      <p>如果您没有请求验证码，请忽略此邮件。</p>
    </div>
  `;
  const text = `验证码\n\n您的验证码是：${code}\n\n此验证码将在5分钟后过期。`;

  return sendEmail(email, subject, html, text);
};

initEmailService();

