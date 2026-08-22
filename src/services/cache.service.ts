import { redis } from '../config/redis';
import { CACHE_KEYS, CACHE_TTL } from '../constants';

export class CacheService {
  /**
   * Fetch and parse JSON data from Redis
   */
  public static async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`[CacheService] Failed to get key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set JSON data in Redis with a TTL in seconds
   */
  public static async set(key: string, value: unknown, ttlSeconds: number = CACHE_TTL.PRODUCTS_LIST): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await redis.set(key, serialized, 'EX', ttlSeconds);
    } catch (error) {
      console.error(`[CacheService] Failed to set key ${key}:`, error);
    }
  }

  /**
   * Delete a single key or pattern from Redis
   */
  public static async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`[CacheService] Failed to delete key ${key}:`, error);
    }
  }

  /**
   * Specifically invalidate the products list cache
   */
  public static async invalidateProductsList(): Promise<void> {
    try {
      await redis.del(CACHE_KEYS.PRODUCTS_LIST);
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[CacheService] Invalidation triggered for key: ${CACHE_KEYS.PRODUCTS_LIST}`);
      }
    } catch (error) {
      console.error(`[CacheService] Failed to invalidate products list:`, error);
    }
  }
}
