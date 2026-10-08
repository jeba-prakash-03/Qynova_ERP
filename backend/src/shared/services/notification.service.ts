import db from '../../db/knex';

export interface NotificationNotifyParams {
  eventKey: string;
  userIds: number | number[];
  type: 'info' | 'warning' | 'success' | 'danger';
  title: string;
  message: string;
  link?: string | null;
}

export class NotificationService {
  public async notify(params: NotificationNotifyParams): Promise<void> {
    const targetUserIds = Array.isArray(params.userIds) ? params.userIds : [params.userIds];

    for (const userId of targetUserIds) {
      const userSpecificEventKey = targetUserIds.length > 1
        ? `${params.eventKey}:user:${userId}`
        : params.eventKey;

      try {
        // Use Knex insert or ignore on duplicate event_key
        const existing = await db('notifications').where({ event_key: userSpecificEventKey }).first();
        if (existing) {
          // Ignore duplicate notifications gracefully
          continue;
        }

        await db('notifications').insert({
          user_id: userId,
          event_key: userSpecificEventKey,
          type: params.type,
          title: params.title,
          message: params.message,
          link: params.link || null,
          is_read: false,
        });
      } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
          // Gracefully ignore duplicate
          continue;
        }
        console.error('[NOTIFICATION_ERROR] Failed to send notification:', error);
      }
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;
