import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for sensitive authentication endpoints (e.g. POST /auth/login)
 * Limits consecutive attempts to prevent brute-force attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Max 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts from this IP, please try again after 15 minutes',
  },
});
