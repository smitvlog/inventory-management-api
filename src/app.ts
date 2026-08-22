import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRoutes } from './routes/auth.routes';
import { productRoutes } from './routes/product.routes';
import { notFoundHandler } from './middleware/not-found.middleware';
import { errorHandler } from './middleware/error.middleware';
import { setupSwagger } from './docs/swagger';
import { sendSuccess } from './common/response';
import { logger } from './utils/logger';

function handleHealthCheck(_req: Request, res: Response): Response {
  try {
    return sendSuccess(res, { status: 'healthy', timestamp: new Date() }, 'Service is operational');
  } catch (error) {
    logger.error('Error in health check handler', { error: (error as Error).message });
    throw error;
  }
}

export function createApp(): Express {
  try {
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
    app.get('/health', handleHealthCheck);

    // Application Routes
    app.use('/auth', authRoutes);
    app.use('/products', productRoutes);

    // 404 Route Not Found Handler
    app.use(notFoundHandler);

    // Centralized Error Handling Middleware
    app.use(errorHandler);

    return app;
  } catch (error) {
    logger.error('Error creating Express application', { error: (error as Error).message });
    throw error;
  }
}

export const app: Express = createApp();
