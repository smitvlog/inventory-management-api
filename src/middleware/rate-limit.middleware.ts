import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { sendError } from '../common/response';

export const loginRateLimiter = rateLimit({
  windowMs: env.LOGIN_RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      'Too many login attempts. Please try again later.',
      429,
      'TOO_MANY_REQUESTS'
    );
  }
});
