import { User, Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export class UserRepository {
  public async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() }
      });
      return user;
    } catch (error) {
      logger.error('Error finding user by email', { email, error: (error as Error).message });
      throw error;
    }
  }

  public async findById(id: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id }
      });
      return user;
    } catch (error) {
      logger.error('Error finding user by id', { id, error: (error as Error).message });
      throw error;
    }
  }

  public async create(data: CreateUserData): Promise<User> {
    try {
      const createdUser = await prisma.user.create({
        data: {
          name: data.name.trim(),
          email: data.email.toLowerCase().trim(),
          password: data.password,
          role: data.role
        }
      });
      return createdUser;
    } catch (error) {
      logger.error('Error creating user in database', { email: data.email, error: (error as Error).message });
      throw error;
    }
  }

  public async findAll(select?: Prisma.UserSelect): Promise<Partial<User>[]> {
    try {
      const users = await prisma.user.findMany({
        select: select || {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return users;
    } catch (error) {
      logger.error('Error finding all users in database', { error: (error as Error).message });
      throw error;
    }
  }
  public async updateRole(id: string, role: Role): Promise<User> {
    try {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { role }
      });
      return updatedUser;
    } catch (error) {
      logger.error('Error updating user role in database', { id, role, error: (error as Error).message });
      throw error;
    }
  }

  public async delete(id: string): Promise<User> {
    try {
      const deletedUser = await prisma.user.delete({
        where: { id }
      });
      return deletedUser;
    } catch (error) {
      logger.error('Error deleting user from database', { id, error: (error as Error).message });
      throw error;
    }
  }
}

export const userRepository = new UserRepository();
