import { TokenUserPayload } from '../utils/jwt.util';
import 'multer';

declare global {
  namespace Express {
    interface Request {
      user?: TokenUserPayload;
    }
  }
}

export {};
