// Test setup file
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/smit_inventory_test?schema=public';
process.env.JWT_SECRET = 'test_super_secret_jwt_key_smit_inventory_2026';
process.env.JWT_EXPIRES_IN = '1h';
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '6379';
process.env.LOGIN_RATE_LIMIT_MAX = '100';

// Mock BullMQ Queue and Worker to prevent hanging connections during unit tests
jest.mock('bullmq', () => {
  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({ id: 'mock-job-1' }),
      close: jest.fn().mockResolvedValue(undefined)
    })),
    Worker: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined)
    }))
  };
});

// Suppress console logs during testing
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'debug').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});
