import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

function transformInt(val: string): number {
  try {
    return parseInt(val, 10);
  } catch (error) {
    console.error('Error parsing integer from environment variable', error);
    throw error;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(transformInt),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.string().default('6379').transform(transformInt),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters long'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  LOGIN_RATE_LIMIT_WINDOW_MS: z
    .string()
    .default('900000')
    .transform(transformInt),
  LOGIN_RATE_LIMIT_MAX: z
    .string()
    .default('10')
    .transform(transformInt)
});

export type EnvConfig = z.infer<typeof envSchema>;

export function parseEnv(): EnvConfig {
  try {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('❌ Invalid environment variables:', result.error.format());
      process.exit(1);
    }
    return result.data;
  } catch (error) {
    console.error('Unexpected error parsing environment variables', error);
    throw error;
  }
}

export const env: EnvConfig = parseEnv();
