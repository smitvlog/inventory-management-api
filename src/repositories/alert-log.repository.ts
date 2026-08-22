import { AlertLog } from '@prisma/client';
import { prisma } from '../config/prisma';

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
  async findRecentAlertForProduct(
    productId: string,
    windowHours = 24
  ): Promise<AlertLog | null> {
    const cutoffDate = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    return prisma.alertLog.findFirst({
      where: {
        productId,
        triggeredAt: {
          gte: cutoffDate
        }
      },
      orderBy: { triggeredAt: 'desc' }
    });
  }

  /**
   * Record a new alert trigger
   */
  async create(productId: string, triggeredAt: Date = new Date()): Promise<AlertLog> {
    return prisma.alertLog.create({
      data: {
        productId,
        triggeredAt
      }
    });
  }

  /**
   * Retrieve all alerts for a specific product
   */
  async findByProductId(productId: string): Promise<AlertLog[]> {
    return prisma.alertLog.findMany({
      where: { productId },
      orderBy: { triggeredAt: 'desc' }
    });
  }

  /**
   * Retrieve all low-stock alerts system-wide
   */
  async findAll(limit = 50): Promise<AlertLogWithProduct[]> {
    return prisma.alertLog.findMany({
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
  }
}

export const alertLogRepository = new AlertLogRepository();
