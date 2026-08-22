import { Router, Request, Response } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { loginRateLimiter } from '../middleware/rate-limit.middleware';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

async function handleRegisterRoute(req: Request, res: Response): Promise<Response> {
  return authController.register(req, res);
}

async function handleLoginRoute(req: Request, res: Response): Promise<Response> {
  return authController.login(req, res);
}

/**
 * @route   POST /auth/register
 * @desc    Register a new user (owner, manager, staff)
 * @access  Public
 */
router.post('/register', validateRequest(registerSchema), asyncHandler(handleRegisterRoute));

/**
 * @route   POST /auth/login
 * @desc    Authenticate user & return JWT token
 * @access  Public
 */
router.post('/login', loginRateLimiter, validateRequest(loginSchema), asyncHandler(handleLoginRoute));

export const authRoutes = router;
