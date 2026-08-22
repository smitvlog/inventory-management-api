import request from 'supertest';
import { app } from '../src/app';
import { clearDatabase, clearRedis, teardownTestConnections } from './helpers';

describe('Bonus: Auth Rate Limiting', () => {
  beforeAll(async () => {
    await clearDatabase();
    await clearRedis();
  });

  afterAll(async () => {
    await clearDatabase();
    await teardownTestConnections();
  });

  it('should rate limit consecutive login attempts exceeding the limit', async () => {
    // Make 10 login attempts (allowed)
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/auth/login')
        .send({
          email: 'ratelimit@example.com',
          password: 'wrongpassword',
        });
    }

    // 11th attempt should trigger 429 Too Many Requests
    const blockedRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'ratelimit@example.com',
        password: 'wrongpassword',
      });

    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.success).toBe(false);
    expect(blockedRes.body.error).toMatch(/Too many login attempts/i);
  });
});
