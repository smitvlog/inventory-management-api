import { Worker, Job } from 'bullmq';
import { queueConnection, QUEUE_NAMES } from '../config/queue';
import { LowStockJobData } from './low-stock.queue';
import { alertLogRepository } from '../repositories/alert-log.repository';
import { logger } from '../utils/logger';

let lowStockWorker: Worker<LowStockJobData> | null = null;

export const startLowStockWorker = (): Worker<LowStockJobData> => {
  if (lowStockWorker) {
    return lowStockWorker;
  }

  lowStockWorker = new Worker<LowStockJobData>(
    QUEUE_NAMES.LOW_STOCK_ALERTS,
    async (job: Job<LowStockJobData>) => {
      const { productId, productName, currentStock, threshold } = job.data;

      logger.info(`[Worker: ${QUEUE_NAMES.LOW_STOCK_ALERTS}] Processing job #${job.id} for product: ${productName} (${productId})`);

      // 24-Hour Deduplication Check
      const recentAlert = await alertLogRepository.findRecentAlertForProduct(productId, 24);

      if (recentAlert) {
        logger.info(
          `[Worker: ${QUEUE_NAMES.LOW_STOCK_ALERTS}] Duplicate alert skipped for product "${productName}" (ID: ${productId}). Alert was already recorded at ${recentAlert.triggeredAt.toISOString()} (within 24h window).`
        );
        return {
          status: 'skipped',
          reason: 'deduplicated_24h',
          lastTriggeredAt: recentAlert.triggeredAt
        };
      }

      // Process new low-stock alert
      const triggeredAt = new Date();
      await alertLogRepository.create(productId, triggeredAt);

      logger.warn(
        `🚨 [LOW-STOCK ALERT TRIGGERED] Product: "${productName}" | ID: ${productId} | Current Stock: ${currentStock} | Threshold: ${threshold} | Time: ${triggeredAt.toISOString()}`
      );

      return {
        status: 'processed',
        productId,
        productName,
        currentStock,
        threshold,
        triggeredAt
      };
    },
    {
      connection: queueConnection,
      concurrency: 5
    }
  );

  lowStockWorker.on('completed', (job: Job<LowStockJobData>) => {
    logger.info(`[Worker: ${QUEUE_NAMES.LOW_STOCK_ALERTS}] Job #${job.id} completed successfully`);
  });

  lowStockWorker.on('failed', (job: Job<LowStockJobData> | undefined, err: Error) => {
    logger.error(`[Worker: ${QUEUE_NAMES.LOW_STOCK_ALERTS}] Job #${job?.id || 'unknown'} failed`, {
      error: err.message
    });
  });

  logger.info(`BullMQ worker initialized for queue "${QUEUE_NAMES.LOW_STOCK_ALERTS}"`);
  return lowStockWorker;
};

export const stopLowStockWorker = async (): Promise<void> => {
  if (lowStockWorker) {
    await lowStockWorker.close();
    lowStockWorker = null;
    logger.info(`BullMQ worker for queue "${QUEUE_NAMES.LOW_STOCK_ALERTS}" closed`);
  }
};
