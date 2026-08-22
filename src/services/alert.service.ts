import { alertLogRepository, AlertLogWithProduct } from '../repositories/alert-log.repository';
import { enqueueLowStockAlert } from '../queues/low-stock.queue';
import { AlertLog } from '@prisma/client';
import { logger } from '../utils/logger';

export class AlertService {
  /**
   * Check if the product stock is below the threshold and trigger an async alert if so.
   * Does NOT block the caller.
   */
  async checkAndTriggerLowStockAlert(
    productId: string,
    productName: string,
    currentStock: number,
    threshold: number
  ): Promise<void> {
    // Condition: stock drops below threshold (strictly < threshold)
    if (currentStock < threshold) {
      logger.info(
        `Low-stock threshold reached for product "${productName}" (${productId}). Stock: ${currentStock}, Threshold: ${threshold}. Dispatching to queue.`
      );

      // Asynchronous dispatch - non-blocking
      void enqueueLowStockAlert({
        productId,
        productName,
        currentStock,
        threshold
      });
    }
  }

  /**
   * Get alert history for a specific product
   */
  async getAlertsForProduct(productId: string): Promise<AlertLog[]> {
    return alertLogRepository.findByProductId(productId);
  }

  /**
   * Get system-wide low stock alerts
   */
  async getAllAlerts(limit = 50): Promise<AlertLogWithProduct[]> {
    return alertLogRepository.findAll(limit);
  }
}

export const alertService = new AlertService();
