import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../common/errors';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl} - Route not found`));
};
