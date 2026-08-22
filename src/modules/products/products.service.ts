import { prisma } from '../../config/prisma';
import { CacheService } from '../../services/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../constants';
import { NotFoundError } from '../../errors/AppError';
import { CreateProductInput, UpdateProductInput } from './products.schema';
import { Product } from '@prisma/client';

export interface ProductsListResult {
  products: Product[];
  cached: boolean;
}

export class ProductsService {
  /**
   * Create a new product and invalidate the products list cache
   */
  public static async createProduct(input: CreateProductInput): Promise<Product> {
    const product = await prisma.product.create({
      data: {
        name: input.name,
        description: input.description,
        price: input.price,
        stock: input.stock,
        lowStockThreshold: input.lowStockThreshold,
      },
    });

    // Invalidate products list cache on creation
    await CacheService.invalidateProductsList();

    return product;
  }

  /**
   * Get all products with current stock.
   * Cached in Redis with a 5-minute (300s) TTL.
   */
  public static async getAllProducts(): Promise<ProductsListResult> {
    // 1. Check Redis Cache
    const cachedProducts = await CacheService.get<Product[]>(CACHE_KEYS.PRODUCTS_LIST);
    if (cachedProducts) {
      return {
        products: cachedProducts,
        cached: true,
      };
    }

    // 2. Fetch fresh from PostgreSQL via Prisma
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // 3. Store in Redis with 5-minute TTL (300 seconds)
    await CacheService.set(CACHE_KEYS.PRODUCTS_LIST, products, CACHE_TTL.PRODUCTS_LIST);

    return {
      products,
      cached: false,
    };
  }

  /**
   * Get a single product with stock history summary
   */
  public static async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockHistory: {
          take: 5,
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
        },
        _count: {
          select: { stockHistory: true, alertLogs: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    return product;
  }

  /**
   * Update product details and invalidate cache
   */
  public static async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: input,
    });

    // Invalidate products list cache
    await CacheService.invalidateProductsList();

    return updatedProduct;
  }

  /**
   * Delete a product and invalidate cache
   */
  public static async deleteProduct(id: string): Promise<void> {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    await prisma.product.delete({
      where: { id },
    });

    // Invalidate products list cache
    await CacheService.invalidateProductsList();
  }
}
