import { Request, Response } from 'express';
import { pushService } from '../../shared/services/push.service';
import { notificationService } from '../../shared/services/notification.service';
import { sendSuccess } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { UnauthorizedError, BadRequestError } from '../../shared/errors/app-error';

export class PushController {
  /**
   * Register or update a device push token
   * POST /api/v1/push/register
   */
  public register = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const { token, platform } = req.body;

    if (!token || typeof token !== 'string') {
      throw new BadRequestError('Device token is required', [
        { field: 'token', message: 'Token is required and must be a valid string' },
      ]);
    }

    const userAgent = req.headers['user-agent'] || undefined;
    const validPlatform = ['web', 'android', 'ios'].includes(platform) ? platform : 'web';

    await pushService.registerDevice(req.user.userId, token, validPlatform, userAgent);

    return sendSuccess(res, { registered: true }, 200, undefined, 'Device registered for push notifications');
  });

  /**
   * Unregister a device push token (e.g. on logout)
   * DELETE /api/v1/push/register
   */
  public unregister = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      throw new BadRequestError('Device token is required', [
        { field: 'token', message: 'Token is required' },
      ]);
    }

    await pushService.unregisterDevice(req.user.userId, token);

    return sendSuccess(res, { unregistered: true }, 200, undefined, 'Device unregistered from push notifications');
  });

  /**
   * Get current user's notification preferences (in_app, push, email per event_type)
   * GET /api/v1/push/preferences
   */
  public getPreferences = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const preferences = await notificationService.getUserPreferences(req.user.userId);
    return sendSuccess(res, preferences, 200);
  });

  /**
   * Update notification preference
   * PUT /api/v1/push/preferences
   */
  public updatePreferences = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const { eventType, email, inApp, push, emailEnabled, inAppEnabled, pushEnabled } = req.body;

    if (!eventType) {
      throw new BadRequestError('eventType is required', [
        { field: 'eventType', message: 'Event type is required' },
      ]);
    }

    const effectiveEmail = email !== undefined ? Boolean(email) : emailEnabled !== undefined ? Boolean(emailEnabled) : undefined;
    const effectiveInApp = inApp !== undefined ? Boolean(inApp) : inAppEnabled !== undefined ? Boolean(inAppEnabled) : undefined;
    const effectivePush = push !== undefined ? Boolean(push) : pushEnabled !== undefined ? Boolean(pushEnabled) : undefined;

    const updated = await notificationService.updateUserPreference(
      req.user.userId,
      eventType,
      effectiveEmail,
      effectiveInApp,
      effectivePush
    );

    return sendSuccess(res, updated, 200, undefined, 'Notification preference updated');
  });

  /**
   * Send test push notification to current user's active devices
   * POST /api/v1/push/test
   */
  public sendTest = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const result = await pushService.sendTestPush(req.user.userId);
    return sendSuccess(res, result, 200, undefined, 'Test notification dispatched');
  });
}

export const pushController = new PushController();
export default pushController;
