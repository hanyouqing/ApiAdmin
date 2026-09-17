import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mongoose from 'mongoose';
import CLIToken from '../../Server/Models/CLIToken.js';
import User from '../../Server/Models/User.js';
import { hashToken } from '../../Server/Utils/security.js';

describe('CLIToken hashing', () => {
  beforeEach(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/apiadmin_test');
    }
    await CLIToken.deleteMany({});
    await User.deleteMany({});
  });

  afterEach(async () => {
    await CLIToken.deleteMany({});
    await User.deleteMany({});
  });

  it('stores hash not plaintext', async () => {
    const user = await User.create({
      username: 'ci',
      email: 'ci@example.com',
      password: 'Test1234',
    });
    const raw = CLIToken.generateToken();
    const doc = await CLIToken.create({
      tokenHash: CLIToken.hashToken(raw),
      tokenPrefix: raw.slice(0, 8),
      name: 'ci',
      createdBy: user._id,
    });

    expect(doc.tokenHash).toBe(hashToken(raw));
    expect(doc.token).toBeUndefined();
    const found = await CLIToken.findOne({ tokenHash: hashToken(raw) });
    expect(found).toBeTruthy();
    expect(found.tokenPrefix).toBe(raw.slice(0, 8));
  });
});
