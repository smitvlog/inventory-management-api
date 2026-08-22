import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { UnauthorizedError } from '../common/errors';
import { userRepository } from '../repositories/user.repository';
import { logger } from '../utils/logger';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or malformed');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    const payload = verifyToken(token);

    // Verify user still exists in database
    const user = await userRepository.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedError('User associated with this token no longer exists');
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    logger.warn('Authentication middleware failed', { error: (error as Error).message });
    next(error);
  }
}
