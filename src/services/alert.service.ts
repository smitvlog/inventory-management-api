import { alertLogRepository, AlertLogWithProduct } from '../repositories/alert-log.repository';
import { enqueueLowStockAlert } from '../queues/low-stock.queue';
import { AlertLog } from '@prisma/client';
import { logger } from '../utils/logger';

export class AlertService {
  /**
   * Check if the product stock is below the threshold and trigger an async alert if so.
   * Does NOT block the caller.
   */
  public async checkAndTriggerLowStockAlert(
    productId: string,
    productName: string,
    currentStock: number,
    threshold: number
  ): Promise<void> {
    try {
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
    } catch (error) {
      logger.error('Error checking and triggering low stock alert', {
        productId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get alert history for a specific product
   */
  public async getAlertsForProduct(productId: string): Promise<AlertLog[]> {
    try {
      const logs = await alertLogRepository.findByProductId(productId);
      return logs;
    } catch (error) {
      logger.error('Error getting alerts for product in AlertService', {
        productId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get system-wide low stock alerts
   */
  public async getAllAlerts(limit = 50): Promise<AlertLogWithProduct[]> {
    try {
      const alerts = await alertLogRepository.findAll(limit);
      return alerts;
    } catch (error) {
      logger.error('Error getting all alerts in AlertService', {
        error: (error as Error).message
      });
      throw error;
    }
  }
}

export const alertService = new AlertService();
