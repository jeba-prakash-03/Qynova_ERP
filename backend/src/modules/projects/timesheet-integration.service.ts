import db from '../../db/knex';

/**
 * Timesheet Integration Service Wrapper
 * Provides helper functions for Dev B business modules (Projects, Tasks, Profitability)
 * to compute approved timesheet minutes and hours.
 */
export class TimesheetIntegrationService {
  /**
   * Get total approved minutes logged for a specific project.
   */
  async getApprovedMinutesByProject(projectId: number): Promise<number> {
    const result = await db('timesheets')
      .where({ project_id: projectId, status: 'approved' })
      .sum('hours as total_hours')
      .first();

    const hours = Number(result?.total_hours || 0);
    return Math.round(hours * 60);
  }

  /**
   * Get total approved minutes logged for a specific task.
   */
  async getApprovedMinutesByTask(taskId: number): Promise<number> {
    const result = await db('timesheets')
      .where({ task_id: taskId, status: 'approved' })
      .sum('hours as total_hours')
      .first();

    const hours = Number(result?.total_hours || 0);
    return Math.round(hours * 60);
  }

  /**
   * Get approved hours breakdown by employee for a project (used for profitability).
   */
  async getApprovedHoursByEmployeeForProject(
    projectId: number
  ): Promise<{ employee_id: number; hours: number }[]> {
    const rows = await db('timesheets')
      .where({ project_id: projectId, status: 'approved' })
      .groupBy('employee_id')
      .select('employee_id')
      .sum('hours as hours');

    return rows.map((r: any) => ({
      employee_id: Number(r.employee_id),
      hours: Number(r.hours || 0),
    }));
  }
}

export const timesheetIntegrationService = new TimesheetIntegrationService();
