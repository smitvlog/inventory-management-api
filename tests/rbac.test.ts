import request from 'supertest';
import { app } from '../src/app';
import { signToken } from '../src/utils/jwt';
import { userRepository } from '../src/repositories/user.repository';
import { productRepository } from '../src/repositories/product.repository';
import { stockHistoryRepository } from '../src/repositories/stock-history.repository';
import { cacheService } from '../src/utils/cache';

describe('RBAC & Permission Matrix Suite', () => {
  const ownerUser = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Owner User',
    email: 'owner@test.com',
    role: 'owner' as const,
    password: 'hash',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const managerUser = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Manager User',
    email: 'manager@test.com',
    role: 'manager' as const,
    password: 'hash',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const staffUser = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Staff User',
    email: 'staff@test.com',
    role: 'staff' as const,
    password: 'hash',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const testProduct = {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Test Gaming Mouse',
    description: 'Ergonomic high-DPI mouse',
    price: 3999,
    stock: 20,
    lowStockThreshold: 5,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  let ownerToken: string;
  let managerToken: string;
  let staffToken: string;

  beforeEach(() => {
    jest.spyOn(userRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === ownerUser.id) return ownerUser;
      if (id === managerUser.id) return managerUser;
      if (id === staffUser.id) return staffUser;
      return null;
    });

    jest.spyOn(productRepository, 'findById').mockResolvedValue(testProduct);
    jest.spyOn(productRepository, 'delete').mockResolvedValue(testProduct);
    jest.spyOn(productRepository, 'create').mockResolvedValue(testProduct);
    jest.spyOn(stockHistoryRepository, 'findByProductId').mockResolvedValue([]);
    jest.spyOn(cacheService, 'invalidateProductCache').mockResolvedValue();

    ownerToken = signToken({ userId: ownerUser.id, email: ownerUser.email, role: 'owner' });
    managerToken = signToken({ userId: managerUser.id, email: managerUser.email, role: 'manager' });
    staffToken = signToken({ userId: staffUser.id, email: staffUser.email, role: 'staff' });
  });

  describe('Product Deletion (DELETE /products/:id)', () => {
    it('should return 403 Forbidden when Staff tries to delete a product', async () => {
      const response = await request(app)
        .delete(`/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('FORBIDDEN');
    });

    it('should return 403 Forbidden when Manager tries to delete a product', async () => {
      const response = await request(app)
        .delete(`/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('FORBIDDEN');
    });

    it('should allow Owner to delete a product', async () => {
      const response = await request(app)
        .delete(`/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Stock History Access (GET /products/:id/stock/history)', () => {
    it('should return 403 Forbidden when Staff tries to view stock history', async () => {
      const response = await request(app)
        .get(`/products/${testProduct.id}/stock/history`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should allow Manager to view stock history', async () => {
      const response = await request(app)
        .get(`/products/${testProduct.id}/stock/history`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow Owner to view stock history', async () => {
      const response = await request(app)
        .get(`/products/${testProduct.id}/stock/history`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Product Creation (POST /products)', () => {
    it('should return 403 Forbidden when Staff tries to create a product', async () => {
      const response = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Pro Keyboard',
          description: 'Mechanical keyboard',
          price: 5999,
          stock: 10,
          lowStockThreshold: 2
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should allow Manager to create a product', async () => {
      const response = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: 'Pro Keyboard',
          description: 'Mechanical keyboard',
          price: 5999,
          stock: 10,
          lowStockThreshold: 2
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });
});
