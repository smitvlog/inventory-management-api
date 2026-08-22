import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { authRouter } from './modules/auth/auth.routes';
import { productsRouter } from './modules/products/products.routes';
import { stockRouter } from './modules/stock/stock.routes';
import { alertsRouter } from './modules/alerts/alerts.routes';
import { usersRouter } from './modules/users/users.routes';
import { errorHandler } from './middleware/error.middleware';
import { NotFoundError } from './errors/AppError';

export const createApp = (): Application => {
  const app = express();

  // Security & Utility Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Health Check Endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'inventory-management-api',
    });
  });

  // API Modules
  app.use('/auth', authRouter);
  
  // Stock routes nested under /products/:id/stock
  productsRouter.use('/:id/stock', stockRouter);
  app.use('/products', productsRouter);

  app.use('/alerts', alertsRouter);
  app.use('/users', usersRouter);

  // Unhandled Routes -> 404
  app.use((req: Request, _res: Response) => {
    throw new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`);
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};

export const app = createApp();
