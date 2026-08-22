import { User, Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id }
    });
  }

  async create(data: CreateUserData): Promise<User> {
    return prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        password: data.password,
        role: data.role
      }
    });
  }

  async findAll(select?: Prisma.UserSelect): Promise<Partial<User>[]> {
    return prisma.user.findMany({
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
  }
}

export const userRepository = new UserRepository();
