import request from 'supertest';
import { app } from '../src/app';
import { userRepository } from '../src/repositories/user.repository';
import * as passwordUtils from '../src/utils/password';

describe('Auth Module Suite', () => {
  const mockUser = {
    id: 'user-uuid-1234',
    name: 'Smit Tester',
    email: 'test@example.com',
    password: '$2a$10$hashedpasswordstring',
    role: 'owner' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully and return JWT', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(passwordUtils, 'hashPassword').mockResolvedValue('hashed_pwd');
      jest.spyOn(userRepository, 'create').mockResolvedValue({
        ...mockUser,
        password: 'hashed_pwd'
      });

      const response = await request(app).post('/auth/register').send({
        name: 'Smit Tester',
        email: 'test@example.com',
        password: 'password123',
        role: 'owner'
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.password).toBeUndefined(); // Ensure password is NOT leaked
    });

    it('should reject registration when email already exists (409 Conflict)', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser);

      const response = await request(app).post('/auth/register').send({
        name: 'Smit Tester',
        email: 'test@example.com',
        password: 'password123',
        role: 'manager'
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('CONFLICT');
    });

    it('should fail with validation error for invalid payload (422 Unprocessable Entity)', async () => {
      const response = await request(app).post('/auth/register').send({
        name: '',
        email: 'invalid-email',
        password: '123', // too short
        role: 'invalid-role'
      });

      expect(response.status).toBe(422);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(passwordUtils, 'comparePassword').mockResolvedValue(true);

      const response = await request(app).post('/auth/login').send({
        email: 'test@example.com',
        password: 'password123'
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.role).toBe('owner');
    });

    it('should reject login with wrong password (401 Unauthorized)', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(passwordUtils, 'comparePassword').mockResolvedValue(false);

      const response = await request(app).post('/auth/login').send({
        email: 'test@example.com',
        password: 'wrongpassword'
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('UNAUTHORIZED');
    });
  });
});
