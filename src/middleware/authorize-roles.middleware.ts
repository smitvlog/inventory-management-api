import { Request, Response, NextFunction, RequestHandler } from 'express';
import { UserRole } from '../types/auth.types';
import { ForbiddenError, UnauthorizedError } from '../common/errors';
import { logger } from '../utils/logger';

/**
 * Reusable RBAC middleware that restricts route access to specific roles.
 * Must be used after the `authenticate` middleware.
 *
 * @param roles Array of allowed roles (e.g. 'owner', 'manager', 'staff')
 */
export function authorizeRoles(...roles: UserRole[]): RequestHandler {
  return function roleCheckMiddleware(req: Request, _res: Response, next: NextFunction): void {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required before role authorization');
      }

      if (!roles.includes(req.user.role)) {
        logger.warn(`RBAC access denied for user ${req.user.email} with role '${req.user.role}' on ${req.method} ${req.originalUrl}`);
        throw new ForbiddenError(
          `Forbidden: Role '${req.user.role}' is not authorized to access this resource`
        );
      }

      next();
    } catch (error) {
      logger.warn('Role authorization failed', { error: (error as Error).message });
      next(error);
    }
  };
}
