import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { connectPrisma, disconnectPrisma } from './config/prisma';
import { connectRedis, disconnectRedis } from './config/redis';
import { startLowStockWorker, stopLowStockWorker } from './queues/low-stock.worker';
import { logger } from './utils/logger';

let server: http.Server;

function handleServerListening(): void {
  try {
    logger.info(`🚀 Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
    logger.info(`📖 API Documentation available at http://localhost:${env.PORT}/api-docs`);
    logger.info(`🩺 Health check endpoint at http://localhost:${env.PORT}/health`);
  } catch (error) {
    console.error('Error logging server listen status', error);
  }
}

export async function startServer(): Promise<void> {
  try {
    // 1. Connect to PostgreSQL via Prisma
    await connectPrisma();

    // 2. Connect to Redis
    await connectRedis();

    // 3. Start BullMQ low-stock alert background worker
    startLowStockWorker();

    // 4. Start HTTP Server
    server = app.listen(env.PORT, handleServerListening);
  } catch (error) {
    logger.error('Failed to start application', { error: (error as Error).message });
    process.exit(1);
  }
}

function handleShutdownTimeout(): void {
  try {
    logger.error('Graceful shutdown timed out. Forcing termination.');
    process.exit(1);
  } catch (error) {
    process.exit(1);
  }
}

export async function handleGracefulShutdown(signal: string): Promise<void> {
  try {
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);

    if (server) {
      server.close(async function handleServerClose(): Promise<void> {
        try {
          logger.info('HTTP server closed');

          // Stop BullMQ workers
          await stopLowStockWorker();

          // Disconnect Redis
          await disconnectRedis();

          // Disconnect Prisma PostgreSQL
          await disconnectPrisma();

          logger.info('Graceful shutdown completed successfully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown cleanup', { error: (error as Error).message });
          process.exit(1);
        }
      });

      // Force exit if graceful shutdown takes too long (10s timeout)
      setTimeout(handleShutdownTimeout, 10000);
    } else {
      process.exit(0);
    }
  } catch (error) {
    logger.error('Error initiating graceful shutdown', { error: (error as Error).message });
    process.exit(1);
  }
}

function handleSigInt(): void {
  handleGracefulShutdown('SIGINT').catch(function handleSigIntError(error: Error): void {
    logger.error('SIGINT handler failed', { error: error.message });
  });
}

function handleSigTerm(): void {
  handleGracefulShutdown('SIGTERM').catch(function handleSigTermError(error: Error): void {
    logger.error('SIGTERM handler failed', { error: error.message });
  });
}

process.on('SIGINT', handleSigInt);
process.on('SIGTERM', handleSigTerm);

startServer().catch(function handleStartServerError(error: Error): void {
  logger.error('Fatal error starting server', { error: error.message });
});
