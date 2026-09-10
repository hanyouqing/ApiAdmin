import Redis from 'ioredis';
import { logger } from './logger.js';

const memoryStore = new Map();
let redisClient = null;
let redisInitAttempted = false;

function getRedis() {
  if (redisInitAttempted) {
    return redisClient;
  }
  redisInitAttempted = true;

  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }

  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: false,
    });
    redisClient.on('error', (err) => {
      logger.warn({ err: err.message }, 'Redis kvStore error');
    });
    return redisClient;
  } catch (err) {
    logger.warn({ err: err.message }, 'Failed to initialize Redis kvStore');
    redisClient = null;
    return null;
  }
}

export async function kvSet(key, value, ttlSeconds = 300) {
  const redis = getRedis();
  const payload = typeof value === 'string' ? value : JSON.stringify(value);

  if (redis) {
    try {
      await redis.set(key, payload, 'EX', ttlSeconds);
      return;
    } catch (err) {
      logger.warn({ err: err.message, key }, 'Redis kvSet failed, falling back to memory');
    }
  }

  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MEMORY_KV !== 'true') {
    throw new Error('Distributed KV store unavailable; configure REDIS_URL for multi-instance production');
  }

  if (memoryStore.has(key)) {
    clearTimeout(memoryStore.get(key).timer);
  }
  const timer = setTimeout(() => memoryStore.delete(key), ttlSeconds * 1000);
  if (typeof timer.unref === 'function') timer.unref();
  memoryStore.set(key, { value: payload, timer });
}

export async function kvGet(key) {
  const redis = getRedis();
  if (redis) {
    try {
      return await redis.get(key);
    } catch (err) {
      logger.warn({ err: err.message, key }, 'Redis kvGet failed, falling back to memory');
    }
  }

  const entry = memoryStore.get(key);
  return entry ? entry.value : null;
}

export async function kvDel(key) {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(key);
    } catch (err) {
      logger.warn({ err: err.message, key }, 'Redis kvDel failed');
    }
  }

  const entry = memoryStore.get(key);
  if (entry?.timer) clearTimeout(entry.timer);
  memoryStore.delete(key);
}

export function isRedisKvEnabled() {
  return !!getRedis();
}
