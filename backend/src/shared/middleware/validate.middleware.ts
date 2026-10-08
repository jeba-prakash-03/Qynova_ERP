import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError, FieldError } from '../errors/app-error';

interface ValidationTargets {
  body?: ZodSchema<any>;
  query?: ZodSchema<any>;
  params?: ZodSchema<any>;
}

export const validate = (schemas: ValidationTargets) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: FieldError[] = error.errors.map((err) => ({
          field: err.path.length > 0 ? err.path.join('.') : 'root',
          message: err.message,
        }));
        next(new BadRequestError('Validation failed', fieldErrors));
      } else {
        next(error);
      }
    }
  };
};
