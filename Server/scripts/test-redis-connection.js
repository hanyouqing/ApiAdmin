#!/usr/bin/env node

/**
 * Redis 连接测试脚本
 *
 * 用于测试 Redis 连接和认证是否正常工作
 */

import Redis from 'ioredis';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function testRedis() {
  console.log('🔍 Redis 连接测试工具\n');

  const host = (await question('Redis 主机 (默认: localhost): ')) || 'localhost';
  const port = (await question('Redis 端口 (默认: 6379): ')) || '6379';
  const password =
    (await question('Redis 密码 (默认: change-me-in-production): ')) || 'change-me-in-production';

  const testUrl = password
    ? `redis://:${encodeURIComponent(password)}@${host}:${port}`
    : `redis://${host}:${port}`;

  console.log('\n📋 测试配置:');
  console.log(`   主机: ${host}:${port}`);
  console.log(`   密码: ${password ? '***' : '无'}`);
  console.log(`   URL: ${testUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  console.log('');

  let redis;
  try {
    console.log('🔌 正在连接 Redis...');
    redis = new Redis(testUrl, {
      connectTimeout: 5000,
      commandTimeout: 5000,
      retryStrategy: () => null,
      lazyConnect: true,
      enableReadyCheck: true,
    });

    // 监听事件
    redis.on('ready', () => {
      console.log('✅ Redis ready 事件触发');
    });

    redis.on('error', err => {
      console.error('❌ Redis error 事件:', err.message);
    });

    redis.on('connect', () => {
      console.log('✅ Redis connect 事件触发');
    });

    // 等待连接
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('连接超时'));
      }, 5000);

      redis.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      redis.once('error', err => {
        clearTimeout(timeout);
        reject(err);
      });

      redis.connect().catch(err => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    console.log('✅ 连接成功\n');

    // 测试 PING
    console.log('🏓 测试 PING...');
    const pong = await redis.ping();
    console.log(`✅ PING 响应: ${pong}\n`);

    // 测试 SET/GET
    console.log('💾 测试 SET/GET...');
    await redis.set('test_key', 'test_value');
    const value = await redis.get('test_key');
    console.log(`✅ SET/GET 成功: ${value}\n`);

    // 清理
    await redis.del('test_key');

    console.log('✅ 所有测试通过！Redis 连接正常。\n');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('\n错误详情:');
    console.error({
      name: error.name,
      message: error.message,
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      address: error.address,
      port: error.port,
    });

    if (error.message?.includes('NOAUTH') || error.message?.includes('password')) {
      console.error('\n💡 提示: 认证失败，请检查密码是否正确');
    } else if (error.message?.includes('ECONNREFUSED')) {
      console.error('\n💡 提示: 连接被拒绝，请检查 Redis 服务是否运行');
    } else if (error.message?.includes('timeout')) {
      console.error('\n💡 提示: 连接超时，请检查网络连接');
    }

    process.exit(1);
  } finally {
    if (redis) {
      await redis.disconnect();
    }
    rl.close();
  }
}

testRedis().catch(error => {
  console.error('未处理的错误:', error);
  process.exit(1);
});
