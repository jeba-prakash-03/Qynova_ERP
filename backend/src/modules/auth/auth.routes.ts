import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../shared/middleware/validate.middleware';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { checkLoginRateLimit } from '../../shared/middleware/rate-limit.middleware';
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
} from './auth.schema';

const router = Router();

router.post(
  '/login',
  validate({ body: loginSchema }),
  checkLoginRateLimit,
  authController.login
);

router.post(
  '/refresh',
  validate({ body: refreshTokenSchema }),
  authController.refresh
);

router.post(
  '/logout',
  authController.logout
);

router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  authController.changePassword
);

router.post(
  '/forgot-password',
  validate({ body: forgotPasswordSchema }),
  authController.forgotPassword
);

router.get(
  '/me',
  authenticate,
  authController.me
);

export default router;
