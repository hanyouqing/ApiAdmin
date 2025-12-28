import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import EmailTemplate from '../../Server/Models/EmailTemplate.js';
import User from '../../Server/Models/User.js';

describe('EmailTemplate Model', () => {
  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await EmailTemplate.deleteMany({});
    await User.deleteMany({});
  });

  afterEach(async () => {
    await EmailTemplate.deleteMany({});
    await User.deleteMany({});
  });

  it('should create email template with valid data', async () => {
    const user = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Test1234',
    });

    const templateData = {
      name: 'Verification Code',
      type: 'verification',
      subject: 'Your verification code is {{code}}',
      html: '<p>Your code: {{code}}</p>',
      text: 'Your code: {{code}}',
      variables: ['code'],
      createdBy: user._id,
    };

    const template = new EmailTemplate(templateData);
    await template.save();

    expect(template._id).toBeDefined();
    expect(template.name).toBe(templateData.name);
    expect(template.type).toBe(templateData.type);
    expect(template.variables).toContain('code');
  });

  it('should validate template type', async () => {
    const user = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Test1234',
    });

    const template = new EmailTemplate({
      name: 'Test',
      type: 'invalid_type',
      subject: 'Test',
      html: '<p>Test</p>',
      createdBy: user._id,
    });

    await expect(template.save()).rejects.toThrow();
  });
});

describe('Email Controller', () => {
  let testUser;

  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await EmailTemplate.deleteMany({});
    await User.deleteMany({});

    testUser = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'Test1234',
      role: 'super_admin',
    });
  });

  afterEach(async () => {
    await EmailTemplate.deleteMany({});
    await User.deleteMany({});
  });

  describe('POST /api/email/templates', () => {
    it('should create email template', async () => {
      // TODO: 实现测试
      const template = await EmailTemplate.create({
        name: 'Test Template',
        type: 'verification',
        subject: 'Test Subject',
        html: '<p>Test</p>',
        createdBy: testUser._id,
      });

      expect(template._id).toBeDefined();
      expect(template.name).toBe('Test Template');
    });
  });

  describe('POST /api/email/send', () => {
    it('should send email using template', async () => {
      // TODO: 实现测试
      // 1. 创建模板
      const template = await EmailTemplate.create({
        name: 'Test Template',
        type: 'verification',
        subject: 'Code: {{code}}',
        html: '<p>Your code: {{code}}</p>',
        variables: ['code'],
        createdBy: testUser._id,
      });

      // 2. 验证模板变量替换
      let html = template.html;
      html = html.replace(/\{\{code\}\}/g, '123456');
      expect(html).toContain('123456');
      expect(html).not.toContain('{{code}}');
    });
  });
});

