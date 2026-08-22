import { prisma } from '../../config/prisma';
import { CacheService } from '../../services/cache.service';
import { enqueueLowStockAlert } from '../../queues/alert.queue';
import { BadRequestError, NotFoundError } from '../../errors/AppError';
import { AdjustStockInput } from './stock.schema';

export class StockService {
  /**
   * Adjust stock for a product atomically using a Prisma transaction.
   * Invalidates Redis cache and triggers BullMQ low-stock alert if applicable.
   */
  public static async adjustStock(
    productId: string,
    userId: string,
    input: AdjustStockInput
  ) {
    // 1. Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find product
      const product = await tx.product.findUnique({
        where: { id: productId },
      });

      if (!product) {
        throw new NotFoundError(`Product with ID '${productId}' not found`);
      }

      // Calculate new stock
      const newStock = product.stock + input.quantity;

      // Prevent negative inventory
      if (newStock < 0) {
        throw new BadRequestError(
          `Insufficient stock. Current stock is ${product.stock}, but requested change is ${input.quantity}`
        );
      }

      // Update product stock
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stock: newStock },
      });

      // Create StockHistory record
      const history = await tx.stockHistory.create({
        data: {
          productId,
          userId,
          quantityChange: input.quantity,
          reason: input.reason,
          stockAfter: newStock,
        },
      });

      return { updatedProduct, history };
    });

    // 2. Invalidate products list cache immediately
    await CacheService.invalidateProductsList();

    // 3. Enqueue BullMQ low-stock alert job if stock dropped <= threshold (non-blocking)
    if (result.updatedProduct.stock <= result.updatedProduct.lowStockThreshold) {
      // Non-blocking fire-and-forget call
      void enqueueLowStockAlert({
        productId: result.updatedProduct.id,
        productName: result.updatedProduct.name,
        currentStock: result.updatedProduct.stock,
        threshold: result.updatedProduct.lowStockThreshold,
      });
    }

    return result;
  }

  /**
   * Fetch complete stock history for a product
   */
  public static async getStockHistory(productId: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError(`Product with ID '${productId}' not found`);
    }

    const history = await prisma.stockHistory.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return {
      product: {
        id: product.id,
        name: product.name,
        currentStock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
      },
      totalRecords: history.length,
      history,
    };
  }
}
