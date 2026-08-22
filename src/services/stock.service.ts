import { StockReason } from '@prisma/client';
import { prisma } from '../config/prisma';
import { productRepository } from '../repositories/product.repository';
import { stockHistoryRepository, StockHistoryWithUser } from '../repositories/stock-history.repository';
import { alertService } from './alert.service';
import { cacheService } from '../utils/cache';
import { BadRequestError, NotFoundError } from '../common/errors';
import { logger } from '../utils/logger';

export interface StockAdjustmentResult {
  product: {
    id: string;
    name: string;
    previousStock: number;
    currentStock: number;
    lowStockThreshold: number;
  };
  stockHistory: {
    id: string;
    quantityChange: number;
    reason: StockReason;
    stockAfter: number;
    createdAt: Date;
  };
}

export class StockService {
  /**
   * Adjust product stock using an atomic Prisma transaction.
   * Ensures stock update and StockHistory record creation succeed or fail together.
   *
   * @param productId Target product ID
   * @param userId ID of the authenticated user performing the adjustment
   * @param quantity Positive number for restock/return, negative number for sale/damage
   * @param reason Reason for the stock adjustment
   */
  async adjustStock(
    productId: string,
    userId: string,
    quantity: number,
    reason: StockReason
  ): Promise<StockAdjustmentResult> {
    // 1. Check initial product existence
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new NotFoundError(`Product with ID "${productId}" was not found`);
    }

    const previousStock = product.stock;
    const newStock = previousStock + quantity;

    if (newStock < 0) {
      throw new BadRequestError(
        `Insufficient stock for product "${product.name}". Current stock: ${previousStock}, requested adjustment: ${quantity}. Stock cannot be negative.`
      );
    }

    // 2. Execute atomic Prisma transaction
    const { updatedProduct, stockHistory } = await prisma.$transaction(async (tx) => {
      // Update product stock within transaction
      const updated = await productRepository.update(
        productId,
        { stock: newStock },
        tx
      );

      // Create StockHistory audit record within transaction
      const history = await stockHistoryRepository.create(
        {
          productId,
          userId,
          quantityChange: quantity,
          reason,
          stockAfter: newStock
        },
        tx
      );

      return { updatedProduct: updated, stockHistory: history };
    });

    logger.info(
      `Stock adjusted for product "${updatedProduct.name}" (${productId}): ${previousStock} -> ${newStock} (${quantity > 0 ? '+' : ''}${quantity} | ${reason})`
    );

    // 3. Invalidate Redis products cache after successful transaction commit
    await cacheService.invalidateProductCache(productId);

    // 4. Trigger asynchronous low-stock alert evaluation if stock dropped below threshold
    await alertService.checkAndTriggerLowStockAlert(
      updatedProduct.id,
      updatedProduct.name,
      newStock,
      updatedProduct.lowStockThreshold
    );

    return {
      product: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        previousStock,
        currentStock: updatedProduct.stock,
        lowStockThreshold: updatedProduct.lowStockThreshold
      },
      stockHistory: {
        id: stockHistory.id,
        quantityChange: stockHistory.quantityChange,
        reason: stockHistory.reason,
        stockAfter: stockHistory.stockAfter,
        createdAt: stockHistory.createdAt
      }
    };
  }

  /**
   * Get complete stock history for a product
   */
  async getProductStockHistory(productId: string): Promise<StockHistoryWithUser[]> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new NotFoundError(`Product with ID "${productId}" was not found`);
    }

    return stockHistoryRepository.findByProductId(productId);
  }
}

export const stockService = new StockService();
