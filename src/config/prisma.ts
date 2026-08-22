import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.prismaGlobal ||
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });

if (env.NODE_ENV !== 'production') {
  global.prismaGlobal = prisma;
}

export const connectPrisma = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('Connected successfully to PostgreSQL database via Prisma');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL database via Prisma', { error });
  }
};

export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info('Disconnected from PostgreSQL database');
};
