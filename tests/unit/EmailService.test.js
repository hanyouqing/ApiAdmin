import { describe, it, expect, vi, beforeEach } from 'vitest';
import nodemailer from 'nodemailer';

// Mock nodemailer
vi.mock('nodemailer', () => {
  const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-message-id' });
  const mockCreateTransport = vi.fn().mockReturnValue({
    sendMail: mockSendMail,
  });
  return {
    default: {
      createTransport: mockCreateTransport,
    },
  };
});

// Mock config
vi.mock('../../Server/Utils/config.js', () => ({
  default: {
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: 587,
    SMTP_SECURE: 'false',
    SMTP_USER: 'test@example.com',
    SMTP_PASS: 'password',
    SMTP_FROM: 'noreply@example.com',
  },
}));

// Mock logger
vi.mock('../../Server/Utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize email service with valid config', async () => {
    const { sendEmail } = await import('../../Server/Utils/emailService.js');
    
    expect(nodemailer.createTransport).toHaveBeenCalled();
  });

  it('should send email successfully', async () => {
    const { sendEmail } = await import('../../Server/Utils/emailService.js');
    
    const result = await sendEmail('test@example.com', 'Test Subject', '<p>Test HTML</p>', 'Test Text');
    
    expect(result.messageId).toBe('test-message-id');
    expect(nodemailer.createTransport().sendMail).toHaveBeenCalledWith({
      from: 'noreply@example.com',
      to: 'test@example.com',
      subject: 'Test Subject',
      html: '<p>Test HTML</p>',
      text: 'Test Text',
    });
  });

  it('should send password reset email', async () => {
    const { sendPasswordResetEmail } = await import('../../Server/Utils/emailService.js');
    
    const result = await sendPasswordResetEmail(
      'test@example.com',
      'reset-token',
      'https://example.com/reset'
    );
    
    expect(result.messageId).toBe('test-message-id');
    expect(nodemailer.createTransport().sendMail).toHaveBeenCalled();
  });

  it('should send verification code email', async () => {
    const { sendVerificationCodeEmail } = await import('../../Server/Utils/emailService.js');
    
    const result = await sendVerificationCodeEmail('test@example.com', '123456');
    
    expect(result.messageId).toBe('test-message-id');
    expect(nodemailer.createTransport().sendMail).toHaveBeenCalled();
  });
});

