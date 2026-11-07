#!/usr/bin/env node

/**
 * MongoDB 权限授予脚本
 *
 * 此脚本用于为 MongoDB 用户授予访问 apiadmin 数据库的权限
 *
 * 使用方法：
 * 1. 确保 MongoDB 正在运行
 * 2. 运行此脚本：node Server/Scripts/grant-mongodb-permissions.js
 *
 * 或者手动执行：
 * mongosh --host localhost -u "admin" -p "change-me-in-production" --authenticationDatabase "admin"
 * use apiadmin
 * db.grantRolesToUser("admin", [{ role: "readWrite", db: "apiadmin" }])
 */

// 使用 mongoose 而不是 mongodb，因为项目已经依赖 mongoose
import mongoose from 'mongoose';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function grantPermissions() {
  console.log('🔐 MongoDB 权限授予工具\n');

  const host = (await question('MongoDB 主机 (默认: localhost): ')) || 'localhost';
  const port = (await question('MongoDB 端口 (默认: 27017): ')) || '27017';
  const adminUsername = (await question('管理员用户名 (默认: admin): ')) || 'admin';
  const adminPassword = await question('管理员密码: ');
  const targetDatabase = (await question('目标数据库 (默认: apiadmin): ')) || 'apiadmin';
  const targetUsername = (await question('要授权的用户名 (默认: admin): ')) || 'admin';

  if (!adminPassword) {
    console.error('❌ 管理员密码不能为空');
    process.exit(1);
  }

  const adminUrl = `mongodb://${adminUsername}:${encodeURIComponent(adminPassword)}@${host}:${port}/admin?authSource=admin`;

  console.log('\n📋 配置信息:');
  console.log(`   主机: ${host}:${port}`);
  console.log(`   管理员用户: ${adminUsername}`);
  console.log(`   目标数据库: ${targetDatabase}`);
  console.log(`   要授权的用户: ${targetUsername}`);
  console.log('');

  const confirm = await question('确认执行？(y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('已取消');
    process.exit(0);
  }

  try {
    console.log('\n🔌 正在连接 MongoDB...');
    await mongoose.connect(adminUrl, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ 连接成功\n');

    const adminDb = mongoose.connection.db.admin();

    // 检查用户是否存在
    console.log(`🔍 检查用户 "${targetUsername}" 是否存在...`);
    const users = await adminDb.command({ usersInfo: 1 });
    const userExists = users.users.some(u => u.user === targetUsername);

    if (!userExists) {
      console.log(`❌ 用户 "${targetUsername}" 不存在`);
      console.log(`\n💡 建议：`);
      console.log(`   1. 在 admin 数据库中创建用户，然后授予跨数据库权限`);
      console.log(`   2. 或者在 ${targetDatabase} 数据库中创建专用用户`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`✅ 用户 "${targetUsername}" 存在\n`);

    // 切换到目标数据库并授予权限
    console.log(
      `🔑 正在为用户 "${targetUsername}" 授予 ${targetDatabase} 数据库的 readWrite 权限...`
    );
    const targetDb = mongoose.connection.useDb(targetDatabase);
    await targetDb.db.command({
      grantRolesToUser: targetUsername,
      roles: [{ role: 'readWrite', db: targetDatabase }],
    });

    console.log('✅ 权限授予成功！\n');

    // 验证权限 - 重新连接到目标数据库
    console.log('🔍 验证权限...');
    await mongoose.disconnect();

    const testUrl = `mongodb://${targetUsername}:${encodeURIComponent(adminPassword)}@${host}:${port}/${targetDatabase}?authSource=admin`;
    await mongoose.connect(testUrl, {
      serverSelectionTimeoutMS: 5000,
    });

    try {
      // 注意：某些 MongoDB 驱动版本可能不支持 limit()，需要先转换为数组
      try {
        await mongoose.connection.db.listCollections().limit(1).toArray();
      } catch (limitError) {
        // 如果 limit() 不支持，尝试不使用 limit
        await mongoose.connection.db.listCollections().toArray();
      }
      console.log('✅ 权限验证成功！用户现在可以访问数据库了。\n');
    } catch (verifyError) {
      console.log('⚠️  权限验证失败，但权限可能已授予。请手动测试。\n');
      console.log('错误:', verifyError.message);
    }

    console.log('📝 后续步骤:');
    console.log(`   1. 确保 MONGODB_URL 配置正确:`);
    console.log(
      `      mongodb://${targetUsername}:<password>@${host}:${port}/${targetDatabase}?authSource=admin`
    );
    console.log(`   2. 重启应用`);
    console.log(`   3. 测试数据库操作\n`);
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    if (error.code === 18 || error.codeName === 'AuthenticationFailed') {
      console.error('\n💡 提示: 请检查管理员用户名和密码是否正确');
    } else if (error.code === 13 || error.codeName === 'Unauthorized') {
      console.error('\n💡 提示: 管理员用户可能没有足够的权限执行此操作');
    }
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    rl.close();
  }
}

grantPermissions().catch(error => {
  console.error('未处理的错误:', error);
  process.exit(1);
});
