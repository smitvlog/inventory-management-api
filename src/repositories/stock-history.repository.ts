import { StockHistory, StockReason, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';

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
  async create(data: CreateStockHistoryData, tx?: Prisma.TransactionClient): Promise<StockHistory> {
    const client = tx || prisma;
    return client.stockHistory.create({
      data: {
        productId: data.productId,
        userId: data.userId,
        quantityChange: data.quantityChange,
        reason: data.reason,
        stockAfter: data.stockAfter
      }
    });
  }

  async findByProductId(productId: string): Promise<StockHistoryWithUser[]> {
    return prisma.stockHistory.findMany({
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
  }
}

export const stockHistoryRepository = new StockHistoryRepository();
