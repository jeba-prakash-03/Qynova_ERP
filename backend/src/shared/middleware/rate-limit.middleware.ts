import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import db from '../../db/knex';
import { BadRequestError } from '../errors/app-error';

export const getClientIp = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    '127.0.0.1'
  );
};

export const checkLoginRateLimit = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const email = req.body?.email?.toLowerCase().trim();
  const ip = getClientIp(req);
  if (!email) {
    return next();
  }

  const record = await db('login_attempts')
    .where({ email, ip })
    .where('locked_until', '>', db.fn.now())
    .first();

  if (record) {
    return next(
      new BadRequestError('Account is temporarily locked due to too many failed attempts', [
        {
          field: 'email',
          message: 'Account is temporarily locked. Please try again after 15 minutes.',
        },
      ])
    );
  }

  next();
};

export const recordFailedLoginAttempt = async (
  email: string,
  ip: string = '127.0.0.1'
): Promise<void> => {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await db('login_attempts')
    .where({ email: normalizedEmail, ip })
    .first();

  if (!existing) {
    await db('login_attempts').insert({
      email: normalizedEmail,
      ip,
      attempts: 1,
      locked_until: null,
    });
    return;
  }

  const newAttempts = existing.attempts + 1;
  if (newAttempts >= 5) {
    // Lock for 15 minutes in DB timezone
    await db('login_attempts')
      .where({ email: normalizedEmail, ip })
      .update({
        attempts: newAttempts,
        locked_until: db.raw('DATE_ADD(NOW(), INTERVAL 15 MINUTE)'),
      });
  } else {
    await db('login_attempts')
      .where({ email: normalizedEmail, ip })
      .update({
        attempts: newAttempts,
      });
  }
};

export const resetLoginAttempts = async (
  email: string,
  ip: string = '127.0.0.1'
): Promise<void> => {
  const normalizedEmail = email.toLowerCase().trim();
  await db('login_attempts')
    .where({ email: normalizedEmail, ip })
    .update({
      attempts: 0,
      locked_until: null,
    });
};

/** Rate limiting per IP and per email for /forgot-password */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email?.toLowerCase().trim() || '';
    const ip = getClientIp(req);
    return `${ip}:${email}`;
  },
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after 15 minutes.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/** Rate limiting for /reset-password */
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again after 15 minutes.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/** Rate limiting for /refresh */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: {
    success: false,
    message: 'Too many token refresh requests. Please try again after 15 minutes.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});
