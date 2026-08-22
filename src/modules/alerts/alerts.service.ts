import { prisma } from '../../config/prisma';

export class AlertsService {
  /**
   * Fetch all low-stock alert logs with associated product information
   */
  public static async getAlertLogs() {
    return prisma.alertLog.findMany({
      orderBy: { triggeredAt: 'desc' },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            stock: true,
            lowStockThreshold: true,
          },
        },
      },
    });
  }
}
