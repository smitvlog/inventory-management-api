import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { userService } from '../services/user.service';
import { sendSuccess } from '../common/response';
import { CreateUserInput, UpdateUserRoleInput } from '../validators/user.validator';
import { AuthUser } from '../types/auth.types';
import { logger } from '../utils/logger';

export class UserController {
  public async getAllUsers(_req: Request, res: Response): Promise<Response> {
    try {
      const users = await userService.getAllUsers();

      return sendSuccess(
        res,
        users,
        'Users retrieved successfully',
        200
      );
    } catch (error) {
      logger.error('Error in UserController.getAllUsers', { error: (error as Error).message });
      throw error;
    }
  }

  public async getUserById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id as string);

      return sendSuccess(
        res,
        user,
        'User details retrieved successfully',
        200
      );
    } catch (error) {
      logger.error('Error in UserController.getUserById', { error: (error as Error).message });
      throw error;
    }
  }

  public async createUser(req: Request, res: Response): Promise<Response> {
    try {
      const input = req.body as CreateUserInput;
      const createdUser = await userService.createUser(input);

      return sendSuccess(
        res,
        createdUser,
        'User created successfully',
        201
      );
    } catch (error) {
      logger.error('Error in UserController.createUser', { error: (error as Error).message });
      throw error;
    }
  }

  public async updateUserRole(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const input = req.body as UpdateUserRoleInput;
      const updatedUser = await userService.updateUserRole(id as string, input.role as Role);

      return sendSuccess(
        res,
        updatedUser,
        'User role updated successfully',
        200
      );
    } catch (error) {
      logger.error('Error in UserController.updateUserRole', { error: (error as Error).message });
      throw error;
    }
  }

  public async deleteUser(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const currentUser = req.user as AuthUser;
      const deletedUser = await userService.deleteUser(id as string, currentUser.id);

      return sendSuccess(
        res,
        deletedUser,
        'User deleted successfully',
        200
      );
    } catch (error) {
      logger.error('Error in UserController.deleteUser', { error: (error as Error).message });
      throw error;
    }
  }
}

export const userController = new UserController();
