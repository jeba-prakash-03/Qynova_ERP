import db from '../../db/knex';

export interface NotificationRecord {
  id: number;
  user_id: number;
  event_key: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export class NotificationsRepository {
  public async findByUserId(userId: number, limit = 20): Promise<NotificationRecord[]> {
    const list = await db('notifications')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);

    return list.map((n) => ({
      ...n,
      is_read: Boolean(n.is_read),
    }));
  }

  public async getUnreadCount(userId: number): Promise<number> {
    const result = await db('notifications')
      .where({ user_id: userId, is_read: false })
      .count('id as count')
      .first();

    return Number(result?.count || 0);
  }

  public async markAsRead(id: number, userId: number): Promise<void> {
    await db('notifications')
      .where({ id, user_id: userId })
      .update({ is_read: true });
  }

  public async markAllAsRead(userId: number): Promise<void> {
    await db('notifications')
      .where({ user_id: userId, is_read: false })
      .update({ is_read: true });
  }
}

export const notificationsRepository = new NotificationsRepository();
export default notificationsRepository;
