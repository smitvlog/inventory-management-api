import { Role } from '@prisma/client';
import { userRepository } from '../repositories/user.repository';
import { hashPassword } from '../utils/password';
import { BadRequestError, ConflictError, NotFoundError } from '../common/errors';
import { UserResponse } from '../types/auth.types';
import { CreateUserInput } from '../validators/user.validator';
import { logger } from '../utils/logger';

export class UserService {
  /**
   * Get all registered users (passwords excluded)
   */
  public async getAllUsers(): Promise<UserResponse[]> {
    try {
      const users = await userRepository.findAll();
      return users.map((user) => ({
        id: user.id as string,
        name: user.name as string,
        email: user.email as string,
        role: user.role as Role,
        createdAt: user.createdAt as Date
      }));
    } catch (error) {
      logger.error('Error fetching all users in UserService', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Get user details by ID
   */
  public async getUserById(id: string): Promise<UserResponse> {
    try {
      const user = await userRepository.findById(id);
      if (!user) {
        throw new NotFoundError(`User with ID "${id}" was not found`);
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      };
    } catch (error) {
      logger.error('Error getting user by ID in UserService', {
        id,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Create a new user with specified role
   */
  public async createUser(data: CreateUserInput): Promise<UserResponse> {
    try {
      const existingUser = await userRepository.findByEmail(data.email);
      if (existingUser) {
        throw new ConflictError('A user with this email address already exists');
      }

      const hashedPassword = await hashPassword(data.password);

      const user = await userRepository.create({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role as Role
      });

      logger.info(`User created by owner: ${user.email} (${user.role})`);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      };
    } catch (error) {
      logger.error('Error creating user in UserService', {
        email: data.email,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Update user role
   */
  public async updateUserRole(id: string, role: Role): Promise<UserResponse> {
    try {
      const existing = await userRepository.findById(id);
      if (!existing) {
        throw new NotFoundError(`User with ID "${id}" was not found`);
      }

      const updated = await userRepository.updateRole(id, role);
      logger.info(`User role updated: ${updated.email} -> ${updated.role}`);

      return {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        createdAt: updated.createdAt
      };
    } catch (error) {
      logger.error('Error updating user role in UserService', {
        id,
        role,
        error: (error as Error).message
      });
      throw error;
    }
  }

  /**
   * Delete a user (preventing self-deletion)
   */
  public async deleteUser(id: string, currentUserId: string): Promise<UserResponse> {
    try {
      if (id === currentUserId) {
        throw new BadRequestError('Cannot delete your own account');
      }

      const existing = await userRepository.findById(id);
      if (!existing) {
        throw new NotFoundError(`User with ID "${id}" was not found`);
      }

      const deleted = await userRepository.delete(id);
      logger.info(`User deleted: ${deleted.email} (${deleted.id})`);

      return {
        id: deleted.id,
        name: deleted.name,
        email: deleted.email,
        role: deleted.role,
        createdAt: deleted.createdAt
      };
    } catch (error) {
      logger.error('Error deleting user in UserService', {
        id,
        currentUserId,
        error: (error as Error).message
      });
      throw error;
    }
  }
}

export const userService = new UserService();
