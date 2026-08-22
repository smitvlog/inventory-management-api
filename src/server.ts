import { app } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { redis } from './config/redis';
import { startAlertWorker } from './queues/alert.worker';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Inventory Management API running on port ${env.PORT} in ${env.NODE_ENV} mode`);
  console.log(`📡 Health check available at: http://localhost:${env.PORT}/health`);
});

// Start BullMQ Worker in-process
const alertWorker = startAlertWorker();
console.log('👷 BullMQ Low-Stock Alert Worker initialized and listening for jobs...');

// Graceful Shutdown Handler
const shutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('🔒 HTTP server closed.');

    try {
      await alertWorker.close();
      console.log('👷 BullMQ worker stopped.');

      await redis.quit();
      console.log('📦 Redis connection closed.');

      await prisma.$disconnect();
      console.log('🗄️ PostgreSQL database disconnected.');

      console.log('👋 Process terminated gracefully.');
      process.exit(0);
    } catch (err) {
      console.error('⚠️ Error during graceful shutdown:', err);
      process.exit(1);
    }
  });

  // Force shutdown if cleanup hangs
  setTimeout(() => {
    console.error('⏰ Forcefully shutting down after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
