import { Queue } from 'bullmq';
import { queueConnection, QUEUE_NAMES } from '../config/queue';
import { logger } from '../utils/logger';

export interface LowStockJobData {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
}

export const lowStockQueue = new Queue<LowStockJobData>(QUEUE_NAMES.LOW_STOCK_ALERTS, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
});

/**
 * Enqueue a low-stock alert job to BullMQ.
 * Returns immediately without waiting for worker completion.
 */
export const enqueueLowStockAlert = async (data: LowStockJobData): Promise<void> => {
  try {
    const job = await lowStockQueue.add('process-low-stock', data);
    logger.info(`[Queue: ${QUEUE_NAMES.LOW_STOCK_ALERTS}] Enqueued low-stock alert job #${job.id}`, {
      productId: data.productId,
      productName: data.productName,
      currentStock: data.currentStock,
      threshold: data.threshold
    });
  } catch (error) {
    logger.error('Failed to enqueue low-stock alert job', {
      error: (error as Error).message,
      data
    });
  }
};
