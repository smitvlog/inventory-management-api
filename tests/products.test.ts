import request from 'supertest';
import { app } from '../src/app';
import { signToken } from '../src/utils/jwt';
import { userRepository } from '../src/repositories/user.repository';
import { productRepository } from '../src/repositories/product.repository';
import { cacheService, CACHE_KEYS } from '../src/utils/cache';

describe('Products & Caching Suite', () => {
  const managerUser = {
    id: 'user-manager-id',
    name: 'Manager User',
    email: 'manager@test.com',
    role: 'manager' as const,
    password: 'hash',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleProduct = {
    id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    name: 'Sony WH-1000XM5',
    description: 'Noise cancelling headphones',
    price: 29990,
    stock: 12,
    lowStockThreshold: 3,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleProducts = [sampleProduct];

  let managerToken: string;

  beforeEach(() => {
    jest.spyOn(userRepository, 'findById').mockResolvedValue(managerUser);
    managerToken = signToken({ userId: managerUser.id, email: managerUser.email, role: 'manager' });
  });

  describe('GET /products with Redis Caching', () => {
    it('should query DB and set cache on cache MISS', async () => {
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);
      const setSpy = jest.spyOn(cacheService, 'set').mockResolvedValue();
      jest.spyOn(productRepository, 'findAll').mockResolvedValue(sampleProducts);

      const response = await request(app)
        .get('/products')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['x-cache-status']).toBe('MISS');
      expect(response.body.data).toHaveLength(1);
      expect(setSpy).toHaveBeenCalledWith(CACHE_KEYS.PRODUCTS_LIST, sampleProducts, 300);
    });

    it('should return cached data directly on cache HIT without querying DB', async () => {
      jest.spyOn(cacheService, 'get').mockResolvedValue(sampleProducts);
      const findAllSpy = jest.spyOn(productRepository, 'findAll');

      const response = await request(app)
        .get('/products')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.headers['x-cache-status']).toBe('HIT');
      expect(response.body.data).toHaveLength(1);
      expect(findAllSpy).not.toHaveBeenCalled();
    });
  });

  describe('POST /products', () => {
    it('should create a product and invalidate cache', async () => {
      const invalidateSpy = jest.spyOn(cacheService, 'invalidateProductCache').mockResolvedValue();
      jest.spyOn(productRepository, 'create').mockResolvedValue(sampleProduct);

      const response = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Sony WH-1000XM5',
          description: 'Noise cancelling headphones',
          price: 29990,
          stock: 12,
          lowStockThreshold: 3
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });
});
