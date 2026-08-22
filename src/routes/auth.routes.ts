import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { loginRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

/**
 * @route   POST /auth/register
 * @desc    Register a new user (owner, manager, staff)
 * @access  Public
 */
router.post('/register', validateRequest(registerSchema), authController.register);

/**
 * @route   POST /auth/login
 * @desc    Authenticate user & return JWT token
 * @access  Public
 */
router.post('/login', loginRateLimiter, validateRequest(loginSchema), authController.login);

export const authRoutes = router;
