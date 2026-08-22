import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: unknown;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Operation successful',
  statusCode = 200
): Response => {
  const responsePayload: ApiResponse<T> = {
    success: true,
    message,
    data
  };
  return res.status(statusCode).json(responsePayload);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errorCode = 'INTERNAL_SERVER_ERROR',
  details?: unknown
): Response => {
  const responsePayload: ApiResponse = {
    success: false,
    message,
    error: {
      code: errorCode,
      ...(details ? { details } : {})
    }
  };
  return res.status(statusCode).json(responsePayload);
};
