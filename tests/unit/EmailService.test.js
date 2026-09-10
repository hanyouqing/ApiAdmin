import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Email Service', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export email helper functions', async () => {
    const mod = await import('../../Server/Utils/emailService.js');
    expect(typeof mod.sendEmail).toBe('function');
    expect(typeof mod.sendPasswordResetEmail).toBe('function');
    expect(typeof mod.sendVerificationCodeEmail).toBe('function');
  });

  it('should reject sendEmail when SMTP is not configured', async () => {
    const mod = await import('../../Server/Utils/emailService.js');
    // Force re-init path by calling with empty smtp config object that clears transporter
    // When host/user/pass missing, initEmailService leaves transporter null
    await expect(
      mod.sendEmail('test@example.com', 'Subject', '<p>Hi</p>', 'Hi', {
        provider: 'smtp',
        smtp: { host: '', auth: { user: '', pass: '' } },
      })
    ).rejects.toThrow(/not configured/i);
  });

  it('should expose password reset helper', async () => {
    const { sendPasswordResetEmail } = await import('../../Server/Utils/emailService.js');
    await expect(
      sendPasswordResetEmail('a@b.com', 'tok', 'https://example.com/reset')
    ).rejects.toThrow();
  });

  it('should expose verification code helper', async () => {
    const { sendVerificationCodeEmail } = await import('../../Server/Utils/emailService.js');
    await expect(sendVerificationCodeEmail('a@b.com', '123456')).rejects.toThrow();
  });
});
