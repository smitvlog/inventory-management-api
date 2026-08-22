import request from 'supertest';
import { app } from '../src/app';
import { clearDatabase, clearRedis, teardownTestConnections } from './helpers';

describe('Module 1: Authentication API (/auth)', () => {
  beforeAll(async () => {
    await clearDatabase();
    await clearRedis();
  });

  afterAll(async () => {
    await clearDatabase();
    await teardownTestConnections();
  });

  describe('POST /auth/register', () => {
    it('should successfully register a new Owner and return a JWT containing the role', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Owner Admin',
          email: 'owner.test@example.com',
          password: 'Password123!',
          role: 'owner',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe('owner.test@example.com');
      expect(response.body.data.user.role).toBe('OWNER');
      expect(response.body.data.user.password).toBeUndefined(); // Password must never be leaked
      expect(response.body.data.token).toBeDefined();
    });

    it('should successfully register a Manager and Staff user', async () => {
      const managerRes = await request(app)
        .post('/auth/register')
        .send({
          name: 'Manager Bob',
          email: 'manager.test@example.com',
          password: 'Password123!',
          role: 'manager',
        });

      expect(managerRes.status).toBe(201);
      expect(managerRes.body.data.user.role).toBe('MANAGER');

      const staffRes = await request(app)
        .post('/auth/register')
        .send({
          name: 'Staff Charlie',
          email: 'staff.test@example.com',
          password: 'Password123!',
          role: 'staff',
        });

      expect(staffRes.status).toBe(201);
      expect(staffRes.body.data.user.role).toBe('STAFF');
    });

    it('should reject registration if email is already taken with 409 Conflict', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Duplicate Owner',
          email: 'owner.test@example.com',
          password: 'Password123!',
          role: 'owner',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid role with 400 Validation Error', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Hacker User',
          email: 'hacker@example.com',
          password: 'Password123!',
          role: 'superadmin',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject weak password (less than 6 chars) with 400', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          name: 'Weak Pass',
          email: 'weak@example.com',
          password: '123',
          role: 'staff',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should successfully log in an existing user and return a JWT', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'owner.test@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('owner.test@example.com');
      expect(response.body.data.token).toBeDefined();
    });

    it('should reject login with wrong password (401 Unauthorized)', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'owner.test@example.com',
          password: 'WrongPassword!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject login with non-existent email (401 Unauthorized)', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        });

      expect(response.status).toBe(401);
    });
  });
});
