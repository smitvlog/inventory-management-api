import { Worker, Job } from 'bullmq';
import { redisConfig } from '../config/redis';
import { prisma } from '../config/prisma';
import { QUEUE_NAMES, ALERT_DEDUPLICATION_WINDOW_MS } from '../constants';
import { LowStockAlertPayload } from './alert.queue';

/**
 * Worker processor for low-stock alerts.
 * Implements 24-hour deduplication by checking the AlertLog table.
 */
export const processLowStockAlertJob = async (job: Job<LowStockAlertPayload>) => {
  const { productId, productName, currentStock, threshold } = job.data;

  // 1. Calculate the 24-hour cutoff window
  const twentyFourHoursAgo = new Date(Date.now() - ALERT_DEDUPLICATION_WINDOW_MS);

  // 2. Query AlertLog for recent alerts triggered for this product
  const recentAlert = await prisma.alertLog.findFirst({
    where: {
      productId,
      triggeredAt: {
        gte: twentyFourHoursAgo,
      },
    },
    orderBy: {
      triggeredAt: 'desc',
    },
  });

  // 3. Deduplication Check
  if (recentAlert) {
    console.log(
      `[BullMQ Worker - DEDUPLICATION] ⏭️ Skipping alert for "${productName}" (${productId}). ` +
        `Alert already triggered at ${recentAlert.triggeredAt.toISOString()} (within 24 hours).`
    );
    return {
      status: 'deduplicated',
      productId,
      lastTriggeredAt: recentAlert.triggeredAt,
    };
  }

  // 4. Record new AlertLog entry in Database
  const alertLog = await prisma.alertLog.create({
    data: {
      productId,
      triggeredAt: new Date(),
    },
  });

  // 5. Log the Alert message
  console.log(
    `[BullMQ Worker - LOW STOCK ALERT] 🚨 Product "${productName}" (ID: ${productId}) has dropped to stock ${currentStock} (Low Stock Threshold: ${threshold})!`
  );

  return {
    status: 'alert_logged',
    alertLogId: alertLog.id,
    productId,
    stock: currentStock,
    threshold,
  };
};

export const startAlertWorker = (): Worker<LowStockAlertPayload> => {
  const worker = new Worker<LowStockAlertPayload>(
    QUEUE_NAMES.LOW_STOCK_ALERTS,
    processLowStockAlertJob,
    {
      connection: redisConfig,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[BullMQ Worker] Job ${job.id} completed successfully`);
    }
  });

  worker.on('failed', (job, err) => {
    console.error(`[BullMQ Worker] Job ${job?.id} failed with error:`, err.message);
  });

  return worker;
};
