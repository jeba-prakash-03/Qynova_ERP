import db from '../../db/knex';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../shared/errors/app-error';
import { hasRole } from '../../shared/utils/rbac.util';
import { SYSTEM_ROLES } from '../../shared/constants/roles';

export interface TimesheetEntry {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  department_name?: string;
  date: string;
  hours: number;
  task_description: string;
  status: 'pending' | 'approved' | 'rejected';
  approver_employee_id?: number | null;
  decision_note?: string | null;
  created_at?: string;
  warning?: string | null;
}

export class TimesheetsService {
  async submitTimesheet(
    employeeId: number,
    date: string,
    hours: number,
    taskDescription: string,
    projectId?: number | null,
    taskId?: number | null
  ): Promise<TimesheetEntry> {
    if (hours <= 0 || hours > 24) {
      throw new BadRequestError('Hours must be between 0.1 and 24');
    }

    // Check attendance logged hours for comparison warning
    let warning: string | null = null;
    const attRecord = await db('attendance')
      .where({ employee_id: employeeId, date })
      .first();

    if (attRecord && attRecord.working_minutes) {
      const attHours = attRecord.working_minutes / 60;
      const diff = Math.abs(hours - attHours);
      if (diff > 1.0) {
        warning = `Timesheet hours (${hours}h) differ from recorded biometric attendance (${attHours.toFixed(1)}h) by more than 1 hour.`;
      }
    }

    const [id] = await db('timesheets').insert({
      employee_id: employeeId,
      date,
      hours,
      task_description: taskDescription,
      project_id: projectId || null,
      task_id: taskId || null,
      status: 'pending',
    });

    const created = await db('timesheets').where({ id }).first();
    return {
      ...created,
      warning,
    };
  }

  async getMyTimesheets(employeeId: number): Promise<TimesheetEntry[]> {
    return db('timesheets as t')
      .leftJoin('projects as p', 't.project_id', 'p.id')
      .where('t.employee_id', employeeId)
      .select('t.*', 'p.name as project_name', 'p.project_code')
      .orderBy('t.date', 'desc');
  }

  async getPendingTimesheets(currentUser: {
    userId: number;
    employeeId: number | null;
    roles: string[];
    permissions: string[];
  }): Promise<TimesheetEntry[]> {
    const isHrOrAdmin =
      hasRole(currentUser.roles, SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.HR) ||
      currentUser.permissions.includes('timesheets.approve') ||
      currentUser.permissions.includes('*');

    const q = db('timesheets as t')
      .join('employees as e', 't.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .where('t.status', 'pending')
      .select(
        't.*',
        'e.employee_code',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as employee_name"),
        'd.name as department_name'
      )
      .orderBy('t.date', 'desc');

    if (!isHrOrAdmin) {
      if (!currentUser.employeeId) return [];
      q.where('e.reporting_manager_id', currentUser.employeeId);
    }

    return q;
  }

  async decideTimesheet(
    id: number,
    status: 'approved' | 'rejected',
    note: string | undefined,
    currentUser: {
      userId: number;
      employeeId: number | null;
      roles: string[];
      permissions: string[];
    }
  ): Promise<TimesheetEntry> {
    const entry = await db('timesheets').where({ id }).first();
    if (!entry) {
      throw new NotFoundError(`Timesheet entry with ID ${id} not found`);
    }

    await db('timesheets').where({ id }).update({
      status,
      approver_employee_id: currentUser.employeeId || null,
      decision_note: note || (status === 'approved' ? 'Approved' : 'Rejected'),
    });

    return (await db('timesheets').where({ id }).first())!;
  }
}

export const timesheetsService = new TimesheetsService();
