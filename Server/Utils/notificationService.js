import { sendEmail } from './emailService.js';
import { logger } from './logger.js';
import EmailConfig from '../Models/EmailConfig.js';
import axios from 'axios';

/**
 * 发送测试通知邮件
 * @param {Object} task - 测试任务
 * @param {Object} result - 测试结果
 * @param {Array<string>} emailAddresses - 邮箱地址列表
 */
export async function sendTestNotificationEmail(task, result, emailAddresses) {
  try {
    // 获取邮件配置
    const emailConfig = await EmailConfig.getConfig();
    if (!emailConfig) {
      logger.warn('Email service not configured, skipping email notification');
      return;
    }

    // 检查邮件配置是否有效
    const provider = emailConfig.provider || 'smtp';
    let isConfigured = false;

    if (provider === 'smtp') {
      const smtp = emailConfig.smtp || {};
      isConfigured = !!(smtp.host && smtp.auth && smtp.auth.user && smtp.auth.pass);
    } else if (provider === 'sendgrid') {
      const sendgrid = emailConfig.sendgrid || {};
      isConfigured = !!sendgrid.apiKey;
    } else if (provider === 'resend') {
      const resend = emailConfig.resend || {};
      isConfigured = !!resend.apiKey;
    } else if (provider === 'oci') {
      const oci = emailConfig.oci || {};
      isConfigured = !!(oci.region && oci.user && oci.pass);
    }

    if (!isConfigured) {
      logger.warn({ provider }, 'Email service not properly configured, skipping email notification');
      return;
    }

    // 构建邮件主题
    const statusText = result.status === 'passed' ? '成功' : result.status === 'failed' ? '失败' : '错误';
    const subject = `[ApiAdmin] 测试流水线 ${task.name} 执行${statusText}`;

    // 构建邮件内容
    const summary = result.summary || {};
    const passRate = summary.total > 0 
      ? ((summary.passed / summary.total) * 100).toFixed(2) 
      : '0.00';
    
    const duration = result.duration ? `${(result.duration / 1000).toFixed(2)}秒` : '未知';
    const completedAt = result.completed_at 
      ? new Date(result.completed_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
      : '未知';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${result.status === 'passed' ? '#52c41a' : '#ff4d4f'}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f5f5f5; padding: 20px; border-radius: 0 0 5px 5px; }
          .info-row { margin: 10px 0; }
          .label { font-weight: bold; display: inline-block; width: 120px; }
          .status { display: inline-block; padding: 3px 10px; border-radius: 3px; color: white; font-weight: bold; }
          .status.passed { background-color: #52c41a; }
          .status.failed { background-color: #ff4d4f; }
          .status.error { background-color: #fa8c16; }
          .summary { margin-top: 20px; padding: 15px; background-color: white; border-radius: 5px; }
          .summary-item { margin: 8px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>测试流水线执行${statusText}</h2>
          </div>
          <div class="content">
            <div class="info-row">
              <span class="label">任务名称:</span>
              <span>${task.name || '未知'}</span>
            </div>
            <div class="info-row">
              <span class="label">执行状态:</span>
              <span class="status ${result.status}">${statusText}</span>
            </div>
            <div class="info-row">
              <span class="label">完成时间:</span>
              <span>${completedAt}</span>
            </div>
            <div class="info-row">
              <span class="label">执行时长:</span>
              <span>${duration}</span>
            </div>
            
            <div class="summary">
              <h3>测试摘要</h3>
              <div class="summary-item">
                <span class="label">总计:</span>
                <span>${summary.total || 0} 个测试用例</span>
              </div>
              <div class="summary-item">
                <span class="label">通过:</span>
                <span style="color: #52c41a;">${summary.passed || 0}</span>
              </div>
              <div class="summary-item">
                <span class="label">失败:</span>
                <span style="color: #ff4d4f;">${summary.failed || 0}</span>
              </div>
              <div class="summary-item">
                <span class="label">错误:</span>
                <span style="color: #fa8c16;">${summary.error || 0}</span>
              </div>
              <div class="summary-item">
                <span class="label">通过率:</span>
                <span>${passRate}%</span>
              </div>
            </div>
          </div>
          <div class="footer">
            <p>此邮件由 ApiAdmin 自动发送，请勿回复。</p>
            <p>测试结果ID: ${result._id}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
测试流水线执行${statusText}

任务名称: ${task.name || '未知'}
执行状态: ${statusText}
完成时间: ${completedAt}
执行时长: ${duration}

测试摘要:
- 总计: ${summary.total || 0} 个测试用例
- 通过: ${summary.passed || 0}
- 失败: ${summary.failed || 0}
- 错误: ${summary.error || 0}
- 通过率: ${passRate}%

测试结果ID: ${result._id}

详细测试报告请查看附件中的 HTML 文件。
    `;

    // 生成 HTML 测试报告作为附件
    let attachments = [];
    try {
      // 确保 result 是普通对象（如果是 Mongoose 文档，需要转换）
      let resultData = result;
      if (result.toObject && typeof result.toObject === 'function') {
        resultData = result.toObject();
      } else if (result.toJSON && typeof result.toJSON === 'function') {
        resultData = result.toJSON();
      }
      
      // 动态导入 AutoTestTaskController 以避免循环依赖
      const { default: AutoTestTaskController } = await import('../Controllers/AutoTestTask.js');
      const htmlReport = AutoTestTaskController.generateHTMLReport(resultData);
      const fileName = `test-report-${(task.name || 'test').replace(/[^a-zA-Z0-9]/g, '_')}-${resultData._id || resultData.id || 'unknown'}-${new Date().toISOString().split('T')[0]}.html`;
      
      attachments = [
        {
          filename: fileName,
          content: htmlReport,
          contentType: 'text/html',
        },
      ];
      
      logger.info({ taskId: task._id, resultId: resultData._id || resultData.id, fileName }, 'HTML test report generated for email attachment');
    } catch (error) {
      logger.error({ error, taskId: task._id, resultId: result._id || result.id }, 'Failed to generate HTML report for email attachment');
      // 即使生成报告失败，也继续发送邮件（不带附件）
    }

    // 发送邮件到所有收件人
    const emailPromises = emailAddresses.map(email => 
      sendEmail(email, subject, html, text, emailConfig, attachments).catch(error => {
        logger.error({ error, email, taskId: task._id, resultId: result._id }, 'Failed to send email to specific recipient');
        // 继续发送给其他收件人，不中断流程
      })
    );

    await Promise.allSettled(emailPromises);
    logger.info({ taskId: task._id, resultId: result._id, emailCount: emailAddresses.length }, 'Test notification emails sent');
  } catch (error) {
    logger.error({ error, taskId: task._id, resultId: result._id }, 'Failed to send test notification email');
    throw error;
  }
}

/**
 * 发送 Webhook 通知
 * @param {Object} task - 测试任务
 * @param {Object} result - 测试结果
 * @param {string} webhookUrl - Webhook URL
 */
export async function sendWebhookNotification(task, result, webhookUrl) {
  try {
    const summary = result.summary || {};
    const passRate = summary.total > 0 
      ? ((summary.passed / summary.total) * 100).toFixed(2) 
      : '0.00';

    const payload = {
      event: 'test_completed',
      task: {
        id: task._id,
        name: task.name,
        project_id: task.project_id,
      },
      result: {
        id: result._id,
        status: result.status,
        summary: {
          total: summary.total || 0,
          passed: summary.passed || 0,
          failed: summary.failed || 0,
          error: summary.error || 0,
          passRate: parseFloat(passRate),
        },
        duration: result.duration,
        completed_at: result.completed_at,
      },
      timestamp: new Date().toISOString(),
    };

    const response = await axios.post(webhookUrl, payload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info({ taskId: task._id, resultId: result._id, webhookUrl, status: response.status }, 'Webhook notification sent');
  } catch (error) {
    logger.error({ error, taskId: task._id, resultId: result._id, webhookUrl }, 'Failed to send webhook notification');
    // 不抛出错误，避免影响测试流程
  }
}
