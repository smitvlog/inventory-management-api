import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/auth.types';
import { ForbiddenError, UnauthorizedError } from '../common/errors';

/**
 * Reusable RBAC middleware that restricts route access to specific roles.
 * Must be used after the `authenticate` middleware.
 *
 * @param roles Array of allowed roles (e.g. 'owner', 'manager', 'staff')
 */
export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required before role authorization'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Forbidden: Role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
};
