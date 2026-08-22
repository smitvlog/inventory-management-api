import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { redis } from '../src/config/redis';
import { Role } from '@prisma/client';
import { clearDatabase, clearRedis, createTestToken, teardownTestConnections } from './helpers';
import { CACHE_KEYS } from '../src/constants';

describe('Module 3: Stock Management & Atomic Prisma Transactions', () => {
  let staffToken: string;
  let ownerToken: string;
  let staffUserId: string;
  let testProductId: string;

  beforeAll(async () => {
    await clearDatabase();
    await clearRedis();

    const staff = await prisma.user.create({
      data: {
        name: 'Staff Charlie',
        email: 'stock.staff@example.com',
        password: 'hashedpassword',
        role: Role.STAFF,
      },
    });
    staffUserId = staff.id;

    const owner = await prisma.user.create({
      data: {
        name: 'Owner Alice',
        email: 'stock.owner@example.com',
        password: 'hashedpassword',
        role: Role.OWNER,
      },
    });

    staffToken = createTestToken({ userId: staff.id, email: staff.email, role: Role.STAFF });
    ownerToken = createTestToken({ userId: owner.id, email: owner.email, role: Role.OWNER });

    const product = await prisma.product.create({
      data: {
        name: 'Stock Managed Laptop',
        description: 'High performance laptop',
        price: 95000,
        stock: 20,
        lowStockThreshold: 5,
      },
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    await clearDatabase();
    await teardownTestConnections();
  });

  describe('POST /products/:id/stock (Atomic Adjustments)', () => {
    it('should atomically deduct stock for a sale and record a StockHistory entry', async () => {
      const res = await request(app)
        .post(`/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          quantity: -5,
          reason: 'sale',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.updatedProduct.stock).toBe(15);
      expect(res.body.data.history.quantityChange).toBe(-5);
      expect(res.body.data.history.reason).toBe('SALE');
      expect(res.body.data.history.stockAfter).toBe(15);
      expect(res.body.data.history.userId).toBe(staffUserId);

      // Verify directly in DB
      const dbProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      expect(dbProduct?.stock).toBe(15);
    });

    it('should atomically increment stock for a restock and record history', async () => {
      const res = await request(app)
        .post(`/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          quantity: 10,
          reason: 'restock',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.updatedProduct.stock).toBe(25);
      expect(res.body.data.history.stockAfter).toBe(25);
    });

    it('should reject transactions that cause negative stock and rollback with 400 Bad Request', async () => {
      // Current stock is 25. Attempting to deduct 30
      const res = await request(app)
        .post(`/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          quantity: -30,
          reason: 'sale',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Insufficient stock/i);

      // Verify stock remained unchanged in DB
      const dbProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      expect(dbProduct?.stock).toBe(25);
    });

    it('should invalidate Redis products cache on stock adjustment', async () => {
      // 1. Populate Redis cache
      await redis.set(CACHE_KEYS.PRODUCTS_LIST, JSON.stringify([{ id: testProductId }]));

      // 2. Adjust stock
      await request(app)
        .post(`/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          quantity: 2,
          reason: 'return',
        });

      // 3. Verify Redis key is now invalidated
      const cached = await redis.get(CACHE_KEYS.PRODUCTS_LIST);
      expect(cached).toBeNull();
    });

    it('should reject quantity equal to 0', async () => {
      const res = await request(app)
        .post(`/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          quantity: 0,
          reason: 'restock',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /products/:id/stock/history (Audit Trail)', () => {
    it('should return complete stock history with user metadata for Owner and Manager', async () => {
      const res = await request(app)
        .get(`/products/${testProductId}/stock/history`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.history.length).toBeGreaterThanOrEqual(3);
      expect(res.body.data.history[0].user).toBeDefined();
      expect(res.body.data.history[0].user.email).toBe('stock.staff@example.com');
    });
  });
});
