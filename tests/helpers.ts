import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../src/config/prisma';
import { redis } from '../src/config/redis';
import { env } from '../src/config/env';

export interface TestUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  token: string;
}

export const createTestToken = (payload: { userId: string; email: string; role: Role }): string => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });
};

export const clearDatabase = async (): Promise<void> => {
  await prisma.alertLog.deleteMany();
  await prisma.stockHistory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
};

export const clearRedis = async (): Promise<void> => {
  await redis.flushdb();
};

export const teardownTestConnections = async (): Promise<void> => {
  const { closeAlertQueue } = await import('../src/queues/alert.queue');
  await closeAlertQueue();
  await redis.quit();
  await prisma.$disconnect();
};
