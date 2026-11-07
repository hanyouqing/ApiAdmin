#!/usr/bin/env node
// 使用 Node.js 20+ 运行此脚本

/**
 * 创建超级管理员脚本
 *
 * 使用方法：
 * 1. 将现有用户设置为超级管理员：
 *    node Server/scripts/create-super-admin.js --email user@example.com
 *
 * 2. 创建新的超级管理员账号：
 *    node Server/scripts/create-super-admin.js --email admin@example.com --username admin --password YourPassword123
 *
 * 3. 如果数据库中没有用户，将第一个用户设置为超级管理员：
 *    node Server/scripts/create-super-admin.js --auto
 */

import mongoose from 'mongoose';
import User from '../Models/User.js';
import config from '../Utils/config.js';
import { logger } from '../Utils/logger.js';

const MONGODB_URL = process.env.MONGODB_URL || config.MONGODB_URL;

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URL);
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to connect to MongoDB');
    process.exit(1);
  }
}

async function createSuperAdmin(email, username, password) {
  try {
    // 检查是否已存在超级管理员
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      console.log('⚠️  系统中已存在超级管理员：');
      console.log(`   邮箱: ${existingSuperAdmin.email}`);
      console.log(`   用户名: ${existingSuperAdmin.username}`);
      console.log(`   创建时间: ${existingSuperAdmin.createdAt}`);
      return;
    }

    // 检查邮箱是否已存在
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log(`⚠️  邮箱 ${email} 已存在，将更新为超级管理员`);
      existingUser.role = 'super_admin';
      await existingUser.save();
      console.log('✅ 用户已更新为超级管理员');
      console.log(`   邮箱: ${existingUser.email}`);
      console.log(`   用户名: ${existingUser.username}`);
      return;
    }

    // 检查用户名是否已存在
    if (username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        console.log(`⚠️  用户名 ${username} 已存在，将更新为超级管理员`);
        existingUsername.role = 'super_admin';
        await existingUsername.save();
        console.log('✅ 用户已更新为超级管理员');
        console.log(`   邮箱: ${existingUsername.email}`);
        console.log(`   用户名: ${existingUsername.username}`);
        return;
      }
    }

    // 创建新的超级管理员
    if (!password) {
      console.error('❌ 创建新用户需要提供密码');
      process.exit(1);
    }

    const user = new User({
      email: email.toLowerCase(),
      username: username || email.split('@')[0],
      password,
      role: 'super_admin',
    });

    await user.save();
    console.log('✅ 超级管理员创建成功！');
    console.log(`   邮箱: ${user.email}`);
    console.log(`   用户名: ${user.username}`);
    console.log(`   角色: ${user.role}`);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to create super admin');
    console.error('❌ 创建超级管理员失败:', error.message);
    process.exit(1);
  }
}

async function setFirstUserAsSuperAdmin() {
  try {
    // 检查是否已存在超级管理员
    const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
    if (existingSuperAdmin) {
      console.log('⚠️  系统中已存在超级管理员：');
      console.log(`   邮箱: ${existingSuperAdmin.email}`);
      console.log(`   用户名: ${existingSuperAdmin.username}`);
      return;
    }

    // 获取第一个用户
    const firstUser = await User.findOne().sort({ createdAt: 1 });
    if (!firstUser) {
      console.log('⚠️  数据库中没有用户，请先注册一个用户，然后运行：');
      console.log(
        `   node Server/scripts/create-super-admin.js --email ${firstUser?.email || 'your-email@example.com'}`
      );
      return;
    }

    firstUser.role = 'super_admin';
    await firstUser.save();
    console.log('✅ 已将第一个用户设置为超级管理员：');
    console.log(`   邮箱: ${firstUser.email}`);
    console.log(`   用户名: ${firstUser.username}`);
    console.log(`   创建时间: ${firstUser.createdAt}`);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to set first user as super admin');
    console.error('❌ 设置超级管理员失败:', error.message);
    process.exit(1);
  }
}

async function listUsers() {
  try {
    const users = await User.find().select('email username role createdAt').sort({ createdAt: 1 });
    if (users.length === 0) {
      console.log('📋 数据库中没有用户');
      return;
    }

    console.log('\n📋 当前所有用户：');
    console.log('─'.repeat(80));
    users.forEach((user, index) => {
      const isSuperAdmin = user.role === 'super_admin';
      const marker = isSuperAdmin ? '👑' : '  ';
      console.log(`${marker} ${index + 1}. ${user.email} (${user.username}) - ${user.role}`);
    });
    console.log('─'.repeat(80));
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to list users');
    console.error('❌ 获取用户列表失败:', error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
创建超级管理员脚本

使用方法：
  1. 将现有用户设置为超级管理员：
     node Server/scripts/create-super-admin.js --email user@example.com

  2. 创建新的超级管理员账号：
     node Server/scripts/create-super-admin.js --email admin@example.com --username admin --password YourPassword123

  3. 自动将第一个用户设置为超级管理员：
     node Server/scripts/create-super-admin.js --auto

  4. 列出所有用户：
     node Server/scripts/create-super-admin.js --list

选项：
  --email <email>     用户邮箱
  --username <name>  用户名（创建新用户时必需）
  --password <pwd>   密码（创建新用户时必需）
  --auto             自动将第一个用户设置为超级管理员
  --list             列出所有用户
  --help, -h          显示帮助信息
    `);
    process.exit(0);
  }

  await connectDB();

  if (args.includes('--list')) {
    await listUsers();
    await mongoose.disconnect();
    process.exit(0);
  }

  if (args.includes('--auto')) {
    await setFirstUserAsSuperAdmin();
    await mongoose.disconnect();
    process.exit(0);
  }

  const emailIndex = args.indexOf('--email');
  if (emailIndex === -1) {
    console.error('❌ 请提供邮箱地址：--email user@example.com');
    console.log('   或使用 --auto 自动将第一个用户设置为超级管理员');
    console.log('   或使用 --list 查看所有用户');
    process.exit(1);
  }

  const email = args[emailIndex + 1];
  if (!email) {
    console.error('❌ 请提供有效的邮箱地址');
    process.exit(1);
  }

  const usernameIndex = args.indexOf('--username');
  const username = usernameIndex !== -1 ? args[usernameIndex + 1] : null;

  const passwordIndex = args.indexOf('--password');
  const password = passwordIndex !== -1 ? args[passwordIndex + 1] : null;

  await createSuperAdmin(email, username, password);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(error => {
  logger.error({ error }, 'Script error');
  console.error('❌ 脚本执行失败:', error.message);
  process.exit(1);
});
