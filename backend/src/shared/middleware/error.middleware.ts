import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // If headers already sent, delegate to Express default handler
  if (res.headersSent) {
    return _next(err);
  }

  // Handle AppError and descendants
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && err.errors.length > 0 ? { errors: err.errors } : {}),
    });
    return;
  }

  // Handle MySQL duplicate key error (ER_DUP_ENTRY)
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    const match = err.sqlMessage?.match(/for key '.*?\.(.*?)'/);
    const key = match ? match[1] : 'field';
    res.status(409).json({
      success: false,
      message: 'Duplicate entry detected',
      errors: [
        {
          field: key,
          message: `${key} already exists in the system`,
        },
      ],
    });
    return;
  }

  // Handle JSON parsing syntax error
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      message: 'Invalid JSON payload in request body',
      errors: [
        {
          field: 'body',
          message: 'Malformed JSON',
        },
      ],
    });
    return;
  }

  // Unhandled internal server error
  console.error('[UNHANDLED_ERROR]:', err);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error',
  });
};
