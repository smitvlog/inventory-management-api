import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { sendError } from '../common/response';
import { logger } from '../utils/logger';

function handleRateLimitExceeded(req: Request, res: Response): void {
  try {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.method} ${req.originalUrl}`);
    sendError(
      res,
      'Too many login attempts. Please try again later.',
      429,
      'TOO_MANY_REQUESTS'
    );
  } catch (error) {
    logger.error('Error handling rate limit response', { error: (error as Error).message });
    res.status(429).json({ success: false, message: 'Too many requests' });
  }
}

export const loginRateLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: handleRateLimitExceeded
});
