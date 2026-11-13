import cron from 'node-cron';
import { employeesService } from './employees.service';

/**
 * Weekly cron job running every Monday at 09:00 Asia/Kolkata (03:30 UTC)
 * Checks for employees with upcoming probation completion within 15 days
 * and alerts their reporting managers and HR.
 */
export const startEmployeesCron = () => {
  cron.schedule('30 3 * * 1', async () => {
    try {
      const result = await employeesService.checkProbationMilestones();
      if (result.alertedCount > 0) {
        console.log(`[Employees Cron] Dispatched ${result.alertedCount} probation review alert(s)`);
      }
    } catch (err) {
      console.error('[Employees Cron] Failed to process probation milestones:', err);
    }
  });
};

export const initEmployeesCron = startEmployeesCron;
