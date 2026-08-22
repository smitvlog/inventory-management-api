import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { Role } from '@prisma/client';
import { clearDatabase, clearRedis, createTestToken, teardownTestConnections } from './helpers';

describe('RBAC Permission Matrix Tests', () => {
  let ownerToken: string;
  let managerToken: string;
  let staffToken: string;
  let testProductId: string;

  beforeAll(async () => {
    await clearDatabase();
    await clearRedis();

    // Create 3 users: Owner, Manager, Staff
    const owner = await prisma.user.create({
      data: {
        name: 'Owner User',
        email: 'rbac.owner@example.com',
        password: 'hashedpassword',
        role: Role.OWNER,
      },
    });

    const manager = await prisma.user.create({
      data: {
        name: 'Manager User',
        email: 'rbac.manager@example.com',
        password: 'hashedpassword',
        role: Role.MANAGER,
      },
    });

    const staff = await prisma.user.create({
      data: {
        name: 'Staff User',
        email: 'rbac.staff@example.com',
        password: 'hashedpassword',
        role: Role.STAFF,
      },
    });

    ownerToken = createTestToken({ userId: owner.id, email: owner.email, role: Role.OWNER });
    managerToken = createTestToken({ userId: manager.id, email: manager.email, role: Role.MANAGER });
    staffToken = createTestToken({ userId: staff.id, email: staff.email, role: Role.STAFF });

    // Create a test product
    const product = await prisma.product.create({
      data: {
        name: 'RBAC Test Gadget',
        description: 'Test gadget for RBAC verification',
        price: 2500,
        stock: 50,
        lowStockThreshold: 10,
      },
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    await clearDatabase();
    await teardownTestConnections();
  });

  describe('Product Deletion (DELETE /products/:id) - Owner only', () => {
    it('should reject Staff attempting to delete a product with 403 Forbidden (Bonus Requirement)', async () => {
      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Forbidden/i);
    });

    it('should reject Manager attempting to delete a product with 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should allow Owner to delete a product with 200 OK', async () => {
      // Create a dummy product to delete
      const toDelete = await prisma.product.create({
        data: {
          name: 'To be deleted',
          description: 'Desc',
          price: 100,
          stock: 5,
          lowStockThreshold: 1,
        },
      });

      const res = await request(app)
        .delete(`/products/${toDelete.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Product Creation (POST /products) - Owner & Manager only', () => {
    it('should reject Staff attempting to create a product with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff Unauthorized Item',
          description: 'Desc',
          price: 1000,
          stock: 10,
          lowStockThreshold: 2,
        });

      expect(res.status).toBe(403);
    });

    it('should allow Manager to create a product with 201 Created', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Manager Created Item',
          description: 'Created by manager',
          price: 1500,
          stock: 20,
          lowStockThreshold: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should allow Owner to create a product with 201 Created', async () => {
      const res = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Owner Created Item',
          description: 'Created by owner',
          price: 2000,
          stock: 30,
          lowStockThreshold: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Product Update (PUT /products/:id) - Owner & Manager only', () => {
    it('should reject Staff attempting to update a product with 403 Forbidden', async () => {
      const res = await request(app)
        .put(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff Renamed',
        });

      expect(res.status).toBe(403);
    });

    it('should allow Manager to update a product with 200 OK', async () => {
      const res = await request(app)
        .put(`/products/${testProductId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Manager Updated Gadget',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Manager Updated Gadget');
    });
  });

  describe('Stock History View (GET /products/:id/stock/history) - Owner & Manager only', () => {
    it('should reject Staff attempting to view stock history with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/products/${testProductId}/stock/history`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });

    it('should allow Manager and Owner to view stock history with 200 OK', async () => {
      const managerRes = await request(app)
        .get(`/products/${testProductId}/stock/history`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(managerRes.status).toBe(200);

      const ownerRes = await request(app)
        .get(`/products/${testProductId}/stock/history`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(ownerRes.status).toBe(200);
    });
  });

  describe('Stock Adjustment (POST /products/:id/stock) - All roles allowed', () => {
    it('should allow Staff, Manager, and Owner to adjust stock with 200 OK', async () => {
      const staffRes = await request(app)
        .post(`/products/${testProductId}/stock`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          quantity: 5,
          reason: 'restock',
        });

      expect(staffRes.status).toBe(200);
      expect(staffRes.body.success).toBe(true);
    });
  });

  describe('User Management (GET /users) - Owner only', () => {
    it('should reject Staff and Manager with 403 Forbidden', async () => {
      const staffRes = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(staffRes.status).toBe(403);

      const managerRes = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(managerRes.status).toBe(403);
    });

    it('should allow Owner to view all users with 200 OK', async () => {
      const res = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThanOrEqual(3);
    });
  });
});
