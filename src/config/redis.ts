import Redis, { RedisOptions } from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

function redisRetryStrategy(times: number): number | null {
  try {
    if (env.NODE_ENV === 'test') return null;
    const delay = Math.min(times * 200, 2000);
    return delay;
  } catch (error) {
    logger.error('Error in redis retry strategy', { error: (error as Error).message });
    return null;
  }
}

function redisReconnectOnError(_err: Error): boolean {
  try {
    return true;
  } catch (error) {
    logger.error('Error in redis reconnectOnError handler', { error: (error as Error).message });
    return false;
  }
}

const redisOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy: redisRetryStrategy,
  reconnectOnError: redisReconnectOnError
};

export const redis = new Redis(redisOptions);

function handleRedisConnect(): void {
  try {
    logger.info('Connected to Redis server');
  } catch (error) {
    console.error('Error in Redis connect event listener', error);
  }
}

function handleRedisError(err: Error): void {
  try {
    if (env.NODE_ENV !== 'test') {
      logger.error('Redis error encountered', { error: err.message });
    }
  } catch (error) {
    console.error('Error in Redis error event listener', error);
  }
}

redis.on('connect', handleRedisConnect);
redis.on('error', handleRedisError);

export async function connectRedis(): Promise<void> {
  try {
    if (redis.status === 'wait') {
      await redis.connect();
    }
  } catch (error) {
    logger.warn('Could not connect to Redis at startup', { error: (error as Error).message });
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    if (redis.status !== 'end') {
      await redis.quit();
      logger.info('Redis connection closed successfully');
    }
  } catch (error) {
    logger.warn('Force disconnecting Redis', { error: (error as Error).message });
    redis.disconnect();
  }
}
