import request from 'supertest';
import { app } from '../src/app';
import { signToken } from '../src/utils/jwt';
import { userRepository } from '../src/repositories/user.repository';
import { productRepository } from '../src/repositories/product.repository';
import { stockHistoryRepository } from '../src/repositories/stock-history.repository';
import { cacheService } from '../src/utils/cache';
import { prisma } from '../src/config/prisma';
import * as queueProducer from '../src/queues/low-stock.queue';
import * as passwordUtils from '../src/utils/password';
import { Prisma } from '@prisma/client';

describe('End-to-End Integration Test Suite', () => {
  const ownerUser = {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'Enterprise Owner',
    email: 'enterprise-owner@test.com',
    role: 'owner' as const,
    password: '$2a$10$hashedownerpassword',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const managerUser = {
    id: '20000000-0000-0000-0000-000000000002',
    name: 'Warehouse Manager',
    email: 'manager@test.com',
    role: 'manager' as const,
    password: '$2a$10$hashedmanagerpassword',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const staffUser = {
    id: '30000000-0000-0000-0000-000000000003',
    name: 'Inventory Staff',
    email: 'staff@test.com',
    role: 'staff' as const,
    password: '$2a$10$hashedstaffpassword',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  let ownerToken: string;
  let managerToken: string;
  let staffToken: string;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(userRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === ownerUser.id) return ownerUser;
      if (id === managerUser.id) return managerUser;
      if (id === staffUser.id) return staffUser;
      return null;
    });

    ownerToken = signToken({ userId: ownerUser.id, email: ownerUser.email, role: 'owner' });
    managerToken = signToken({ userId: managerUser.id, email: managerUser.email, role: 'manager' });
    staffToken = signToken({ userId: staffUser.id, email: staffUser.email, role: 'staff' });
  });

  describe('Full End-to-End Flow: Auth -> Product Creation -> Cache -> Stock Adjustment -> Alert Trigger -> History Audit', () => {
    const createdProduct = {
      id: '50000000-0000-0000-0000-000000000005',
      name: 'MacBook Pro 16 M3 Max',
      description: 'High-end workstation laptop',
      price: 349900,
      stock: 10,
      lowStockThreshold: 4,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should complete full e2e lifecycle seamlessly', async () => {
      // 1. Auth Flow: Register new user
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(passwordUtils, 'hashPassword').mockResolvedValue('hashed_pwd');
      jest.spyOn(userRepository, 'create').mockResolvedValue(staffUser);

      const registerRes = await request(app)
        .post('/auth/register')
        .send({
          name: 'Inventory Staff',
          email: 'staff@test.com',
          password: 'password123',
          role: 'staff'
        });

      expect(registerRes.status).toBe(201);
      expect(registerRes.body.data.token).toBeDefined();

      // 2. Product Flow: Manager creates a product
      const invalidateCacheSpy = jest.spyOn(cacheService, 'invalidateProductCache').mockResolvedValue();
      jest.spyOn(productRepository, 'create').mockResolvedValue(createdProduct);

      const createProdRes = await request(app)
        .post('/products')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          name: createdProduct.name,
          description: createdProduct.description,
          price: createdProduct.price,
          stock: createdProduct.stock,
          lowStockThreshold: createdProduct.lowStockThreshold
        });

      expect(createProdRes.status).toBe(201);
      expect(createProdRes.body.data.id).toBe(createdProduct.id);
      expect(invalidateCacheSpy).toHaveBeenCalled();

      // 3. Products List Cache Flow (MISS -> HIT)
      jest.spyOn(cacheService, 'get').mockResolvedValueOnce(null);
      const setCacheSpy = jest.spyOn(cacheService, 'set').mockResolvedValue();
      jest.spyOn(productRepository, 'findAll').mockResolvedValue([createdProduct]);

      const listMissRes = await request(app)
        .get('/products')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(listMissRes.status).toBe(200);
      expect(listMissRes.headers['x-cache-status']).toBe('MISS');
      expect(setCacheSpy).toHaveBeenCalled();

      // Second request -> Cache HIT
      jest.spyOn(cacheService, 'get').mockResolvedValueOnce([createdProduct]);
      const listHitRes = await request(app)
        .get('/products')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(listHitRes.status).toBe(200);
      expect(listHitRes.headers['x-cache-status']).toBe('HIT');

      // 4. Stock Adjustment Transaction (Sale that drops stock below threshold: 10 -> 3 <= 4)
      const updatedProduct = { ...createdProduct, stock: 3 };
      const stockHistoryEntry = {
        id: '60000000-0000-0000-0000-000000000006',
        productId: createdProduct.id,
        userId: staffUser.id,
        quantityChange: -7,
        reason: 'sale' as const,
        stockAfter: 3,
        createdAt: new Date()
      };

      jest.spyOn(productRepository, 'findById').mockResolvedValue(createdProduct);
      jest.spyOn(productRepository, 'updateStock').mockResolvedValue(updatedProduct);
      jest.spyOn(stockHistoryRepository, 'create').mockResolvedValue(stockHistoryEntry);

      (jest.spyOn(prisma, '$transaction') as jest.Mock).mockImplementation(
        async <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
          const fakeTx = {} as unknown as Prisma.TransactionClient;
          return callback(fakeTx);
        }
      );

      const alertEnqueueSpy = jest.spyOn(queueProducer, 'enqueueLowStockAlert').mockResolvedValue();

      const stockRes = await request(app)
        .post(`/products/${createdProduct.id}/stock`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          quantity: -7,
          reason: 'sale'
        });

      expect(stockRes.status).toBe(200);
      expect(stockRes.body.data.product.currentStock).toBe(3);
      expect(alertEnqueueSpy).toHaveBeenCalledWith({
        productId: createdProduct.id,
        productName: createdProduct.name,
        currentStock: 3,
        threshold: 4
      });

      // 5. Stock History Audit Query (Manager & Owner allowed, Staff forbidden)
      const staffHistoryRes = await request(app)
        .get(`/products/${createdProduct.id}/stock/history`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(staffHistoryRes.status).toBe(403);

      jest.spyOn(stockHistoryRepository, 'findByProductId').mockResolvedValue([
        {
          ...stockHistoryEntry,
          user: {
            id: staffUser.id,
            name: staffUser.name,
            email: staffUser.email,
            role: staffUser.role
          }
        }
      ]);

      const managerHistoryRes = await request(app)
        .get(`/products/${createdProduct.id}/stock/history`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(managerHistoryRes.status).toBe(200);
      expect(managerHistoryRes.body.data).toHaveLength(1);
      expect(managerHistoryRes.body.data[0].stockAfter).toBe(3);

      // 6. User Management: Owner lists all users and promotes staff to manager
      jest.spyOn(userRepository, 'findAll').mockResolvedValue([ownerUser, managerUser, staffUser]);
      const listUsersRes = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(listUsersRes.status).toBe(200);
      expect(listUsersRes.body.data).toHaveLength(3);

      const promotedStaff = { ...staffUser, role: 'manager' as const };
      jest.spyOn(userRepository, 'updateRole').mockResolvedValue(promotedStaff);

      const updateRoleRes = await request(app)
        .patch(`/users/${staffUser.id}/role`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'manager' });

      expect(updateRoleRes.status).toBe(200);
      expect(updateRoleRes.body.data.role).toBe('manager');
    });
  });

  describe('Robustness and Security Edge Cases', () => {
    it('should reject unauthenticated requests to protected endpoints', async () => {
      const response = await request(app).get('/products');
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('UNAUTHORIZED');
    });

    it('should prevent non-owners from modifying user roles', async () => {
      const response = await request(app)
        .patch(`/users/${staffUser.id}/role`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ role: 'manager' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('FORBIDDEN');
    });

    it('should prevent deleting products by manager or staff', async () => {
      const response = await request(app)
        .delete(`/products/50000000-0000-0000-0000-000000000005`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('FORBIDDEN');
    });
  });
});
