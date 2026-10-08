import { Request, Response, NextFunction } from 'express';
import db from '../../db/knex';
import { BadRequestError } from '../errors/app-error';

export const checkLoginRateLimit = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const email = req.body?.email?.toLowerCase().trim();
  if (!email) {
    return next();
  }

  const record = await db('login_attempts')
    .where({ email })
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

export const recordFailedLoginAttempt = async (email: string): Promise<void> => {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await db('login_attempts').where({ email: normalizedEmail }).first();

  if (!existing) {
    await db('login_attempts').insert({
      email: normalizedEmail,
      attempts: 1,
      locked_until: null,
    });
    return;
  }

  const newAttempts = existing.attempts + 1;
  if (newAttempts >= 5) {
    // Lock for 15 minutes in DB timezone
    await db('login_attempts').where({ email: normalizedEmail }).update({
      attempts: newAttempts,
      locked_until: db.raw('DATE_ADD(NOW(), INTERVAL 15 MINUTE)'),
    });
  } else {
    await db('login_attempts').where({ email: normalizedEmail }).update({
      attempts: newAttempts,
    });
  }
};

export const resetLoginAttempts = async (email: string): Promise<void> => {
  const normalizedEmail = email.toLowerCase().trim();
  await db('login_attempts').where({ email: normalizedEmail }).update({
    attempts: 0,
    locked_until: null,
  });
};
