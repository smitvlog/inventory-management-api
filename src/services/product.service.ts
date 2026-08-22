import { Product } from '@prisma/client';
import {
  productRepository,
  CreateProductData,
  UpdateProductData,
  ProductWithHistorySummary
} from '../repositories/product.repository';
import { cacheService, CACHE_KEYS, DEFAULT_CACHE_TTL } from '../utils/cache';
import { NotFoundError } from '../common/errors';
import { logger } from '../utils/logger';

export class ProductService {
  /**
   * Create a new product and invalidate cached product lists
   */
  public async create(data: CreateProductData): Promise<Product> {
    try {
      const product = await productRepository.create(data);
      logger.info(`Product created: "${product.name}" (ID: ${product.id})`);

      // Invalidate products list cache
      await cacheService.invalidateProductCache();

      return product;
    } catch (error) {
      logger.error('Error creating product in ProductService', {
        error: (error as Error).message,
        data
      });
      throw error;
    }
  }

  /**
   * Get all products with current stock.
   * Leverages Redis caching with a 5-minute TTL.
   */
  public async getAll(): Promise<{ products: Product[]; cached: boolean }> {
    try {
      // 1. Check Redis cache
      const cachedProducts = await cacheService.get<Product[]>(CACHE_KEYS.PRODUCTS_LIST);

      if (cachedProducts) {
        logger.info('Cache HIT: Returning products from Redis cache');
        return { products: cachedProducts, cached: true };
      }

      // 2. Cache MISS: Query PostgreSQL via Repository
      logger.info('Cache MISS: Fetching products from PostgreSQL database');
      const products = await productRepository.findAll();

      // 3. Store in Redis with 5-minute TTL (300 seconds)
      await cacheService.set(CACHE_KEYS.PRODUCTS_LIST, products, DEFAULT_CACHE_TTL);

      return { products, cached: false };
    } catch (error) {
      logger.error('Error getting all products in ProductService', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get single product with stock history summary
   */
  public async getById(id: string): Promise<ProductWithHistorySummary> {
    try {
      const product = await productRepository.findByIdWithHistorySummary(id);
      if (!product) {
        throw new NotFoundError(`Product with ID "${id}" was not found`);
      }
      return product;
    } catch (error) {
      logger.error('Error getting product by ID in ProductService', {
        id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Update product details and invalidate product cache
   */
  public async update(id: string, data: UpdateProductData): Promise<Product> {
    try {
      const existing = await productRepository.findById(id);
      if (!existing) {
        throw new NotFoundError(`Product with ID "${id}" was not found`);
      }

      const updatedProduct = await productRepository.update(id, data);
      logger.info(`Product updated: "${updatedProduct.name}" (ID: ${updatedProduct.id})`);

      // Invalidate cache after successful DB update
      await cacheService.invalidateProductCache(id);

      return updatedProduct;
    } catch (error) {
      logger.error('Error updating product in ProductService', {
        id,
        error: (error as Error).message,
        data
      });
      throw error;
    }
  }

  /**
   * Delete a product and clear cache
   */
  public async delete(id: string): Promise<Product> {
    try {
      const existing = await productRepository.findById(id);
      if (!existing) {
        throw new NotFoundError(`Product with ID "${id}" was not found`);
      }

      const deletedProduct = await productRepository.delete(id);
      logger.info(`Product deleted: "${deletedProduct.name}" (ID: ${deletedProduct.id})`);

      // Clear cache after successful DB deletion
      await cacheService.invalidateProductCache(id);

      return deletedProduct;
    } catch (error) {
      logger.error('Error deleting product in ProductService', {
        id,
        error: (error as Error).message
      });
      throw error;
    }
  }
}

export const productService = new ProductService();
