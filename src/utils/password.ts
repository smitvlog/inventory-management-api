import bcrypt from 'bcryptjs';
import { logger } from './logger';

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    logger.error('Error hashing password', { error: (error as Error).message });
    throw error;
  }
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    logger.error('Error comparing password hash', { error: (error as Error).message });
    throw error;
  }
}
