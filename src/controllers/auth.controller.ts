import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../common/response';
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { logger } from '../utils/logger';

export class AuthController {
  public async register(req: Request, res: Response): Promise<Response> {
    try {
      const input = req.body as RegisterInput;
      const result = await authService.register(input);

      return sendSuccess(
        res,
        result,
        'User registered successfully',
        201
      );
    } catch (error) {
      logger.error('Error in AuthController.register', { error: (error as Error).message });
      throw error;
    }
  }

  public async login(req: Request, res: Response): Promise<Response> {
    try {
      const input = req.body as LoginInput;
      const result = await authService.login(input);

      return sendSuccess(
        res,
        result,
        'Login successful',
        200
      );
    } catch (error) {
      logger.error('Error in AuthController.login', { error: (error as Error).message });
      throw error;
    }
  }
}

export const authController = new AuthController();
