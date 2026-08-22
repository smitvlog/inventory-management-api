import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AnyZodObject, ZodError, ZodIssue } from 'zod';
import { ValidationError } from '../common/errors';
import { logger } from '../utils/logger';

function formatZodIssue(err: ZodIssue): { field: string; message: string } {
  try {
    return {
      field: err.path.join('.').replace(/^(body|query|params)\./, ''),
      message: err.message
    };
  } catch (error) {
    return {
      field: 'unknown',
      message: err.message
    };
  }
}

export function validateRequest(schema: AnyZodObject): RequestHandler {
  return function requestValidationMiddleware(
    req: Request,
    _res: Response,
    next: NextFunction
  ): void {
    validateRequestInternal(schema, req, _res, next).catch(function handleValidationCatch(error: Error): void {
      logger.error('Error in requestValidationMiddleware', { error: error.message });
      next(error);
    });
  };
}

async function validateRequestInternal(
  schema: AnyZodObject,
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params
    });

    req.body = parsed.body ?? req.body;
    req.query = parsed.query ?? req.query;
    req.params = parsed.params ?? req.params;

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map(formatZodIssue);
      logger.warn('Validation error on request', { path: req.originalUrl, errors: formattedErrors });
      next(new ValidationError('Request validation failed', formattedErrors));
    } else {
      logger.error('Unexpected error during request validation', { error: (error as Error).message });
      next(error);
    }
  }
}
