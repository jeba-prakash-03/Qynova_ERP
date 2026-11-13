import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { UnauthorizedError } from '../errors/app-error';
import db from '../../db/knex';

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    // Only allow ?token= query param on explicit file download / export routes
    const isDownloadRoute = req.path.includes('/download') || req.path.includes('/export');
    if (isDownloadRoute) {
      token = req.query.token;
    }
  }

  if (!token) {
    return next(new UnauthorizedError('Authorization token required'));
  }

  try {
    const payload = verifyAccessToken(token);

    // Verify user in DB: check status and token_version
    const user = await db('users')
      .where({ id: payload.userId })
      .whereNull('deleted_at')
      .select('status', 'token_version')
      .first();

    if (!user) {
      return next(new UnauthorizedError('User account not found'));
    }

    if (user.status !== 'active') {
      return next(new UnauthorizedError('Account is disabled or inactive'));
    }

    const currentVersion = Number(user.token_version || 0);
    const tokenVersion = Number(payload.tokenVersion || 0);
    if (tokenVersion !== currentVersion) {
      return next(new UnauthorizedError('Session has been invalidated due to account or role changes'));
    }

    req.user = payload;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token expired'));
    }
    if (error instanceof UnauthorizedError) {
      return next(error);
    }
    return next(new UnauthorizedError('Invalid authorization token'));
  }
};
