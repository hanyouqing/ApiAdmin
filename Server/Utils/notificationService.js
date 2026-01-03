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
/**
 * 验证邮件配置是否有效（通用验证函数，支持所有邮件提供商）
 * @param {Object} emailConfig - 邮件配置对象
 * @returns {Object} - { valid: boolean, reason?: string }
 */
function validateEmailConfig(emailConfig) {
  if (!emailConfig) {
    return { valid: false, reason: 'Email config is null or undefined' };
  }

  if (!emailConfig.provider) {
    return { valid: false, reason: 'Email provider is not specified' };
  }

  const provider = emailConfig.provider;
  
  // 通用验证：检查提供商特定的必需字段
  const providerConfig = emailConfig[provider];
  if (!providerConfig || typeof providerConfig !== 'object') {
    return { valid: false, reason: `Provider config for ${provider} is missing or invalid` };
  }

  // 根据不同的提供商验证必需字段（与 emailService.js 中的逻辑保持一致）
  switch (provider) {
    case 'smtp': {
      const hasHost = !!providerConfig.host;
      const hasAuth = !!(providerConfig.auth && providerConfig.auth.user && providerConfig.auth.pass);
      if (!hasHost || !hasAuth) {
        return { valid: false, reason: 'SMTP config missing host or auth credentials' };
      }
      return { valid: true };
    }
    
    case 'sendgrid':
    case 'resend': {
      if (!providerConfig.apiKey) {
        return { valid: false, reason: `${provider} config missing API key` };
      }
      return { valid: true };
    }
    
    case 'oci': {
      const hasRequired = !!(providerConfig.region && providerConfig.user && providerConfig.pass);
      if (!hasRequired) {
        return { valid: false, reason: 'OCI config missing region, user, or password' };
      }
      return { valid: true };
    }
    
    case 'ses': {
      const hasRequired = !!(providerConfig.accessKeyId && 
                            providerConfig.secretAccessKey && 
                            providerConfig.region);
      if (!hasRequired) {
        return { valid: false, reason: 'AWS SES config missing accessKeyId, secretAccessKey, or region' };
      }
      return { valid: true };
    }
    
    case 'aliyun': {
      const hasRequired = !!(providerConfig.accessKeyId && 
                            providerConfig.accessKeySecret && 
                            providerConfig.region);
      if (!hasRequired) {
        return { valid: false, reason: 'Aliyun config missing accessKeyId, accessKeySecret, or region' };
      }
      return { valid: true };
    }
    
    default:
      return { valid: false, reason: `Unknown email provider: ${provider}` };
  }
}

export async function sendTestNotificationEmail(task, result, emailAddresses) {
  try {
    // 获取邮件配置
    const emailConfig = await EmailConfig.getConfig();
    if (!emailConfig) {
      logger.warn('Email service not configured, skipping email notification');
      return;
    }

    // 使用通用验证函数检查邮件配置是否有效
    const validation = validateEmailConfig(emailConfig);
    if (!validation.valid) {
      logger.warn({ 
        provider: emailConfig.provider, 
        reason: validation.reason,
        taskId: task._id,
        resultId: result._id || result.id 
      }, 'Email service not properly configured, skipping email notification');
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

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;
    
    logger.info({ 
      taskId: task._id, 
      resultId: result._id || result.id, 
      total: emailAddresses.length,
      success: successCount,
      failed: failureCount
    }, 'Test notification emails sent');
    
    if (failureCount > 0) {
      logger.warn({ 
        taskId: task._id, 
        resultId: result._id || result.id,
        failureCount 
      }, 'Some email notifications failed to send');
    }
  } catch (error) {
    logger.error({ 
      error: error.message || error, 
      stack: error.stack,
      taskId: task._id, 
      resultId: result._id || result.id 
    }, 'Failed to send test notification email');
    // 不抛出错误，避免影响测试流程
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
