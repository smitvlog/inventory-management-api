import request from 'supertest';
import { app } from '../src/app';
import { signToken } from '../src/utils/jwt';
import { userRepository } from '../src/repositories/user.repository';
import { productRepository } from '../src/repositories/product.repository';
import { stockHistoryRepository } from '../src/repositories/stock-history.repository';
import { prisma } from '../src/config/prisma';
import * as queueProducer from '../src/queues/low-stock.queue';
import { cacheService } from '../src/utils/cache';
import { Prisma } from '@prisma/client';

describe('Stock Management & Transactions Suite', () => {
  const staffUser = {
    id: 'user-staff-id',
    name: 'Staff User',
    email: 'staff@test.com',
    role: 'staff' as const,
    password: 'hash',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const product = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Logitech MX Master 3S',
    description: 'Wireless Performance Mouse',
    price: 9995,
    stock: 10,
    lowStockThreshold: 5,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  let staffToken: string;

  beforeEach(() => {
    jest.spyOn(userRepository, 'findById').mockResolvedValue(staffUser);
    staffToken = signToken({ userId: staffUser.id, email: staffUser.email, role: 'staff' });
  });

  describe('POST /products/:id/stock', () => {
    it('should adjust stock atomically and trigger low-stock alert when stock drops below threshold', async () => {
      jest.spyOn(productRepository, 'findById').mockResolvedValue(product);

      const updatedProduct = { ...product, stock: 4 };
      const createdHistory = {
        id: 'hist-1',
        productId: product.id,
        userId: staffUser.id,
        quantityChange: -6,
        reason: 'sale' as const,
        stockAfter: 4,
        createdAt: new Date()
      };

      // Mock prisma transaction implementation strictly typed without `any`
      jest
        .spyOn(prisma, '$transaction')
        .mockImplementation(async <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
          const fakeTx = {
            product: {
              update: jest.fn().mockResolvedValue(updatedProduct)
            },
            stockHistory: {
              create: jest.fn().mockResolvedValue(createdHistory)
            }
          } as unknown as Prisma.TransactionClient;

          return callback(fakeTx);
        });

      jest.spyOn(productRepository, 'update').mockResolvedValue(updatedProduct);
      jest.spyOn(stockHistoryRepository, 'create').mockResolvedValue(createdHistory);
      const invalidateSpy = jest.spyOn(cacheService, 'invalidateProductCache').mockResolvedValue();
      const enqueueSpy = jest.spyOn(queueProducer, 'enqueueLowStockAlert').mockResolvedValue();

      const response = await request(app)
        .post(`/products/${product.id}/stock`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          quantity: -6,
          reason: 'sale'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.product.currentStock).toBe(4);
      expect(invalidateSpy).toHaveBeenCalledWith(product.id);
      expect(enqueueSpy).toHaveBeenCalledWith({
        productId: product.id,
        productName: product.name,
        currentStock: 4,
        threshold: 5
      });
    });

    it('should reject adjustment if new stock would fall below 0 (400 Bad Request)', async () => {
      jest.spyOn(productRepository, 'findById').mockResolvedValue(product);

      const response = await request(app)
        .post(`/products/${product.id}/stock`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          quantity: -25,
          reason: 'sale'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('BAD_REQUEST');
      expect(response.body.message).toContain('Insufficient stock');
    });
  });
});
