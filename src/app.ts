import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRoutes } from './routes/auth.routes';
import { productRoutes } from './routes/product.routes';
import { notFoundHandler } from './middleware/not-found.middleware';
import { errorHandler } from './middleware/error.middleware';
import { setupSwagger } from './docs/swagger';
import { sendSuccess } from './common/response';

export const createApp = (): Express => {
  const app = express();

  // Security Middleware
  app.use(helmet());
  app.use(cors());

  // Body Parsing Middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API Documentation
  setupSwagger(app);

  // Health Check Endpoint
  app.get('/health', (_req, res) => {
    return sendSuccess(res, { status: 'healthy', timestamp: new Date() }, 'Service is operational');
  });

  // Application Routes
  app.use('/auth', authRoutes);
  app.use('/products', productRoutes);

  // 404 Route Not Found Handler
  app.use(notFoundHandler);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};

export const app = createApp();
