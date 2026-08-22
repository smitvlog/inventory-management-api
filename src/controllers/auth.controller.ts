import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../common/response';
import { asyncHandler } from '../utils/async-handler';
import { RegisterInput, LoginInput } from '../validators/auth.validator';

export class AuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as RegisterInput;
    const result = await authService.register(input);

    return sendSuccess(
      res,
      result,
      'User registered successfully',
      201
    );
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const input = req.body as LoginInput;
    const result = await authService.login(input);

    return sendSuccess(
      res,
      result,
      'Login successful',
      200
    );
  });
}

export const authController = new AuthController();
