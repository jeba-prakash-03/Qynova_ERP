import db from '../../db/knex';
import { admin, getIsPushEnabled } from '../firebase';

export interface PushNotificationPayload {
  title: string;
  body: string;
  link?: string | null;
  notificationId?: string | number | null;
  eventType: string;
}

export class PushService {
  /**
   * Register or update a device token for a user
   */
  public async registerDevice(
    userId: number,
    token: string,
    platform: 'web' | 'android' | 'ios' = 'web',
    userAgent?: string
  ): Promise<void> {
    if (!token || typeof token !== 'string') {
      return;
    }

    const existing = await db('device_tokens').where({ token }).first();
    if (existing) {
      await db('device_tokens')
        .where({ id: existing.id })
        .update({
          user_id: userId,
          platform,
          user_agent: userAgent || null,
          last_used_at: db.fn.now(),
          deleted_at: null, // restore if previously soft-deleted
        });
    } else {
      await db('device_tokens').insert({
        user_id: userId,
        token,
        platform,
        user_agent: userAgent || null,
        last_used_at: db.fn.now(),
        deleted_at: null,
      });
    }
  }

  /**
   * Soft-delete a device token (e.g. on logout)
   */
  public async unregisterDevice(userId: number, token: string): Promise<void> {
    if (!token) return;
    await db('device_tokens')
      .where({ token, user_id: userId })
      .update({ deleted_at: db.fn.now() });
  }

  /**
   * Send push notification to target users asynchronously
   */
  public async sendPushToUsers(
    userIds: number | number[],
    payload: PushNotificationPayload
  ): Promise<void> {
    if (!getIsPushEnabled()) {
      return;
    }

    const targetUserIds = Array.isArray(userIds) ? userIds : [userIds];
    if (targetUserIds.length === 0) return;

    try {
      // 1. Filter out users who have disabled push notifications for this eventType
      const preferences = await db('notification_preferences')
        .whereIn('user_id', targetUserIds)
        .where({ event_type: payload.eventType });

      const disabledUserIds = new Set(
        preferences
          .filter((p) => p.push_enabled === 0 || p.push_enabled === false)
          .map((p) => Number(p.user_id))
      );

      const eligibleUserIds = targetUserIds.filter((id) => !disabledUserIds.has(id));
      if (eligibleUserIds.length === 0) return;

      // 2. Fetch all active device tokens for eligible users
      const tokenRows = await db('device_tokens')
        .whereIn('user_id', eligibleUserIds)
        .whereNull('deleted_at')
        .select('id', 'token');

      if (tokenRows.length === 0) return;

      const tokens = tokenRows.map((r) => r.token);

      // 3. Send in batches of max 500 tokens (FCM multicast limit)
      const batchSize = 500;
      for (let i = 0; i < tokens.length; i += batchSize) {
        const batchTokens = tokens.slice(i, i + batchSize);

        const multicastMessage: admin.messaging.MulticastMessage = {
          tokens: batchTokens,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: {
            link: payload.link || '',
            notificationId: payload.notificationId ? String(payload.notificationId) : '',
            eventType: payload.eventType,
          },
          webpush: {
            fcmOptions: {
              link: payload.link || '/',
            },
          },
        };

        const response = await admin.messaging().sendEachForMulticast(multicastMessage);

        // 4. Handle FCM errors: soft-delete invalid or unregistered tokens
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, index) => {
          if (!resp.success && resp.error) {
            const errorCode = resp.error.code;
            if (
              errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-argument' ||
              errorCode === 'messaging/invalid-registration-token'
            ) {
              invalidTokens.push(batchTokens[index]);
            }
          }
        });

        if (invalidTokens.length > 0) {
          await db('device_tokens')
            .whereIn('token', invalidTokens)
            .update({ deleted_at: db.fn.now() });
        }
      }
    } catch (error: any) {
      // Push failure must never crash or bubble up to the caller
      console.warn('[PUSH_ERROR] Failed to dispatch push notifications:', error.message);
    }
  }

  /**
   * Send a test push notification to a user's active devices
   */
  public async sendTestPush(userId: number): Promise<{ sent: number; activeTokens: number }> {
    const tokens = await db('device_tokens')
      .where({ user_id: userId })
      .whereNull('deleted_at')
      .select('token');

    if (tokens.length === 0) {
      return { sent: 0, activeTokens: 0 };
    }

    if (!getIsPushEnabled()) {
      return { sent: 0, activeTokens: tokens.length };
    }

    await this.sendPushToUsers(userId, {
      title: 'Qynova ERP Test Notification',
      body: 'Web push notifications are working successfully on this device!',
      link: '/settings/notifications',
      eventType: 'test',
    });

    return { sent: tokens.length, activeTokens: tokens.length };
  }
}

export const pushService = new PushService();
export default pushService;
