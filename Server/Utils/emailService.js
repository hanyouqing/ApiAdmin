import nodemailer from 'nodemailer';
import config from './config.js';
import { logger } from './logger.js';

let transporter = null;

const initEmailService = () => {
  const provider = config.EMAIL_PROVIDER || 'smtp';
  
  if (provider === 'oci') {
    // Oracle Cloud Infrastructure Email Delivery
    if (config.OCI_EMAIL_REGION && config.OCI_EMAIL_USER && config.OCI_EMAIL_PASS) {
      const ociHost = `smtp.email.${config.OCI_EMAIL_REGION}.oci.oraclecloud.com`;
      transporter = nodemailer.createTransport({
        host: ociHost,
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: config.OCI_EMAIL_USER,
          pass: config.OCI_EMAIL_PASS,
        },
      });

      logger.info({ provider: 'oci', region: config.OCI_EMAIL_REGION, host: ociHost }, 'OCI Email Delivery service initialized');
    } else {
      logger.warn('OCI Email Delivery not configured. OCI_EMAIL_REGION, OCI_EMAIL_USER, and OCI_EMAIL_PASS are required.');
    }
  } else {
    // Standard SMTP
    if (config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: parseInt(config.SMTP_PORT) || 587,
        secure: config.SMTP_SECURE === 'true' || config.SMTP_PORT === '465',
        auth: {
          user: config.SMTP_USER,
          pass: config.SMTP_PASS,
        },
      });

      logger.info({ provider: 'smtp', host: config.SMTP_HOST }, 'Email service initialized');
    } else {
      logger.warn('Email service not configured. SMTP settings missing.');
    }
  }
};

export const sendEmail = async (to, subject, html, text) => {
  if (!transporter) {
    initEmailService();
  }

  if (!transporter) {
    throw new Error('Email service not configured');
  }

  try {
    const provider = config.EMAIL_PROVIDER || 'smtp';
    const fromEmail = provider === 'oci' 
      ? (config.OCI_EMAIL_FROM || config.OCI_EMAIL_USER)
      : (config.SMTP_FROM || config.SMTP_USER);
    
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

