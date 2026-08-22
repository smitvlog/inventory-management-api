import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload } from '../types/auth.types';
import { UnauthorizedError } from '../common/errors';
import { logger } from './logger';

export function signToken(payload: JwtPayload): string {
  try {
    const options: SignOptions = {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
    };
    const token = jwt.sign(payload, env.JWT_SECRET, options);
    return token;
  } catch (error) {
    logger.error('Error signing JWT token', { error: (error as Error).message });
    throw error;
  }
}

export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    logger.error('Error verifying JWT token', { error: (error as Error).message });
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token has expired. Please log in again.');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid authentication token.');
    }
    throw new UnauthorizedError('Authentication failed.');
  }
}
