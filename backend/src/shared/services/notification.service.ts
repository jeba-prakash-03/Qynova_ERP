import db from '../../db/knex';
import emailService from './email.service';
import pushService from './push.service';

export interface NotificationNotifyParams {
  eventKey: string;
  userIds: number | number[];
  type: 'info' | 'warning' | 'success' | 'danger';
  title: string;
  message: string;
  link?: string | null;
  eventType?: string;
  pushDetails?: {
    title?: string;
    body?: string;
  };
  emailDetails?: {
    eventType: string;
    subject: string;
    html: string;
  };
}

export const STANDARD_EVENT_TYPES = [
  { key: 'leave_request', label: 'Leave Requests (Team)', defaultPush: true, defaultEmail: true, defaultInApp: true },
  { key: 'leave_status', label: 'Leave Decisions & Approvals', defaultPush: true, defaultEmail: true, defaultInApp: true },
  { key: 'payroll_run', label: 'Payroll & Salary Statements', defaultPush: true, defaultEmail: true, defaultInApp: true },
  { key: 'employee_joined', label: 'New Employee Joiners', defaultPush: true, defaultEmail: true, defaultInApp: true },
  { key: 'timesheet_decision', label: 'Timesheet Decisions', defaultPush: true, defaultEmail: true, defaultInApp: true },
];

export class NotificationService {
  /**
   * Derive a standardized event type from explicit parameter or event key
   */
  private deriveEventType(params: NotificationNotifyParams): string {
    if (params.eventType) return params.eventType;
    if (params.emailDetails?.eventType) return params.emailDetails.eventType;

    const key = params.eventKey.toLowerCase();
    if (key.includes('leave.applied') || key.includes('leave_request')) return 'leave_request';
    if (key.includes('leave.') || key.includes('leave_status')) return 'leave_status';
    if (key.includes('payroll')) return 'payroll_run';
    if (key.includes('employee:') || key.includes('employee.created')) return 'employee_joined';
    if (key.includes('timesheet')) return 'timesheet_decision';

    return 'general';
  }

  /**
   * Sanitize push body to guarantee NO salary figures, bank details or sensitive reasons
   */
  private sanitizePushBody(title: string, message: string, eventType: string): string {
    const lowerTitle = title.toLowerCase();

    if (eventType === 'payroll_run' || lowerTitle.includes('payroll') || lowerTitle.includes('payslip')) {
      return 'Your payslip is ready for review in the employee portal.';
    }

    if (lowerTitle.includes('partially approved')) {
      return 'Your leave request has been partially approved.';
    }

    if (lowerTitle.includes('leave') && lowerTitle.includes('approved')) {
      return 'Your leave request has been approved.';
    }

    if (lowerTitle.includes('leave') && lowerTitle.includes('rejected')) {
      return 'Your leave request has been rejected.';
    }

    if (eventType === 'leave_request' || lowerTitle.includes('applied') || lowerTitle.includes('new leave')) {
      return 'A new leave request has been submitted for your review.';
    }

    if (eventType === 'employee_joined' || lowerTitle.includes('welcome') || lowerTitle.includes('joined')) {
      return 'A new employee has joined the company portal.';
    }

    if (eventType === 'timesheet_decision' || lowerTitle.includes('timesheet')) {
      return 'Your timesheet submission has been reviewed.';
    }

    // Generic fallback: strip any currency symbols or salary indicators
    return message.replace(/₹\s*[\d,]+(\.\d+)?/g, '***').replace(/\b(salary|bank|account)\b.*/gi, '').trim() || title;
  }

  public async notify(params: NotificationNotifyParams): Promise<void> {
    const targetUserIds = Array.isArray(params.userIds) ? params.userIds : [params.userIds];
    const eventType = this.deriveEventType(params);

    for (const userId of targetUserIds) {
      const userSpecificEventKey =
        targetUserIds.length > 1 ? `${params.eventKey}:user:${userId}` : params.eventKey;

      // 1. Check user notification preferences
      let inAppEnabled = true;
      let emailEnabled = true;
      let pushEnabled = true;

      const pref = await db('notification_preferences')
        .where({ user_id: userId, event_type: eventType })
        .first();

      if (pref) {
        inAppEnabled = pref.in_app_enabled === 1 || pref.in_app_enabled === true;
        emailEnabled = pref.email_enabled === 1 || pref.email_enabled === true;
        pushEnabled = pref.push_enabled !== 0 && pref.push_enabled !== false;
      }

      // 2. Deliver In-App Notification (and check deduplication)
      let insertedId: number | null = null;
      let isNewNotification = false;

      if (inAppEnabled) {
        try {
          const existing = await db('notifications').where({ event_key: userSpecificEventKey }).first();
          if (!existing) {
            const [id] = await db('notifications').insert({
              user_id: userId,
              event_key: userSpecificEventKey,
              type: params.type,
              title: params.title,
              message: params.message,
              link: params.link || null,
              is_read: false,
            });
            insertedId = Number(id);
            isNewNotification = true;
          }
        } catch (error: any) {
          if (error.code !== 'ER_DUP_ENTRY' && error.errno !== 1062) {
            console.error('[NOTIFICATION_ERROR] Failed to save in-app notification:', error);
          }
        }
      } else {
        // If in-app is disabled, still check deduplication via notifications or outbox to prevent duplicate push
        const existing = await db('notifications').where({ event_key: userSpecificEventKey }).first();
        if (!existing) {
          isNewNotification = true;
        }
      }

      // 3. Queue Email if enabled and email details provided
      if (emailEnabled && params.emailDetails && isNewNotification) {
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

      // 4. Send Push Notification if enabled and event is NOT duplicate
      if (pushEnabled && isNewNotification) {
        const pushTitle = params.pushDetails?.title || params.title;
        const pushBody = params.pushDetails?.body || this.sanitizePushBody(params.title, params.message, eventType);

        // Send asynchronously without blocking the response
        setImmediate(() => {
          pushService
            .sendPushToUsers(userId, {
              title: pushTitle,
              body: pushBody,
              link: params.link || null,
              notificationId: insertedId,
              eventType,
            })
            .catch((err) => {
              console.warn('[PUSH_ASYNC_ERROR] Failed to send push:', err?.message);
            });
        });
      }
    }
  }

  /**
   * Get preferences for a user, filling in defaults for standard event types
   */
  public async getUserPreferences(userId: number) {
    const preferences = await db('notification_preferences').where({ user_id: userId });
    const prefMap = new Map(preferences.map((p) => [p.event_type, p]));

    return STANDARD_EVENT_TYPES.map((std) => {
      const existing = prefMap.get(std.key);
      if (existing) {
        return {
          id: existing.id,
          user_id: userId,
          event_type: std.key,
          label: std.label,
          in_app: Boolean(existing.in_app_enabled),
          email: Boolean(existing.email_enabled),
          push: existing.push_enabled !== 0 && existing.push_enabled !== false,
          in_app_enabled: existing.in_app_enabled,
          email_enabled: existing.email_enabled,
          push_enabled: existing.push_enabled,
        };
      }
      return {
        id: null,
        user_id: userId,
        event_type: std.key,
        label: std.label,
        in_app: std.defaultInApp,
        email: std.defaultEmail,
        push: std.defaultPush,
        in_app_enabled: std.defaultInApp ? 1 : 0,
        email_enabled: std.defaultEmail ? 1 : 0,
        push_enabled: std.defaultPush ? 1 : 0,
      };
    });
  }

  /**
   * Upsert a user's preference for an event type (in_app, push, email)
   */
  public async updateUserPreference(
    userId: number,
    eventType: string,
    emailEnabled?: boolean,
    inAppEnabled?: boolean,
    pushEnabled?: boolean
  ) {
    const existing = await db('notification_preferences')
      .where({ user_id: userId, event_type: eventType })
      .first();

    const updateData: Record<string, any> = {
      updated_at: db.fn.now(),
    };
    if (emailEnabled !== undefined) updateData.email_enabled = emailEnabled;
    if (inAppEnabled !== undefined) updateData.in_app_enabled = inAppEnabled;
    if (pushEnabled !== undefined) updateData.push_enabled = pushEnabled;

    if (existing) {
      await db('notification_preferences')
        .where({ id: existing.id })
        .update(updateData);
    } else {
      await db('notification_preferences').insert({
        user_id: userId,
        event_type: eventType,
        email_enabled: emailEnabled ?? true,
        in_app_enabled: inAppEnabled ?? true,
        push_enabled: pushEnabled ?? true,
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
