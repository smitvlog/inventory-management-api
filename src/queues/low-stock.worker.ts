import { Worker, Job } from 'bullmq';
import { queueConnection, QUEUE_NAMES } from '../config/queue';
import { LowStockJobData } from './low-stock.queue';
import { alertLogRepository } from '../repositories/alert-log.repository';
import { logger } from '../utils/logger';

let lowStockWorker: Worker<LowStockJobData> | null = null;

async function processLowStockJob(job: Job<LowStockJobData>): Promise<Record<string, unknown>> {
  try {
    const { productId, productName, currentStock, threshold } = job.data;

    logger.info(
      `[Worker: ${QUEUE_NAMES.LOW_STOCK_ALERTS}] Processing job #${job.id} for product: ${productName} (${productId})`
    );

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
  } catch (error) {
    logger.error(`[Worker: ${QUEUE_NAMES.LOW_STOCK_ALERTS}] Error processing low stock job #${job.id}`, {
      error: (error as Error).message
    });
    throw error;
  }
}

function handleWorkerCompleted(job: Job<LowStockJobData>): void {
  try {
    logger.info(`[Worker: ${QUEUE_NAMES.LOW_STOCK_ALERTS}] Job #${job.id} completed successfully`);
  } catch (error) {
    logger.error('Error handling worker completed event', { error: (error as Error).message });
  }
}

function handleWorkerFailed(job: Job<LowStockJobData> | undefined, err: Error): void {
  try {
    logger.error(`[Worker: ${QUEUE_NAMES.LOW_STOCK_ALERTS}] Job #${job?.id || 'unknown'} failed`, {
      error: err.message
    });
  } catch (error) {
    console.error('Error handling worker failure event', error);
  }
}

export function startLowStockWorker(): Worker<LowStockJobData> {
  try {
    if (lowStockWorker) {
      return lowStockWorker;
    }

    lowStockWorker = new Worker<LowStockJobData>(
      QUEUE_NAMES.LOW_STOCK_ALERTS,
      processLowStockJob,
      {
        connection: queueConnection,
        concurrency: 5
      }
    );

    lowStockWorker.on('completed', handleWorkerCompleted);
    lowStockWorker.on('failed', handleWorkerFailed);

    logger.info(`BullMQ worker initialized for queue "${QUEUE_NAMES.LOW_STOCK_ALERTS}"`);
    return lowStockWorker;
  } catch (error) {
    logger.error('Failed to start BullMQ low stock worker', { error: (error as Error).message });
    throw error;
  }
}

export async function stopLowStockWorker(): Promise<void> {
  try {
    if (lowStockWorker) {
      await lowStockWorker.close();
      lowStockWorker = null;
      logger.info(`BullMQ worker for queue "${QUEUE_NAMES.LOW_STOCK_ALERTS}" closed`);
    }
  } catch (error) {
    logger.error('Error stopping low stock worker', { error: (error as Error).message });
  }
}
