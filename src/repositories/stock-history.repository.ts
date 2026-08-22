import { StockHistory, StockReason, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

export interface CreateStockHistoryData {
  productId: string;
  userId: string;
  quantityChange: number;
  reason: StockReason;
  stockAfter: number;
}

export interface StockHistoryWithUser extends StockHistory {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export class StockHistoryRepository {
  public async create(data: CreateStockHistoryData, tx?: Prisma.TransactionClient): Promise<StockHistory> {
    try {
      const client = tx || prisma;
      const history = await client.stockHistory.create({
        data: {
          productId: data.productId,
          userId: data.userId,
          quantityChange: data.quantityChange,
          reason: data.reason,
          stockAfter: data.stockAfter
        }
      });
      return history;
    } catch (error) {
      logger.error('Error creating stock history in repository', { error: (error as Error).message, data });
      throw error;
    }
  }

  public async findByProductId(productId: string): Promise<StockHistoryWithUser[]> {
    try {
      const histories = await prisma.stockHistory.findMany({
        where: { productId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return histories;
    } catch (error) {
      logger.error('Error finding stock histories by product ID in repository', { productId, error: (error as Error).message });
      throw error;
    }
  }
}

export const stockHistoryRepository = new StockHistoryRepository();
