import { TokenUserPayload } from '../utils/jwt.util';

declare global {
  namespace Express {
    interface Request {
      user?: TokenUserPayload;
    }
  }
}

export {};
