import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../common/errors';
import { sendError } from '../common/response';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(`Error processing request ${req.method} ${req.originalUrl}: ${err.message}`, {
    name: err.name,
    stack: env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Handle Known AppError
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.errorCode, err.details);
    return;
  }

  // Handle Prisma Known Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || [];
      const field = target.join(', ') || 'field';
      sendError(res, `A record with this ${field} already exists.`, 409, 'DUPLICATE_RESOURCE');
      return;
    }
    if (err.code === 'P2025') {
      sendError(res, 'Requested resource was not found.', 404, 'NOT_FOUND');
      return;
    }
    sendError(res, 'Database query error occurred.', 400, 'DATABASE_ERROR');
    return;
  }

  // Handle Prisma Validation Errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    sendError(res, 'Database validation error.', 400, 'DATABASE_VALIDATION_ERROR');
    return;
  }

  // Handle Malformed JSON payload in Express
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 'Malformed JSON payload in request body.', 400, 'INVALID_JSON');
    return;
  }

  // Fallback 500 Internal Server Error
  const message =
    env.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred.'
      : err.message || 'Internal server error';

  sendError(res, message, 500, 'INTERNAL_SERVER_ERROR');
};
