import { ConnectionOptions } from 'bullmq';
import { env } from './env';

export const queueConnection: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};

export const QUEUE_NAMES = {
  LOW_STOCK_ALERTS: 'low-stock-alerts'
} as const;
