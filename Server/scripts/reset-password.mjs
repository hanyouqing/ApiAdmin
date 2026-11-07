#!/usr/bin/env node
/**
 * Reset (or set) a local user's password. Hashes via the User model pre-save hook.
 *
 * Usage:
 *   make reset-password
 *   make reset-password EMAIL=user@example.com PASSWORD='NewPass123!'
 *   cd Server && npx tsx scripts/reset-password.mjs --email user@example.com --password 'NewPass123!'
 *
 * Env / Make vars:
 *   MONGODB_URL / TEST_MONGODB_URL  — default mongodb://127.0.0.1:27017/apiadmin
 *   EMAIL / DEMO_EMAIL              — default demo@apiadmin.local
 *   PASSWORD / DEMO_PASSWORD        — default Demo1234!
 *   CREATE=1                        — create the user as super_admin if missing
 */

import mongoose from 'mongoose';
import User from '../Models/User.js';

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

const mongoUrl =
  process.env.MONGODB_URL ||
  process.env.TEST_MONGODB_URL ||
  'mongodb://127.0.0.1:27017/apiadmin';

const email = (
  argValue('--email') ||
  process.env.EMAIL ||
  process.env.DEMO_EMAIL ||
  'demo@apiadmin.local'
).toLowerCase();

const password =
  argValue('--password') ||
  process.env.PASSWORD ||
  process.env.DEMO_PASSWORD ||
  'Demo1234!';

const createIfMissing =
  process.argv.includes('--create') ||
  process.env.CREATE === '1' ||
  process.env.CREATE === 'true';

const username =
  argValue('--username') ||
  process.env.USERNAME ||
  email.split('@')[0] ||
  'demo';

async function main() {
  if (!password || String(password).length < 6) {
    console.error('❌ PASSWORD must be at least 6 characters (local login cannot use an empty password)');
    process.exit(1);
  }

  console.log(`Connecting ${mongoUrl.replace(/\/\/.*@/, '//***@')} …`);
  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 10000 });

  let user = await User.findOne({ email });
  if (!user) {
    if (!createIfMissing) {
      console.error(`❌ User not found: ${email}`);
      console.error('   Pass CREATE=1 (or --create) to create a super_admin with this password.');
      process.exit(1);
    }
    user = await User.create({
      username,
      email,
      password,
      role: 'super_admin',
    });
    console.log(`✅ Created user ${email} (super_admin)`);
  } else {
    user.password = password;
    await user.save();
    console.log(`✅ Reset password for ${email} (${user.username}, ${user.role})`);
  }

  console.log(`   Login: ${email} / ${password}`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
