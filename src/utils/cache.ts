import { redis } from '../config/redis';
import { logger } from './logger';

export function getProductDetailCacheKey(id: string): string {
  try {
    return `product:${id}`;
  } catch (error) {
    logger.error('Error generating product detail cache key', { error: (error as Error).message });
    throw error;
  }
}

export const CACHE_KEYS = {
  PRODUCTS_LIST: 'products:list',
  PRODUCT_DETAIL: getProductDetailCacheKey
} as const;

export const DEFAULT_CACHE_TTL = 300; // 5 minutes in seconds

export class CacheService {
  /**
   * Get cached data by key
   */
  public async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.warn(`Redis get error for key "${key}"`, { error: (error as Error).message });
      return null;
    }
  }

  /**
   * Set cached data with TTL in seconds (default 5 minutes)
   */
  public async set<T>(key: string, value: T, ttlSeconds: number = DEFAULT_CACHE_TTL): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttlSeconds, serialized);
    } catch (error) {
      logger.warn(`Redis set error for key "${key}"`, { error: (error as Error).message });
    }
  }

  /**
   * Invalidate / delete specific cache key
   */
  public async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
      logger.info(`Redis cache invalidated for key: "${key}"`);
    } catch (error) {
      logger.warn(`Redis delete error for key "${key}"`, { error: (error as Error).message });
    }
  }

  /**
   * Invalidate multiple keys matching a pattern or multiple keys
   */
  public async deleteMany(keys: string[]): Promise<void> {
    try {
      if (keys.length === 0) return;
      await redis.del(...keys);
      logger.info(`Redis cache keys deleted: ${keys.join(', ')}`);
    } catch (error) {
      logger.warn('Redis deleteMany error', { error: (error as Error).message });
    }
  }

  /**
   * Invalidate products list and related product detail cache
   */
  public async invalidateProductCache(productId?: string): Promise<void> {
    try {
      const keysToDelete: string[] = [CACHE_KEYS.PRODUCTS_LIST];
      if (productId) {
        keysToDelete.push(getProductDetailCacheKey(productId));
      }
      await this.deleteMany(keysToDelete);
    } catch (error) {
      logger.warn('Redis invalidateProductCache error', { error: (error as Error).message });
    }
  }
}

export const cacheService = new CacheService();
