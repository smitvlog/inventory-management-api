import Redis, { RedisOptions } from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

const redisOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times: number) {
    if (env.NODE_ENV === 'test') return null; // Do not retry in unit test mode
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  reconnectOnError(_err: Error) {
    return true;
  }
};

export const redis = new Redis(redisOptions);

redis.on('connect', () => {
  logger.info('Connected to Redis server');
});

redis.on('error', (err: Error) => {
  if (env.NODE_ENV !== 'test') {
    logger.error('Redis error encountered', { error: err.message });
  }
});

export const connectRedis = async (): Promise<void> => {
  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
  } catch (error) {
    logger.warn('Could not connect to Redis at startup', { error: (error as Error).message });
  }
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redis.status !== 'end') {
      await redis.quit();
      logger.info('Redis connection closed successfully');
    }
  } catch (error) {
    logger.warn('Force disconnecting Redis');
    redis.disconnect();
  }
};
