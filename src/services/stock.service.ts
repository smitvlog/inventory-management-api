import { StockReason, Prisma } from '@prisma/client';
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
  public async adjustStock(
    productId: string,
    userId: string,
    quantity: number,
    reason: StockReason
  ): Promise<StockAdjustmentResult> {
    try {
      // Execute entire fetch, validation, arithmetic, stock update, and audit log insert inside an atomic Prisma transaction
      const transactionResult = await prisma.$transaction(
        async function executeStockAdjustmentTx(tx: Prisma.TransactionClient) {
          try {
            // 1. Fetch current product state within the transaction client
            const product = await productRepository.findById(productId, tx);
            if (!product) {
              throw new NotFoundError(`Product with ID "${productId}" was not found`);
            }

            const previousStock = product.stock;
            const newStock = previousStock + quantity;

            // 2. Validate non-negative stock constraint atomically
            if (newStock < 0) {
              throw new BadRequestError(
                `Insufficient stock for product "${product.name}". Current stock: ${previousStock}, requested adjustment: ${quantity}. Stock cannot be negative.`
              );
            }

            // 3. Atomically update product stock using transaction client
            const updated = await productRepository.updateStock(productId, newStock, tx);

            // 4. Create stock history audit entry within transaction
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

            return {
              updatedProduct: updated,
              stockHistory: history,
              previousStock,
              newStock
            };
          } catch (txError) {
            logger.error('Error executing stock adjustment transaction block', {
              productId,
              error: (txError as Error).message
            });
            throw txError;
          }
        }
      );

      const { updatedProduct, stockHistory, previousStock, newStock } = transactionResult;

      logger.info(
        `Stock adjusted for product "${updatedProduct.name}" (${productId}): ${previousStock} -> ${newStock} (${quantity > 0 ? '+' : ''}${quantity} | ${reason})`
      );

      // Invalidate Redis products cache after successful transaction commit
      await cacheService.invalidateProductCache(productId);

      // Trigger asynchronous low-stock alert evaluation if stock dropped below threshold
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
    } catch (error) {
      logger.error('Error adjusting stock in StockService', {
        productId,
        userId,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get complete stock history for a product
   */
  public async getProductStockHistory(productId: string): Promise<StockHistoryWithUser[]> {
    try {
      const product = await productRepository.findById(productId);
      if (!product) {
        throw new NotFoundError(`Product with ID "${productId}" was not found`);
      }

      const history = await stockHistoryRepository.findByProductId(productId);
      return history;
    } catch (error) {
      logger.error('Error getting stock history in StockService', {
        productId,
        error: (error as Error).message
      });
      throw error;
    }
  }
}

export const stockService = new StockService();
