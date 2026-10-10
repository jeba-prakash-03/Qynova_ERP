import db from '../../db/knex';
import type { Knex } from 'knex';
import {
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  LeaveRequestStatus,
  HalfDaySession,
} from './leaves.types';

export class LeavesRepository {
  // ==========================================
  // LEAVE TYPES
  // ==========================================
  async findAllTypes(): Promise<LeaveType[]> {
    const rows = await db('leave_types').select('*').orderBy('id', 'asc');
    return rows.map((r) => this.formatLeaveType(r));
  }

  async findTypeById(id: number): Promise<LeaveType | null> {
    const row = await db('leave_types').where({ id }).first();
    return row ? this.formatLeaveType(row) : null;
  }

  async findTypeByCode(code: string): Promise<LeaveType | null> {
    const row = await db('leave_types').where({ code }).first();
    return row ? this.formatLeaveType(row) : null;
  }

  // ==========================================
  // LEAVE BALANCES
  // ==========================================
  async findBalance(
    employeeId: number,
    leaveTypeId: number,
    year: number,
    trx?: Knex.Transaction
  ): Promise<LeaveBalance | null> {
    const q = (trx || db)('leave_balances as lb')
      .join('leave_types as lt', 'lb.leave_type_id', 'lt.id')
      .where({
        'lb.employee_id': employeeId,
        'lb.leave_type_id': leaveTypeId,
        'lb.year': year,
      })
      .select('lb.*', 'lt.name as leave_type_name', 'lt.code as leave_type_code', 'lt.is_paid')
      .first();

    const row = await q;
    return row ? this.formatLeaveBalance(row) : null;
  }

  async findBalancesByEmployee(
    employeeId: number,
    year: number
  ): Promise<LeaveBalance[]> {
    const rows = await db('leave_balances as lb')
      .join('leave_types as lt', 'lb.leave_type_id', 'lt.id')
      .where({
        'lb.employee_id': employeeId,
        'lb.year': year,
      })
      .select('lb.*', 'lt.name as leave_type_name', 'lt.code as leave_type_code', 'lt.is_paid')
      .orderBy('lt.id', 'asc');

    return rows.map((r) => this.formatLeaveBalance(r));
  }

  async adjustBalance(
    employeeId: number,
    leaveTypeId: number,
    year: number,
    deltas: { pendingDelta?: number; usedDelta?: number },
    trx?: Knex.Transaction
  ): Promise<void> {
    const q = (trx || db)('leave_balances').where({
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      year,
    });

    const updates: Record<string, any> = {};
    if (deltas.pendingDelta !== undefined) {
      updates.pending = db.raw('pending + ?', [deltas.pendingDelta]);
    }
    if (deltas.usedDelta !== undefined) {
      updates.used = db.raw('used + ?', [deltas.usedDelta]);
    }

    await q.update(updates);
  }

  async upsertBalance(
    data: {
      employee_id: number;
      leave_type_id: number;
      year: number;
      allocated: number;
    },
    trx?: Knex.Transaction
  ): Promise<void> {
    const q = trx || db;
    const existing = await q('leave_balances')
      .where({
        employee_id: data.employee_id,
        leave_type_id: data.leave_type_id,
        year: data.year,
      })
      .first();

    if (existing) {
      await q('leave_balances')
        .where({ id: existing.id })
        .update({ allocated: data.allocated });
    } else {
      await q('leave_balances').insert({
        employee_id: data.employee_id,
        leave_type_id: data.leave_type_id,
        year: data.year,
        allocated: data.allocated,
        used: 0,
        pending: 0,
      });
    }
  }

  async allocateForAllEmployees(
    leaveTypeId: number,
    year: number,
    allocated: number,
    trx?: Knex.Transaction
  ): Promise<number> {
    const q = trx || db;
    const employees = await q('employees')
      .whereNull('deleted_at')
      .where({ status: 'active' })
      .select('id');

    for (const emp of employees) {
      await this.upsertBalance(
        {
          employee_id: Number(emp.id),
          leave_type_id: leaveTypeId,
          year,
          allocated,
        },
        trx
      );
    }

    return employees.length;
  }

  // ==========================================
  // LEAVE REQUESTS
  // ==========================================
  async findRequestById(id: number, trx?: Knex.Transaction): Promise<LeaveRequest | null> {
    const q = (trx || db)('leave_requests as lr')
      .join('leave_types as lt', 'lr.leave_type_id', 'lt.id')
      .join('employees as e', 'lr.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('employees as appr', 'lr.approver_employee_id', 'appr.id')
      .where('lr.id', id)
      .select(
        'lr.*',
        'lt.name as leave_type_name',
        'lt.code as leave_type_code',
        'e.employee_code',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as employee_name"),
        'd.name as department_name',
        db.raw("CONCAT(appr.first_name, ' ', appr.last_name) as approver_name")
      )
      .first();

    const row = await q;
    return row ? this.formatLeaveRequest(row) : null;
  }

  async findOverlapping(
    employeeId: number,
    fromDate: string,
    toDate: string,
    excludeRequestId?: number,
    trx?: Knex.Transaction
  ): Promise<LeaveRequest | null> {
    const q = (trx || db)('leave_requests')
      .where({ employee_id: employeeId })
      .whereIn('status', ['pending', 'approved'])
      .where('from_date', '<=', toDate)
      .where('to_date', '>=', fromDate);

    if (excludeRequestId) {
      q.whereNot('id', excludeRequestId);
    }

    const row = await q.first();
    return row ? this.formatLeaveRequest(row) : null;
  }

  async createRequest(
    data: {
      employee_id: number;
      leave_type_id: number;
      from_date: string;
      to_date: string;
      is_half_day: boolean;
      half_day_session?: HalfDaySession | null;
      days: number;
      reason: string;
      status?: LeaveRequestStatus;
    },
    trx?: Knex.Transaction
  ): Promise<LeaveRequest> {
    const q = trx || db;
    const [id] = await q('leave_requests').insert({
      employee_id: data.employee_id,
      leave_type_id: data.leave_type_id,
      from_date: data.from_date,
      to_date: data.to_date,
      is_half_day: data.is_half_day,
      half_day_session: data.half_day_session || null,
      days: data.days,
      reason: data.reason,
      status: data.status || 'pending',
    });

    const created = await this.findRequestById(Number(id), trx);
    return created!;
  }

  async updateRequestStatus(
    id: number,
    updateData: {
      status: LeaveRequestStatus;
      approver_employee_id?: number | null;
      decided_at?: Date | string | null;
      decision_note?: string | null;
    },
    trx?: Knex.Transaction
  ): Promise<LeaveRequest> {
    const q = trx || db;
    await q('leave_requests').where({ id }).update(updateData);
    const updated = await this.findRequestById(id, trx);
    return updated!;
  }

  async findEmployeeRequests(
    employeeId: number,
    filters?: { year?: number; status?: string }
  ): Promise<LeaveRequest[]> {
    const q = db('leave_requests as lr')
      .join('leave_types as lt', 'lr.leave_type_id', 'lt.id')
      .join('employees as e', 'lr.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('employees as appr', 'lr.approver_employee_id', 'appr.id')
      .where('lr.employee_id', employeeId)
      .select(
        'lr.*',
        'lt.name as leave_type_name',
        'lt.code as leave_type_code',
        'e.employee_code',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as employee_name"),
        'd.name as department_name',
        db.raw("CONCAT(appr.first_name, ' ', appr.last_name) as approver_name")
      )
      .orderBy('lr.created_at', 'desc');

    if (filters?.status) {
      q.where('lr.status', filters.status);
    }
    if (filters?.year) {
      q.whereRaw('YEAR(lr.from_date) = ?', [filters.year]);
    }

    const rows = await q;
    return rows.map((r) => this.formatLeaveRequest(r));
  }

  async findPendingRequests(
    reportingManagerId?: number,
    filters?: { department?: string; search?: string }
  ): Promise<LeaveRequest[]> {
    const q = db('leave_requests as lr')
      .join('leave_types as lt', 'lr.leave_type_id', 'lt.id')
      .join('employees as e', 'lr.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .where('lr.status', 'pending')
      .select(
        'lr.*',
        'lt.name as leave_type_name',
        'lt.code as leave_type_code',
        'e.employee_code',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as employee_name"),
        'd.name as department_name'
      )
      .orderBy('lr.created_at', 'asc');

    if (reportingManagerId) {
      q.where('e.reporting_manager_id', reportingManagerId);
    }

    if (filters?.department) {
      q.where('d.name', filters.department);
    }

    if (filters?.search) {
      const term = `%${filters.search}%`;
      q.where((builder) => {
        builder
          .where('e.first_name', 'like', term)
          .orWhere('e.last_name', 'like', term)
          .orWhere('e.employee_code', 'like', term);
      });
    }

    const rows = await q;
    return rows.map((r) => this.formatLeaveRequest(r));
  }

  async findApprovedLeavesForMonth(
    startDate: string,
    endDate: string,
    reportingManagerId?: number
  ): Promise<LeaveRequest[]> {
    const q = db('leave_requests as lr')
      .join('leave_types as lt', 'lr.leave_type_id', 'lt.id')
      .join('employees as e', 'lr.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .where('lr.status', 'approved')
      .where('lr.from_date', '<=', endDate)
      .where('lr.to_date', '>=', startDate)
      .select(
        'lr.*',
        'lt.name as leave_type_name',
        'lt.code as leave_type_code',
        'e.employee_code',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as employee_name"),
        'd.name as department_name'
      )
      .orderBy('lr.from_date', 'asc');

    if (reportingManagerId) {
      q.where('e.reporting_manager_id', reportingManagerId);
    }

    const rows = await q;
    return rows.map((r) => this.formatLeaveRequest(r));
  }

  // ==========================================
  // ATTENDANCE SYNCHRONIZATION
  // ==========================================
  async syncAttendanceForLeave(
    employeeId: number,
    date: string,
    isHalfDay: boolean,
    leaveTypeName: string,
    isWfh: boolean,
    trx?: Knex.Transaction
  ): Promise<void> {
    const q = trx || db;
    const existing = await q('attendance')
      .where({ employee_id: employeeId, date })
      .first();

    const status = isWfh ? 'wfh' : isHalfDay ? 'half_day' : 'leave';
    const workType = isWfh ? 'wfh' : 'office';
    const remarks = isWfh ? 'Approved Work From Home' : `Approved Leave: ${leaveTypeName}`;

    if (existing) {
      await q('attendance')
        .where({ id: existing.id })
        .update({
          status,
          work_type: workType,
          remarks,
          updated_at: db.fn.now(),
        });
    } else {
      await q('attendance').insert({
        employee_id: employeeId,
        date,
        status,
        work_type: workType,
        remarks,
        check_in: null,
        check_out: null,
        working_minutes: 0,
        break_minutes: 0,
        overtime_minutes: 0,
      });
    }
  }

  async revertAttendanceForLeave(
    employeeId: number,
    dates: string[],
    trx?: Knex.Transaction
  ): Promise<void> {
    const q = trx || db;
    // For each date, remove auto-generated leave row if no check_in exists,
    // or reset status to absent / clear remarks if check_in exists.
    for (const date of dates) {
      const existing = await q('attendance')
        .where({ employee_id: employeeId, date })
        .first();

      if (existing) {
        if (!existing.check_in) {
          await q('attendance').where({ id: existing.id }).delete();
        } else {
          await q('attendance')
            .where({ id: existing.id })
            .update({
              status: 'present',
              remarks: 'Leave cancelled by employee',
              updated_at: db.fn.now(),
            });
        }
      }
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================
  private formatLeaveType(row: any): LeaveType {
    return {
      id: Number(row.id),
      name: row.name,
      code: row.code,
      yearly_quota: Number(row.yearly_quota),
      is_paid: Boolean(row.is_paid),
      carry_forward: Boolean(row.carry_forward),
      requires_approval: Boolean(row.requires_approval),
      allow_half_day: Boolean(row.allow_half_day),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private formatLeaveBalance(row: any): LeaveBalance {
    const allocated = Number(row.allocated || 0);
    const used = Number(row.used || 0);
    const pending = Number(row.pending || 0);
    const remaining = Math.max(0, allocated - used - pending);

    return {
      id: Number(row.id),
      employee_id: Number(row.employee_id),
      leave_type_id: Number(row.leave_type_id),
      year: Number(row.year),
      allocated,
      used,
      pending,
      remaining,
      leave_type_name: row.leave_type_name,
      leave_type_code: row.leave_type_code,
      is_paid: row.is_paid !== undefined ? Boolean(row.is_paid) : undefined,
      employee_name: row.employee_name,
      employee_code: row.employee_code,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private formatLeaveRequest(row: any): LeaveRequest {
    return {
      id: Number(row.id),
      employee_id: Number(row.employee_id),
      leave_type_id: Number(row.leave_type_id),
      from_date:
        row.from_date instanceof Date
          ? row.from_date.toISOString().split('T')[0]
          : String(row.from_date),
      to_date:
        row.to_date instanceof Date
          ? row.to_date.toISOString().split('T')[0]
          : String(row.to_date),
      is_half_day: Boolean(row.is_half_day),
      half_day_session: row.half_day_session,
      days: Number(row.days),
      reason: row.reason,
      status: row.status,
      approver_employee_id: row.approver_employee_id
        ? Number(row.approver_employee_id)
        : null,
      decided_at: row.decided_at,
      decision_note: row.decision_note,
      created_at: row.created_at,
      updated_at: row.updated_at,
      leave_type_name: row.leave_type_name,
      leave_type_code: row.leave_type_code,
      employee_name: row.employee_name,
      employee_code: row.employee_code,
      department_name: row.department_name,
      approver_name: row.approver_name,
    };
  }
}

export const leavesRepository = new LeavesRepository();
