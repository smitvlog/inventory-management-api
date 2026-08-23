import { Product, Prisma, StockHistory, User } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  lowStockThreshold?: number;
}

export interface RecentStockHistoryItem {
  id: string;
  quantityChange: number;
  reason: string;
  stockAfter: number;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ProductWithHistorySummary extends Product {
  recentStockHistory: RecentStockHistoryItem[];
}

type StockHistoryWithUserRelation = StockHistory & {
  user: Pick<User, 'id' | 'name' | 'email'>;
};

function formatStockHistoryItem(history: StockHistoryWithUserRelation): RecentStockHistoryItem {
  try {
    return {
      id: history.id,
      quantityChange: history.quantityChange,
      reason: history.reason,
      stockAfter: history.stockAfter,
      createdAt: history.createdAt,
      user: history.user
    };
  } catch (error) {
    logger.error('Error formatting stock history item', { error: (error as Error).message });
    throw error;
  }
}

export class ProductRepository {
  public async create(data: CreateProductData): Promise<Product> {
    try {
      const created = await prisma.product.create({
        data: {
          name: data.name.trim(),
          description: data.description.trim(),
          price: data.price,
          stock: data.stock,
          lowStockThreshold: data.lowStockThreshold
        }
      });
      return created;
    } catch (error) {
      logger.error('Error creating product in repository', { error: (error as Error).message, data });
      throw error;
    }
  }

  public async findAll(): Promise<Product[]> {
    try {
      const products = await prisma.product.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return products;
    } catch (error) {
      logger.error('Error finding all products in repository', { error: (error as Error).message });
      throw error;
    }
  }

  public async findById(id: string, tx?: Prisma.TransactionClient): Promise<Product | null> {
    try {
      const client = tx || prisma;
      const product = await client.product.findUnique({
        where: { id }
      });
      return product;
    } catch (error) {
      logger.error('Error finding product by id in repository', { id, error: (error as Error).message });
      throw error;
    }
  }

  public async findByIdWithHistorySummary(id: string): Promise<ProductWithHistorySummary | null> {
    try {
      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          stockHistories: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      if (!product) return null;

      const { stockHistories, ...productData } = product;
      const formattedHistory: RecentStockHistoryItem[] = [];

      for (let i = 0; i < stockHistories.length; i++) {
        const item = stockHistories[i];
        if (item) {
          formattedHistory.push(formatStockHistoryItem(item));
        }
      }

      return {
        ...productData,
        recentStockHistory: formattedHistory
      };
    } catch (error) {
      logger.error('Error finding product with history summary in repository', { id, error: (error as Error).message });
      throw error;
    }
  }

  public async update(id: string, data: UpdateProductData, tx?: Prisma.TransactionClient): Promise<Product> {
    try {
      const client = tx || prisma;
      const updated = await client.product.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.description !== undefined ? { description: data.description.trim() } : {}),
          ...(data.price !== undefined ? { price: data.price } : {}),
          ...(data.lowStockThreshold !== undefined ? { lowStockThreshold: data.lowStockThreshold } : {})
        }
      });
      return updated;
    } catch (error) {
      logger.error('Error updating product in repository', { id, error: (error as Error).message, data });
      throw error;
    }
  }

  public async updateStock(id: string, stock: number, tx?: Prisma.TransactionClient): Promise<Product> {
    try {
      const client = tx || prisma;
      const updated = await client.product.update({
        where: { id },
        data: { stock }
      });
      return updated;
    } catch (error) {
      logger.error('Error updating product stock in repository', { id, stock, error: (error as Error).message });
      throw error;
    }
  }

  public async delete(id: string): Promise<Product> {
    try {
      const deleted = await prisma.product.delete({
        where: { id }
      });
      return deleted;
    } catch (error) {
      logger.error('Error deleting product in repository', { id, error: (error as Error).message });
      throw error;
    }
  }
}

export const productRepository = new ProductRepository();
