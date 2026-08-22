import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../common/errors';
import { logger } from '../utils/logger';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  try {
    logger.warn(`Route not found: [${req.method}] ${req.originalUrl}`);
    next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl} - Route not found`));
  } catch (error) {
    logger.error('Error in notFoundHandler', { error: (error as Error).message });
    next(error);
  }
}
