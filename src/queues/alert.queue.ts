import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis';
import { QUEUE_NAMES } from '../constants';

export interface LowStockAlertPayload {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
}

export const lowStockQueue = new Queue<LowStockAlertPayload>(QUEUE_NAMES.LOW_STOCK_ALERTS, {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

/**
 * Enqueue a low stock alert job.
 * Non-blocking: Returns immediately after enqueuing without waiting for worker completion.
 */
export const enqueueLowStockAlert = async (payload: LowStockAlertPayload): Promise<void> => {
  try {
    await lowStockQueue.add('low-stock-alert', payload);
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[BullMQ] Enqueued low-stock alert for product: ${payload.productName} (${payload.productId})`);
    }
  } catch (error) {
    console.error('[BullMQ] Failed to enqueue low stock alert job:', error);
  }
};

/**
 * Close queue connection gracefully
 */
export const closeAlertQueue = async (): Promise<void> => {
  try {
    await lowStockQueue.close();
  } catch (error) {
    console.error('[BullMQ] Error closing alert queue:', error);
  }
};
