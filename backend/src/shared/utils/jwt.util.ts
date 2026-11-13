import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

export interface TokenUserPayload {
  userId: number;
  employeeId: number | null;
  roles: string[];
  permissions: string[];
  tokenVersion?: number;
}

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      'FATAL: Security check failed. Environment variable JWT_SECRET must be defined and at least 32 characters long.'
    );
  }
  return secret;
};

export const getJwtRefreshSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      'FATAL: Security check failed. Environment variable JWT_REFRESH_SECRET must be defined and at least 32 characters long.'
    );
  }
  return secret;
};

// Fail fast on module load if secrets are missing or weak in every environment
getJwtSecret();
getJwtRefreshSecret();

/**
 * Parses duration strings like '7d', '15m', '1h' to milliseconds
 */
export function parseDurationToMs(durationStr: string): number {
  const match = durationStr.match(/^(\d+)([smhd])$/);
  if (!match) {
    const num = parseInt(durationStr, 10);
    return isNaN(num) ? 7 * 24 * 60 * 60 * 1000 : num;
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return value * 1000;
  }
}

export const generateAccessToken = (payload: TokenUserPayload): string => {
  const secret = getJwtSecret();
  const expiresIn = (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any;
  const options: SignOptions = {
    expiresIn,
  };
  return jwt.sign(payload, secret, options);
};

export const generateRefreshToken = (payload: { userId: number }): string => {
  const refreshSecret = getJwtRefreshSecret();
  const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any;
  const options: SignOptions = {
    expiresIn,
  };
  const tokenPayload = {
    ...payload,
    jti: crypto.randomUUID(),
  };
  return jwt.sign(tokenPayload, refreshSecret, options);
};

export const verifyAccessToken = (token: string): TokenUserPayload => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret) as TokenUserPayload;
};

export const verifyRefreshToken = (token: string): { userId: number } => {
  const refreshSecret = getJwtRefreshSecret();
  return jwt.verify(token, refreshSecret) as { userId: number };
};
