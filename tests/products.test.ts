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

  describe('PUT /products/:id', () => {
    it('should update product details and invalidate cache', async () => {
      const updatedProduct = { ...sampleProduct, price: 27990, name: 'Sony WH-1000XM5 Black' };
      jest.spyOn(productRepository, 'findById').mockResolvedValue(sampleProduct);
      jest.spyOn(productRepository, 'update').mockResolvedValue(updatedProduct);
      const invalidateSpy = jest.spyOn(cacheService, 'invalidateProductCache').mockResolvedValue();

      const response = await request(app)
        .put(`/products/${sampleProduct.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Sony WH-1000XM5 Black',
          price: 27990
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.price).toBe(27990);
      expect(invalidateSpy).toHaveBeenCalledWith(sampleProduct.id);
    });

    it('should disallow updating stock through product update endpoint', async () => {
      const updatedProduct = { ...sampleProduct, name: 'Sony WH-1000XM5' };
      jest.spyOn(productRepository, 'findById').mockResolvedValue(sampleProduct);
      const updateSpy = jest.spyOn(productRepository, 'update').mockResolvedValue(updatedProduct);

      const response = await request(app)
        .put(`/products/${sampleProduct.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Sony WH-1000XM5',
          stock: 999 // Should be ignored or stripped by validator
        });

      expect(response.status).toBe(200);
      expect(updateSpy).toHaveBeenCalledWith(sampleProduct.id, { name: 'Sony WH-1000XM5' });
    });
  });

  describe('GET /products/:id', () => {
    it('should return product details with recent stock history summary', async () => {
      const productWithHistory = {
        ...sampleProduct,
        recentStockHistory: [
          {
            id: 'hist-1',
            quantityChange: 10,
            reason: 'restock',
            stockAfter: 12,
            createdAt: new Date(),
            user: { id: managerUser.id, name: managerUser.name, email: managerUser.email }
          }
        ]
      };

      jest.spyOn(productRepository, 'findByIdWithHistorySummary').mockResolvedValue(productWithHistory);

      const response = await request(app)
        .get(`/products/${sampleProduct.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.recentStockHistory).toHaveLength(1);
    });

    it('should return 404 if product does not exist', async () => {
      jest.spyOn(productRepository, 'findByIdWithHistorySummary').mockResolvedValue(null);

      const response = await request(app)
        .get('/products/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('NOT_FOUND');
    });
  });
});
