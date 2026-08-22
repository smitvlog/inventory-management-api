import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { connectPrisma, disconnectPrisma } from './config/prisma';
import { disconnectRedis } from './config/redis';
import { startLowStockWorker, stopLowStockWorker } from './queues/low-stock.worker';
import { logger } from './utils/logger';

let server: http.Server;

const startServer = async (): Promise<void> => {
  try {
    // 1. Connect to PostgreSQL via Prisma
    await connectPrisma();

    // 2. Start BullMQ low-stock alert background worker
    startLowStockWorker();

    // 3. Start HTTP Server
    server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`📖 API Documentation available at http://localhost:${env.PORT}/api-docs`);
      logger.info(`🩺 Health check endpoint at http://localhost:${env.PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start application', { error: (error as Error).message });
    process.exit(1);
  }
};

const handleGracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      // Stop BullMQ workers
      await stopLowStockWorker();

      // Disconnect Redis
      await disconnectRedis();

      // Disconnect Prisma PostgreSQL
      await disconnectPrisma();

      logger.info('Graceful shutdown completed successfully');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long (10s timeout)
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing termination.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => void handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => void handleGracefulShutdown('SIGTERM'));

void startServer();
