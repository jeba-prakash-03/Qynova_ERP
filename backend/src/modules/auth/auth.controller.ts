import { Request, Response } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { UnauthorizedError } from '../../shared/errors/app-error';

export class AuthController {
  public login = asyncHandler(async (req: Request, res: Response) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];
    const result = await authService.login(req.body, ip, userAgent);
    return sendSuccess(res, result, 200, undefined, 'Login successful');
  });

  public refresh = asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.refreshTokens(req.body.refreshToken);
    return sendSuccess(res, result, 200, undefined, 'Tokens refreshed successfully');
  });

  public logout = asyncHandler(async (req: Request, res: Response) => {
    await authService.logout(req.body.refreshToken);
    return sendSuccess(res, { loggedOut: true }, 200, undefined, 'Logout successful');
  });

  public changePassword = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];
    await authService.changePassword(req.user.userId, req.body, ip, userAgent);
    return sendSuccess(res, { updated: true }, 200, undefined, 'Password changed successfully');
  });

  public forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    await authService.forgotPassword(req.body.email);
    return sendSuccess(
      res,
      { sent: true },
      200,
      undefined,
      'If your email is registered, password reset instructions have been sent.'
    );
  });

  public resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];
    await authService.resetPassword(req.body, ip, userAgent);
    return sendSuccess(res, { reset: true }, 200, undefined, 'Password has been reset successfully');
  });

  public me = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    const user = await authService.getCurrentUser(req.user.userId);
    return sendSuccess(res, user, 200);
  });
}

export const authController = new AuthController();
export default authController;
