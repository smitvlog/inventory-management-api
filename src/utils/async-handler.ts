import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from './logger';

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return function expressAsyncWrapper(req: Request, res: Response, next: NextFunction): void {
    try {
      fn(req, res, next).catch(function handleAsyncError(error: Error): void {
        logger.error(`Async handler error caught on [${req.method}] ${req.originalUrl}`, {
          error: error.message
        });
        next(error);
      });
    } catch (error) {
      logger.error(`Synchronous error caught in async wrapper on [${req.method}] ${req.originalUrl}`, {
        error: (error as Error).message
      });
      next(error);
    }
  };
}
