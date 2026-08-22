import { AlertLog } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

export interface AlertLogWithProduct extends AlertLog {
  product: {
    id: string;
    name: string;
    stock: number;
    lowStockThreshold: number;
  };
}

export class AlertLogRepository {
  /**
   * Find if an alert was triggered for this product within the given timeframe (default: 24 hours)
   */
  public async findRecentAlertForProduct(
    productId: string,
    windowHours = 24
  ): Promise<AlertLog | null> {
    try {
      const cutoffDate = new Date(Date.now() - windowHours * 60 * 60 * 1000);

      const recentAlert = await prisma.alertLog.findFirst({
        where: {
          productId,
          triggeredAt: {
            gte: cutoffDate
          }
        },
        orderBy: { triggeredAt: 'desc' }
      });
      return recentAlert;
    } catch (error) {
      logger.error('Error finding recent alert for product in repository', { productId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Record a new alert trigger
   */
  public async create(productId: string, triggeredAt: Date = new Date()): Promise<AlertLog> {
    try {
      const log = await prisma.alertLog.create({
        data: {
          productId,
          triggeredAt
        }
      });
      return log;
    } catch (error) {
      logger.error('Error creating alert log in repository', { productId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Retrieve all alerts for a specific product
   */
  public async findByProductId(productId: string): Promise<AlertLog[]> {
    try {
      const alerts = await prisma.alertLog.findMany({
        where: { productId },
        orderBy: { triggeredAt: 'desc' }
      });
      return alerts;
    } catch (error) {
      logger.error('Error finding alerts by product id in repository', { productId, error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Retrieve all low-stock alerts system-wide
   */
  public async findAll(limit = 50): Promise<AlertLogWithProduct[]> {
    try {
      const alerts = await prisma.alertLog.findMany({
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              stock: true,
              lowStockThreshold: true
            }
          }
        },
        orderBy: { triggeredAt: 'desc' }
      });
      return alerts;
    } catch (error) {
      logger.error('Error finding all alert logs in repository', { error: (error as Error).message });
      throw error;
    }
  }
}

export const alertLogRepository = new AlertLogRepository();
