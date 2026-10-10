import db from '../../db/knex';
import {
  Attendance,
  AttendanceBreak,
  AttendanceStatus,
  WorkType,
} from './attendance.types';
import { toMysqlDatetime } from '../../shared/utils/date.util';

export class AttendanceRepository {
  async findById(id: number): Promise<Attendance | null> {
    const row = await db('attendance').where({ id }).first();
    if (!row) return null;
    const breaks = await this.getBreaks(id);
    return this.formatAttendance(row, breaks);
  }

  async findByEmployeeAndDate(employeeId: number, date: string): Promise<Attendance | null> {
    const row = await db('attendance')
      .where({ employee_id: employeeId, date })
      .first();
    if (!row) return null;
    const breaks = await this.getBreaks(Number(row.id));
    return this.formatAttendance(row, breaks);
  }

  async findByEmployeeAndMonth(
    employeeId: number,
    startDate: string,
    endDate: string
  ): Promise<Attendance[]> {
    const rows = await db('attendance')
      .where({ employee_id: employeeId })
      .whereBetween('date', [startDate, endDate])
      .orderBy('date', 'asc');

    return rows.map((r) => this.formatAttendance(r));
  }

  async create(data: {
    employee_id: number;
    date: string;
    check_in?: Date | string | null;
    check_out?: Date | string | null;
    status: AttendanceStatus;
    work_type: WorkType;
    working_minutes?: number;
    break_minutes?: number;
    overtime_minutes?: number;
    is_late?: boolean;
    is_early_checkout?: boolean;
    remarks?: string | null;
    edited_by?: number | null;
  }): Promise<Attendance> {
    const [id] = await db('attendance').insert({
      employee_id: data.employee_id,
      date: data.date,
      check_in: toMysqlDatetime(data.check_in),
      check_out: toMysqlDatetime(data.check_out),
      status: data.status,
      work_type: data.work_type,
      working_minutes: data.working_minutes || 0,
      break_minutes: data.break_minutes || 0,
      overtime_minutes: data.overtime_minutes || 0,
      is_late: Boolean(data.is_late),
      is_early_checkout: Boolean(data.is_early_checkout),
      remarks: data.remarks || null,
      edited_by: data.edited_by || null,
    });

    return (await this.findById(id))!;
  }

  async update(id: number, data: Partial<Attendance>): Promise<Attendance | null> {
    const payload: Record<string, any> = {};
    if (data.check_in !== undefined) payload.check_in = toMysqlDatetime(data.check_in);
    if (data.check_out !== undefined) payload.check_out = toMysqlDatetime(data.check_out);
    if (data.status !== undefined) payload.status = data.status;
    if (data.work_type !== undefined) payload.work_type = data.work_type;
    if (data.working_minutes !== undefined) payload.working_minutes = data.working_minutes;
    if (data.break_minutes !== undefined) payload.break_minutes = data.break_minutes;
    if (data.overtime_minutes !== undefined) payload.overtime_minutes = data.overtime_minutes;
    if (data.is_late !== undefined) payload.is_late = data.is_late;
    if (data.is_early_checkout !== undefined) payload.is_early_checkout = data.is_early_checkout;
    if (data.remarks !== undefined) payload.remarks = data.remarks;
    if (data.edited_by !== undefined) payload.edited_by = data.edited_by;
    payload.updated_at = db.fn.now();

    await db('attendance').where({ id }).update(payload);
    return this.findById(id);
  }

  // Breaks management
  async getBreaks(attendanceId: number): Promise<AttendanceBreak[]> {
    const rows = await db('attendance_breaks')
      .where({ attendance_id: attendanceId })
      .orderBy('break_start', 'asc');

    return rows.map((r) => ({
      id: Number(r.id),
      attendance_id: Number(r.attendance_id),
      break_start: r.break_start,
      break_end: r.break_end,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  async findOpenBreak(attendanceId: number): Promise<AttendanceBreak | null> {
    const row = await db('attendance_breaks')
      .where({ attendance_id: attendanceId })
      .whereNull('break_end')
      .first();

    if (!row) return null;
    return {
      id: Number(row.id),
      attendance_id: Number(row.attendance_id),
      break_start: row.break_start,
      break_end: null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async createBreak(attendanceId: number, breakStart: Date | string): Promise<AttendanceBreak> {
    const [id] = await db('attendance_breaks').insert({
      attendance_id: attendanceId,
      break_start: toMysqlDatetime(breakStart),
    });
    const row = await db('attendance_breaks').where({ id }).first();
    return {
      id: Number(row.id),
      attendance_id: Number(row.attendance_id),
      break_start: row.break_start,
      break_end: row.break_end,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  async closeBreak(breakId: number, breakEnd: Date | string): Promise<void> {
    await db('attendance_breaks')
      .where({ id: breakId })
      .update({
        break_end: toMysqlDatetime(breakEnd),
        updated_at: db.fn.now(),
      });
  }

  async closeAllOpenBreaks(attendanceId: number, closeTime: Date | string): Promise<void> {
    await db('attendance_breaks')
      .where({ attendance_id: attendanceId })
      .whereNull('break_end')
      .update({
        break_end: toMysqlDatetime(closeTime),
        updated_at: db.fn.now(),
      });
  }

  /**
   * Daily Sheet query: joins active employees with their attendance for given date
   */
  async getDailySheet(options: {
    date: string;
    departmentId?: number;
    search?: string;
    reportingManagerId?: number;
  }): Promise<any[]> {
    let query = db('employees as e')
      .leftJoin('attendance as a', function () {
        this.on('a.employee_id', '=', 'e.id').andOn('a.date', '=', db.raw('?', [options.date]));
      })
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('designations as des', 'e.designation_id', 'des.id')
      .whereNull('e.deleted_at')
      .where('e.joining_date', '<=', options.date)
      .where((q) => q.whereNull('e.last_working_date').orWhere('e.last_working_date', '>=', options.date))
      .whereNotIn('e.lifecycle_stage', ['candidate', 'selected', 'offer_generated', 'offer_accepted'])
      .select(
        'e.id as employee_id',
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        'e.reporting_manager_id',
        'd.name as department_name',
        'des.name as designation_title',
        'a.id as attendance_id',
        'a.date as attendance_date',
        'a.check_in',
        'a.check_out',
        'a.status as attendance_status',
        'a.work_type',
        'a.working_minutes',
        'a.break_minutes',
        'a.overtime_minutes',
        'a.is_late',
        'a.is_early_checkout',
        'a.remarks',
        'a.edited_by'
      )
      .orderBy('e.employee_code', 'asc');

    if (options.reportingManagerId) {
      query = query.where('e.reporting_manager_id', options.reportingManagerId);
    }

    if (options.departmentId) {
      query = query.where('e.department_id', options.departmentId);
    }

    if (options.search) {
      const term = `%${options.search}%`;
      query = query.where((q) => {
        q.where('e.first_name', 'like', term)
          .orWhere('e.last_name', 'like', term)
          .orWhere('e.employee_code', 'like', term);
      });
    }

    return query;
  }

  /**
   * Monthly sheet query: all active employees + all attendance records in month range
   */
  async getMonthlySheetData(options: {
    startDate: string;
    endDate: string;
    departmentId?: number;
    search?: string;
    reportingManagerId?: number;
  }): Promise<{ employees: any[]; attendanceRows: any[] }> {
    let empQuery = db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .whereNull('e.deleted_at')
      .where('e.status', 'active')
      .select(
        'e.id as employee_id',
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        'e.joining_date',
        'e.last_working_date',
        'e.reporting_manager_id',
        'd.name as department_name'
      )
      .orderBy('e.employee_code', 'asc');

    if (options.reportingManagerId) {
      empQuery = empQuery.where('e.reporting_manager_id', options.reportingManagerId);
    }
    if (options.departmentId) {
      empQuery = empQuery.where('e.department_id', options.departmentId);
    }
    if (options.search) {
      const term = `%${options.search}%`;
      empQuery = empQuery.where((q) => {
        q.where('e.first_name', 'like', term)
          .orWhere('e.last_name', 'like', term)
          .orWhere('e.employee_code', 'like', term);
      });
    }

    const employees = await empQuery;
    const employeeIds = employees.map((e) => e.employee_id);

    if (employeeIds.length === 0) {
      return { employees: [], attendanceRows: [] };
    }

    const attendanceRows = await db('attendance')
      .whereIn('employee_id', employeeIds)
      .whereBetween('date', [options.startDate, options.endDate])
      .select('*')
      .orderBy('date', 'asc');

    return { employees, attendanceRows };
  }

  private formatAttendance(row: any, breaks: AttendanceBreak[] = []): Attendance {
    let dateStr = row.date;
    if (row.date instanceof Date) {
      dateStr = row.date.toISOString().split('T')[0];
    }
    return {
      id: Number(row.id),
      employee_id: Number(row.employee_id),
      date: dateStr,
      check_in: row.check_in,
      check_out: row.check_out,
      status: row.status,
      work_type: row.work_type,
      working_minutes: Number(row.working_minutes || 0),
      break_minutes: Number(row.break_minutes || 0),
      overtime_minutes: Number(row.overtime_minutes || 0),
      is_late: Boolean(row.is_late),
      is_early_checkout: Boolean(row.is_early_checkout),
      remarks: row.remarks,
      edited_by: row.edited_by ? Number(row.edited_by) : null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      breaks,
    };
  }
}

export const attendanceRepository = new AttendanceRepository();
