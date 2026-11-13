import { Request, Response } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { UnauthorizedError } from '../../shared/errors/app-error';

export class AuthController {
  private setRefreshTokenCookie(res: Response, token: string): void {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days matching JWT_REFRESH_EXPIRES_IN
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
    });
  }

  public login = asyncHandler(async (req: Request, res: Response) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const userAgent = req.headers['user-agent'];
    const result = await authService.login(req.body, ip, userAgent);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return sendSuccess(res, result, 200, undefined, 'Login successful');
  });

  public refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }
    const result = await authService.refreshTokens(refreshToken);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return sendSuccess(res, result, 200, undefined, 'Tokens refreshed successfully');
  });

  public logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch {
        // Ignore errors if token was already revoked or invalid
      }
    }
    this.clearRefreshTokenCookie(res);
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
      'Password reset instructions have been sent to your email.'
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
