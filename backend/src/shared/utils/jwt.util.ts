import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

export interface TokenUserPayload {
  userId: number;
  employeeId: number | null;
  roles: string[];
  permissions: string[];
}

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_access_key_qynova_erp_2026_dev1';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_jwt_refresh_key_qynova_erp_2026_dev1';
const JWT_ACCESS_EXPIRES_IN = (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any;
const JWT_REFRESH_EXPIRES_IN = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any;

export const generateAccessToken = (payload: TokenUserPayload): string => {
  const options: SignOptions = {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const generateRefreshToken = (payload: { userId: number }): string => {
  const options: SignOptions = {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  };
  const tokenPayload = {
    ...payload,
    jti: crypto.randomUUID(),
  };
  return jwt.sign(tokenPayload, JWT_REFRESH_SECRET, options);
};

export const verifyAccessToken = (token: string): TokenUserPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenUserPayload;
};

export const verifyRefreshToken = (token: string): { userId: number } => {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: number };
};
