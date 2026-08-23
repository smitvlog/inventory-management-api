import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../common/errors';
import { sendError } from '../common/response';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  try {
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
      if (err.code === 'P2021') {
        const table = (err.meta?.table as string) || 'table';
        sendError(
          res,
          `The database table "${table}" does not exist. Please run Prisma migrations (e.g. \`npx prisma migrate dev\` or \`npx prisma db push\`).`,
          500,
          'TABLE_NOT_FOUND',
          env.NODE_ENV === 'development' ? { code: err.code, meta: err.meta } : undefined
        );
        return;
      }
      if (err.code === 'P2003') {
        const field = (err.meta?.field_name as string) || 'foreign key';
        sendError(res, `Foreign key constraint failed on ${field}.`, 400, 'FOREIGN_KEY_CONSTRAINT_FAILED');
        return;
      }
      const message =
        env.NODE_ENV === 'production'
          ? 'Database query error occurred.'
          : `Database query error (${err.code}): ${err.message}`;
      sendError(
        res,
        message,
        400,
        'DATABASE_ERROR',
        env.NODE_ENV === 'development' ? { code: err.code, meta: err.meta } : undefined
      );
      return;
    }

    // Handle Prisma Initialization Errors (e.g. cannot connect to database)
    if (err instanceof Prisma.PrismaClientInitializationError) {
      const message =
        env.NODE_ENV === 'production'
          ? 'Failed to connect to the database.'
          : `Database connection error: ${err.message}`;
      sendError(
        res,
        message,
        500,
        'DATABASE_CONNECTION_ERROR',
        env.NODE_ENV === 'development' ? { errorCode: err.errorCode } : undefined
      );
      return;
    }

    // Handle Prisma Validation Errors
    if (err instanceof Prisma.PrismaClientValidationError) {
      const message =
        env.NODE_ENV === 'production'
          ? 'Database validation error.'
          : `Database validation error: ${err.message}`;
      sendError(res, message, 400, 'DATABASE_VALIDATION_ERROR');
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
  } catch (internalError) {
    console.error('Fatal error in global error middleware', internalError);
    res.status(500).json({
      success: false,
      message: 'Internal server error occurred while processing failure'
    });
  }
}
