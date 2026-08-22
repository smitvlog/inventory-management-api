import Redis, { RedisOptions } from 'ioredis';
import { env } from './env';

export const redisConfig: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

export const redis = new Redis(redisConfig);

redis.on('connect', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('✅ Connected to Redis successfully');
  }
});

redis.on('error', (err) => {
  if (process.env.NODE_ENV !== 'test') {
    console.error('❌ Redis Connection Error:', err.message);
  }
});
