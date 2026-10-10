import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error';
import { SYSTEM_ROLES } from '../constants/roles';

export const requirePermission = (permission: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('User authentication required');
    }

    // Admins bypass granular permission checks
    if (req.user.roles.includes(SYSTEM_ROLES.ADMIN)) {
      return next();
    }

    if (!req.user.permissions.includes(permission)) {
      throw new ForbiddenError(`Permission '${permission}' required`);
    }

    next();
  };
};

export const requireAnyPermission = (...permissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('User authentication required');
    }

    // Admins bypass granular permission checks
    if (req.user.roles.includes(SYSTEM_ROLES.ADMIN)) {
      return next();
    }

    const hasAny = permissions.some((p) => req.user!.permissions.includes(p));
    if (!hasAny) {
      throw new ForbiddenError(`One of permissions [${permissions.join(', ')}] required`);
    }

    next();
  };
};

export const requireEmployee = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    throw new UnauthorizedError('User authentication required');
  }

  if (req.user.employeeId === null || req.user.employeeId === undefined) {
    throw new ForbiddenError('This action requires an active employee profile linked to your user account');
  }

  next();
};
