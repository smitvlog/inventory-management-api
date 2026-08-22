import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { redis } from '../src/config/redis';
import { Role } from '@prisma/client';
import { clearDatabase, clearRedis, createTestToken, teardownTestConnections } from './helpers';
import { CACHE_KEYS } from '../src/constants';

describe('Module 2: Products API & Redis Caching (/products)', () => {
  let ownerToken: string;
  let managerToken: string;
  let testProductId: string;

  beforeAll(async () => {
    await clearDatabase();
    await clearRedis();

    const owner = await prisma.user.create({
      data: {
        name: 'Owner User',
        email: 'prod.owner@example.com',
        password: 'hashedpassword',
        role: Role.OWNER,
      },
    });

    const manager = await prisma.user.create({
      data: {
        name: 'Manager User',
        email: 'prod.manager@example.com',
        password: 'hashedpassword',
        role: Role.MANAGER,
      },
    });

    ownerToken = createTestToken({ userId: owner.id, email: owner.email, role: Role.OWNER });
    managerToken = createTestToken({ userId: manager.id, email: manager.email, role: Role.MANAGER });

    const p = await prisma.product.create({
      data: {
        name: 'Initial Product',
        description: 'First test product',
        price: 999,
        stock: 20,
        lowStockThreshold: 5,
      },
    });
    testProductId = p.id;
  });

  afterAll(async () => {
    await clearDatabase();
    await teardownTestConnections();
  });

  describe('GET /products Caching Strategy (5-min TTL & Invalidation)', () => {
    it('should result in Cache MISS on first fetch and populate Redis with TTL', async () => {
      // Ensure Redis key is clean
      await redis.del(CACHE_KEYS.PRODUCTS_LIST);

      const res = await request(app)
        .get('/products')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['x-cache']).toBe('MISS');
      expect(res.body.cached).toBe(false);

      // Verify key was set in Redis
      const cached = await redis.get(CACHE_KEYS.PRODUCTS_LIST);
      expect(cached).toBeDefined();

      // Verify TTL is around 300 seconds (5 minutes)
      const ttl = await redis.ttl(CACHE_KEYS.PRODUCTS_LIST);
      expect(ttl).toBeGreaterThan(280);
      expect(ttl).toBeLessThanOrEqual(300);
    });

    it('should result in Cache HIT on subsequent fetch within 5 minutes', async () => {
      const res = await request(app)
        .get('/products')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['x-cache']).toBe('HIT');
      expect(res.body.cached).toBe(true);
    });

    it('should invalidate Redis cache when a new product is created', async () => {
      // 1. Ensure cache is populated
      await request(app).get('/products').set('Authorization', `Bearer ${ownerToken}`);

      // 2. Create product
      await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'New Invalidation Item',
          description: 'Testing cache clear',
          price: 500,
          stock: 10,
          lowStockThreshold: 2,
        });

      // 3. Cache key in Redis should now be deleted
      const cached = await redis.get(CACHE_KEYS.PRODUCTS_LIST);
      expect(cached).toBeNull();

      // 4. Next read should be MISS
      const nextRead = await request(app)
        .get('/products')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(nextRead.headers['x-cache']).toBe('MISS');
    });

    it('should invalidate Redis cache when a product is updated', async () => {
      // 1. Ensure cache is populated
      await request(app).get('/products').set('Authorization', `Bearer ${ownerToken}`);

      // 2. Update product
      await request(app)
        .put(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Updated Product Name' });

      // 3. Cache key in Redis should now be deleted
      const cached = await redis.get(CACHE_KEYS.PRODUCTS_LIST);
      expect(cached).toBeNull();
    });
  });

  describe('GET /products/:id', () => {
    it('should return a single product with stock history summary', async () => {
      const res = await request(app)
        .get(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testProductId);
      expect(res.body.data.stockHistory).toBeDefined();
    });

    it('should return 404 for non-existent product ID', async () => {
      const nonExistentId = '11111111-1111-1111-1111-111111111111';
      const res = await request(app)
        .get(`/products/${nonExistentId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(404);
    });
  });
});
