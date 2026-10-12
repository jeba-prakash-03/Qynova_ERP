import cron from 'node-cron';
import { tasksService } from './tasks.service';

/**
 * Daily cron job running at 08:30 Asia/Kolkata time (03:00 UTC)
 * to send task due-tomorrow reminder notifications with unique event keys.
 */
export const startTasksCron = () => {
  // Run daily at 08:30 IST (03:00 UTC)
  cron.schedule('0 3 * * *', async () => {
    try {
      const count = await tasksService.sendDueTomorrowReminders();
      if (count > 0) {
        console.log(`[Tasks Cron] Sent ${count} due-tomorrow reminder notification(s)`);
      }
    } catch (err) {
      console.error('[Tasks Cron] Failed to send due-tomorrow reminders:', err);
    }
  });
};

export const initTasksCron = startTasksCron;

