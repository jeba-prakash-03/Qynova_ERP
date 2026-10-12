import db from '../../db/knex';
import emailService from './email.service';

export interface NotificationNotifyParams {
  eventKey: string;
  userIds: number | number[];
  type: 'info' | 'warning' | 'success' | 'danger';
  title: string;
  message: string;
  link?: string | null;
  emailDetails?: {
    eventType: string;
    subject: string;
    html: string;
  };
}

export class NotificationService {
  public async notify(params: NotificationNotifyParams): Promise<void> {
    const targetUserIds = Array.isArray(params.userIds) ? params.userIds : [params.userIds];

    for (const userId of targetUserIds) {
      const userSpecificEventKey =
        targetUserIds.length > 1 ? `${params.eventKey}:user:${userId}` : params.eventKey;

      // 1. Check user notification preferences if specified
      let inAppEnabled = true;
      let emailEnabled = true;

      if (params.emailDetails?.eventType) {
        const pref = await db('notification_preferences')
          .where({ user_id: userId, event_type: params.emailDetails.eventType })
          .first();

        if (pref) {
          inAppEnabled = Boolean(pref.in_app_enabled);
          emailEnabled = Boolean(pref.email_enabled);
        }
      }

      // 2. Deliver In-App Notification if enabled
      if (inAppEnabled) {
        try {
          const existing = await db('notifications').where({ event_key: userSpecificEventKey }).first();
          if (!existing) {
            await db('notifications').insert({
              user_id: userId,
              event_key: userSpecificEventKey,
              type: params.type,
              title: params.title,
              message: params.message,
              link: params.link || null,
              is_read: false,
            });
          }
        } catch (error: any) {
          if (error.code !== 'ER_DUP_ENTRY' && error.errno !== 1062) {
            console.error('[NOTIFICATION_ERROR] Failed to save in-app notification:', error);
          }
        }
      }

      // 3. Queue Email if enabled and email details provided
      if (emailEnabled && params.emailDetails) {
        try {
          const user = await db('users').where({ id: userId }).first();
          if (user && user.email) {
            await emailService.queueEmail({
              to: user.email,
              subject: params.emailDetails.subject,
              html: params.emailDetails.html,
              eventKey: `${userSpecificEventKey}:email`,
            });
          }
        } catch (error) {
          console.error('[NOTIFICATION_EMAIL_ERROR] Failed to queue notification email:', error);
        }
      }
    }
  }

  /**
   * Get preferences for a user
   */
  public async getUserPreferences(userId: number) {
    const preferences = await db('notification_preferences').where({ user_id: userId });
    return preferences;
  }

  /**
   * Upsert a user's preference for an event type
   */
  public async updateUserPreference(
    userId: number,
    eventType: string,
    emailEnabled: boolean,
    inAppEnabled: boolean
  ) {
    const existing = await db('notification_preferences')
      .where({ user_id: userId, event_type: eventType })
      .first();

    if (existing) {
      await db('notification_preferences')
        .where({ id: existing.id })
        .update({
          email_enabled: emailEnabled,
          in_app_enabled: inAppEnabled,
          updated_at: db.fn.now(),
        });
    } else {
      await db('notification_preferences').insert({
        user_id: userId,
        event_type: eventType,
        email_enabled: emailEnabled,
        in_app_enabled: inAppEnabled,
        created_at: db.fn.now(),
        updated_at: db.fn.now(),
      });
    }

    return db('notification_preferences')
      .where({ user_id: userId, event_type: eventType })
      .first();
  }
}

export const notificationService = new NotificationService();
export default notificationService;
