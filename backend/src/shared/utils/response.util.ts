import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  message?: string;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: PaginationMeta,
  message?: string
): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  if (message) {
    payload.message = message;
  }

  return res.status(statusCode).json(payload);
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message?: string
): Response => {
  return sendSuccess(res, data, 201, undefined, message);
};
