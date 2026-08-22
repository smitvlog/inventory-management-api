import { Response } from 'express';
import { logger } from '../utils/logger';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operation successful',
  statusCode = 200
): Response {
  try {
    const responsePayload: ApiResponse<T> = {
      success: true,
      message,
      data
    };
    return res.status(statusCode).json(responsePayload);
  } catch (error) {
    logger.error('Error formatting success response', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error formatting response'
    });
  }
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errorCode = 'INTERNAL_SERVER_ERROR',
  details?: unknown
): Response {
  try {
    const responsePayload: ApiResponse = {
      success: false,
      message,
      error: {
        code: errorCode,
        ...(details ? { details } : {})
      }
    };
    return res.status(statusCode).json(responsePayload);
  } catch (error) {
    logger.error('Error formatting error response', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error formatting error response'
    });
  }
}
