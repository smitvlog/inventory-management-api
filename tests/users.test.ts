import request from 'supertest';
import { app } from '../src/app';
import { signToken } from '../src/utils/jwt';
import { userRepository } from '../src/repositories/user.repository';
import * as passwordUtils from '../src/utils/password';

describe('User Management & RBAC Suite (/users)', () => {
  const ownerUser = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Owner User',
    email: 'owner@test.com',
    role: 'owner' as const,
    password: '$2a$10$hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const managerUser = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Manager User',
    email: 'manager@test.com',
    role: 'manager' as const,
    password: '$2a$10$hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const staffUser = {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Staff User',
    email: 'staff@test.com',
    role: 'staff' as const,
    password: '$2a$10$hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const targetUser = {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Target User',
    email: 'target@test.com',
    role: 'staff' as const,
    password: '$2a$10$hashedpassword',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  let ownerToken: string;
  let managerToken: string;
  let staffToken: string;

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(userRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === ownerUser.id) return ownerUser;
      if (id === managerUser.id) return managerUser;
      if (id === staffUser.id) return staffUser;
      if (id === targetUser.id) return targetUser;
      return null;
    });

    ownerToken = signToken({ userId: ownerUser.id, email: ownerUser.email, role: 'owner' });
    managerToken = signToken({ userId: managerUser.id, email: managerUser.email, role: 'manager' });
    staffToken = signToken({ userId: staffUser.id, email: staffUser.email, role: 'staff' });
  });

  describe('Authorization & RBAC Enforcement on /users', () => {
    it('should return 401 Unauthorized when request lacks Bearer token', async () => {
      const response = await request(app).get('/users');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 Forbidden when Manager tries to access /users', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${managerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('FORBIDDEN');
    });

    it('should return 403 Forbidden when Staff tries to access /users', async () => {
      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('FORBIDDEN');
    });

    it('should allow Owner to access /users', async () => {
      jest.spyOn(userRepository, 'findAll').mockResolvedValue([ownerUser, managerUser, staffUser]);

      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user details by ID for Owner', async () => {
      const response = await request(app)
        .get(`/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(targetUser.id);
      expect(response.body.data.email).toBe(targetUser.email);
    });

    it('should return 404 Not Found when user does not exist', async () => {
      const response = await request(app)
        .get('/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /users', () => {
    it('should allow Owner to create a new user with specific role', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(passwordUtils, 'hashPassword').mockResolvedValue('hashed_pwd');
      jest.spyOn(userRepository, 'create').mockResolvedValue({
        id: '55555555-5555-5555-5555-555555555555',
        name: 'New Manager',
        email: 'newmanager@test.com',
        password: 'hashed_pwd',
        role: 'manager',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'New Manager',
          email: 'newmanager@test.com',
          password: 'password123',
          role: 'manager'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('newmanager@test.com');
      expect(response.body.data.role).toBe('manager');
    });

    it('should return 409 Conflict if email already exists', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(targetUser);

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Target User',
          email: 'target@test.com',
          password: 'password123',
          role: 'staff'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('CONFLICT');
    });
  });

  describe('PATCH /users/:id/role', () => {
    it('should allow Owner to update user role', async () => {
      const updatedTarget = { ...targetUser, role: 'manager' as const };
      jest.spyOn(userRepository, 'updateRole').mockResolvedValue(updatedTarget);

      const response = await request(app)
        .patch(`/users/${targetUser.id}/role`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'manager' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('manager');
    });
  });

  describe('DELETE /users/:id', () => {
    it('should reject deleting own account with 400 Bad Request', async () => {
      const response = await request(app)
        .delete(`/users/${ownerUser.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error?.code).toBe('BAD_REQUEST');
      expect(response.body.message).toContain('Cannot delete your own account');
    });

    it('should allow Owner to delete another user', async () => {
      jest.spyOn(userRepository, 'delete').mockResolvedValue(targetUser);

      const response = await request(app)
        .delete(`/users/${targetUser.id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(targetUser.id);
    });
  });
});
