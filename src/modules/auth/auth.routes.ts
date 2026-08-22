import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middleware/validate.middleware';
import { authRateLimiter } from '../../middleware/rateLimit.middleware';
import { registerSchema, loginSchema } from './auth.schema';

const router = Router();

// Public: POST /auth/register
router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  AuthController.register
);

// Public: POST /auth/login (with brute-force rate limiter)
router.post(
  '/login',
  authRateLimiter,
  validateRequest({ body: loginSchema }),
  AuthController.login
);

export const authRouter = router;
