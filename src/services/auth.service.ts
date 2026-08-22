import { userRepository, CreateUserData } from '../repositories/user.repository';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { ConflictError, UnauthorizedError } from '../common/errors';
import { UserResponse } from '../types/auth.types';
import { LoginInput } from '../validators/auth.validator';
import { logger } from '../utils/logger';

export interface AuthResult {
  user: UserResponse;
  token: string;
}

export class AuthService {
  public async register(data: CreateUserData): Promise<AuthResult> {
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
        role: data.role
      });

      const token = signToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      logger.info(`User registered successfully: ${user.email} (${user.role})`);

      const userResponse: UserResponse = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      };

      return {
        user: userResponse,
        token
      };
    } catch (error) {
      logger.error('Error registering user in AuthService', { email: data.email, error: (error as Error).message });
      throw error;
    }
  }

  public async login(credentials: LoginInput): Promise<AuthResult> {
    try {
      const user = await userRepository.findByEmail(credentials.email);
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const isPasswordValid = await comparePassword(credentials.password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      const token = signToken({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      logger.info(`User logged in successfully: ${user.email} (${user.role})`);

      const userResponse: UserResponse = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      };

      return {
        user: userResponse,
        token
      };
    } catch (error) {
      logger.error('Error logging in user in AuthService', { email: credentials.email, error: (error as Error).message });
      throw error;
    }
  }
}

export const authService = new AuthService();
