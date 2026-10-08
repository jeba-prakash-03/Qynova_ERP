import { Request, Response } from 'express';
import { notificationsRepository } from './notifications.repository';
import { sendSuccess } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { UnauthorizedError } from '../../shared/errors/app-error';

export class NotificationsController {
  public getAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const limit = Number(req.query.limit) || 20;
    const notifications = await notificationsRepository.findByUserId(req.user.userId, limit);
    return sendSuccess(res, notifications, 200);
  });

  public getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const count = await notificationsRepository.getUnreadCount(req.user.userId);
    return sendSuccess(res, { count }, 200);
  });

  public markAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    const id = Number(req.params.id);
    await notificationsRepository.markAsRead(id, req.user.userId);
    return sendSuccess(res, { read: true }, 200, undefined, 'Notification marked as read');
  });

  public markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError();
    await notificationsRepository.markAllAsRead(req.user.userId);
    return sendSuccess(res, { readAll: true }, 200, undefined, 'All notifications marked as read');
  });
}

export const notificationsController = new NotificationsController();
export default notificationsController;
