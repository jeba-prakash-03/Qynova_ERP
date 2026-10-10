import db from '../../db/knex';
import { leavesRepository } from './leaves.repository';
import {
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  CreateLeaveRequestDto,
  ApproveLeaveRequestDto,
  RejectLeaveRequestDto,
  AllocateBalanceDto,
  CalculateDaysResult,
} from './leaves.types';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error';
import { getWorkingDays } from '../holidays/holidays.service';
import { notificationService } from '../../shared/services/notification.service';
import { getTodayKolkata } from '../../shared/utils/date.util';

export class LeavesService {
  // ==========================================
  // LEAVE TYPES
  // ==========================================
  async getAllTypes(): Promise<LeaveType[]> {
    return leavesRepository.findAllTypes();
  }

  async getTypeById(id: number): Promise<LeaveType> {
    const type = await leavesRepository.findTypeById(id);
    if (!type) {
      throw new NotFoundError(`Leave type with ID ${id} not found`);
    }
    return type;
  }

  // ==========================================
  // WORKING DAYS CALCULATION
  // ==========================================
  /**
   * Calculates the working days in [fromDate, toDate] range.
   * Excludes weekends and public/company holidays via getWorkingDays.
   * Accounts for half-day requests (0.5).
   */
  async calculateWorkingDays(
    fromDate: string,
    toDate: string,
    isHalfDay: boolean = false
  ): Promise<CalculateDaysResult> {
    if (fromDate > toDate) {
      throw new BadRequestError('to_date cannot be earlier than from_date');
    }

    if (isHalfDay && fromDate !== toDate) {
      throw new BadRequestError(
        'Half day leave must be for a single date (from_date must equal to_date)'
      );
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);

    // Collect all year-month pairs spanned by the range
    const monthsToFetch: Array<{ year: number; month: number }> = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cur <= last) {
      monthsToFetch.push({
        year: cur.getFullYear(),
        month: cur.getMonth() + 1, // 1-indexed
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    // Accumulate all working dates across the spanned months
    const allWorkingDates = new Set<string>();
    for (const { year, month } of monthsToFetch) {
      const res = await getWorkingDays(year, month);
      res.workingDates.forEach((d) => allWorkingDates.add(d));
    }

    // Iterate day-by-day across [fromDate, toDate]
    const workingDates: string[] = [];
    const holidayOrWeekendDates: string[] = [];
    const weekendDates: string[] = [];
    const holidayDates: string[] = [];

    const pad = (n: number) => n.toString().padStart(2, '0');
    const iter = new Date(fromDate);
    const endDateObj = new Date(toDate);

    while (iter <= endDateObj) {
      const dateStr = `${iter.getFullYear()}-${pad(iter.getMonth() + 1)}-${pad(
        iter.getDate()
      )}`;
      const dayOfWeek = iter.getDay();

      if (allWorkingDates.has(dateStr)) {
        workingDates.push(dateStr);
      } else {
        holidayOrWeekendDates.push(dateStr);
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekendDates.push(dateStr);
        } else {
          holidayDates.push(dateStr);
        }
      }

      iter.setDate(iter.getDate() + 1);
    }

    let days = workingDates.length;
    if (isHalfDay) {
      days = workingDates.length === 1 ? 0.5 : 0;
    }

    return {
      days,
      workingDates,
      holidayDates,
      weekendDates,
    };
  }

  // ==========================================
  // LEAVE BALANCES
  // ==========================================
  async getEmployeeBalances(employeeId: number, year?: number): Promise<LeaveBalance[]> {
    const targetYear = year || new Date().getFullYear();
    return leavesRepository.findBalancesByEmployee(employeeId, targetYear);
  }

  async allocateBalance(
    data: AllocateBalanceDto,
    performedByUserId?: number
  ): Promise<{ affectedEmployees: number }> {
    const leaveType = await this.getTypeById(data.leave_type_id);

    if (data.allocate_all) {
      const count = await leavesRepository.allocateForAllEmployees(
        leaveType.id,
        data.year,
        data.allocated
      );
      return { affectedEmployees: count };
    }

    if (!data.employee_id) {
      throw new BadRequestError('employee_id is required when allocate_all is false');
    }

    await leavesRepository.upsertBalance({
      employee_id: data.employee_id,
      leave_type_id: leaveType.id,
      year: data.year,
      allocated: data.allocated,
    });

    return { affectedEmployees: 1 };
  }

  // ==========================================
  // APPLY LEAVE REQUEST
  // ==========================================
  async applyLeave(
    employeeId: number,
    data: CreateLeaveRequestDto
  ): Promise<LeaveRequest> {
    const leaveType = await this.getTypeById(data.leave_type_id);

    if (data.is_half_day && !leaveType.allow_half_day) {
      throw new BadRequestError(`Half day is not allowed for ${leaveType.name}`);
    }

    // 1. Calculate working days
    const calc = await this.calculateWorkingDays(
      data.from_date,
      data.to_date,
      Boolean(data.is_half_day)
    );

    if (calc.days <= 0) {
      throw new BadRequestError(
        'Selected date range contains no working days (all selected days are weekly offs or holidays).'
      );
    }

    // 2. Block overlapping requests
    const overlap = await leavesRepository.findOverlapping(
      employeeId,
      data.from_date,
      data.to_date
    );

    if (overlap) {
      throw new BadRequestError(
        `You already have an active leave request (${overlap.leave_type_name}, ${overlap.from_date} to ${overlap.to_date}, status: ${overlap.status}) overlapping with these dates.`
      );
    }

    // 3. Verify balance (except LOP)
    const requestYear = new Date(data.from_date).getFullYear();
    const balance = await leavesRepository.findBalance(
      employeeId,
      leaveType.id,
      requestYear
    );

    const isLop = leaveType.code === 'LOP';
    if (!isLop) {
      const remaining = balance?.remaining ?? 0;
      if (calc.days > remaining) {
        throw new BadRequestError(
          `Insufficient leave balance for ${leaveType.name}. Available remaining: ${remaining}, Requested: ${calc.days}`
        );
      }
    }

    // 4. Create request and increment pending in DB Transaction
    let createdRequest: LeaveRequest;
    await db.transaction(async (trx) => {
      // Ensure balance record exists if not present
      if (!balance) {
        await leavesRepository.upsertBalance(
          {
            employee_id: employeeId,
            leave_type_id: leaveType.id,
            year: requestYear,
            allocated: 0,
          },
          trx
        );
      }

      createdRequest = await leavesRepository.createRequest(
        {
          employee_id: employeeId,
          leave_type_id: leaveType.id,
          from_date: data.from_date,
          to_date: data.to_date,
          is_half_day: Boolean(data.is_half_day),
          half_day_session: data.half_day_session || null,
          days: calc.days,
          reason: data.reason,
          status: 'pending',
        },
        trx
      );

      // Increment pending in leave_balances
      await leavesRepository.adjustBalance(
        employeeId,
        leaveType.id,
        requestYear,
        { pendingDelta: calc.days },
        trx
      );
    });

    // 5. Notify Reporting Manager
    try {
      const employee = await db('employees').where({ id: employeeId }).first();
      if (employee?.reporting_manager_id) {
        const manager = await db('employees')
          .where({ id: employee.reporting_manager_id })
          .first();

        if (manager?.user_id) {
          await notificationService.notify({
            eventKey: `leave.applied:req:${createdRequest!.id}`,
            userIds: manager.user_id,
            type: 'info',
            title: 'New Leave Request',
            message: `${employee.first_name} ${employee.last_name} applied for ${calc.days} day(s) of ${leaveType.name} (${data.from_date} to ${data.to_date})`,
            link: '/leaves/approvals',
          });
        }
      }
    } catch (notifErr) {
      console.error('[LEAVE_NOTIFY_ERROR] Failed to send leave application notification:', notifErr);
    }

    return createdRequest!;
  }

  // ==========================================
  // APPROVE LEAVE REQUEST
  // ==========================================
  async approveLeave(
    requestId: number,
    currentUser: {
      userId: number;
      employeeId: number | null;
      roles: string[];
      permissions: string[];
    },
    dto: ApproveLeaveRequestDto
  ): Promise<LeaveRequest> {
    const request = await leavesRepository.findRequestById(requestId);
    if (!request) {
      throw new NotFoundError(`Leave request with ID ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new BadRequestError(
        `Cannot approve request with status '${request.status}'. Only pending requests can be approved.`
      );
    }

    // A person cannot approve their own leave
    if (
      currentUser.employeeId &&
      currentUser.employeeId === request.employee_id
    ) {
      throw new ForbiddenError('You cannot approve your own leave request.');
    }

    // Permission check: reporting manager or HR/Admin
    const employee = await db('employees').where({ id: request.employee_id }).first();
    const isReportingManager =
      currentUser.employeeId &&
      employee?.reporting_manager_id === currentUser.employeeId;
    const isHrOrAdmin =
      currentUser.roles.includes('admin') ||
      currentUser.roles.includes('hr') ||
      currentUser.permissions.includes('leave.approve') ||
      currentUser.permissions.includes('*');

    if (!isReportingManager && !isHrOrAdmin) {
      throw new ForbiddenError(
        'You are not authorized to approve this leave request. Only the reporting manager or HR/Admin can approve.'
      );
    }

    const calc = await this.calculateWorkingDays(
      request.from_date,
      request.to_date,
      request.is_half_day
    );
    const requestYear = new Date(request.from_date).getFullYear();
    const isWfh = request.leave_type_code === 'WFH';

    let updatedRequest: LeaveRequest;
    await db.transaction(async (trx) => {
      // 1. Update request status
      updatedRequest = await leavesRepository.updateRequestStatus(
        request.id,
        {
          status: 'approved',
          approver_employee_id: currentUser.employeeId || null,
          decided_at: new Date(),
          decision_note: dto.decision_note || 'Approved',
        },
        trx
      );

      // 2. Transition balance: pending -= days, used += days
      await leavesRepository.adjustBalance(
        request.employee_id,
        request.leave_type_id,
        requestYear,
        {
          pendingDelta: -request.days,
          usedDelta: request.days,
        },
        trx
      );

      // 3. Sync attendance rows for working dates in the approved leave
      for (const workingDate of calc.workingDates) {
        await leavesRepository.syncAttendanceForLeave(
          request.employee_id,
          workingDate,
          request.is_half_day,
          request.leave_type_name || 'Leave',
          isWfh,
          trx
        );
      }
    });

    // 4. Notify applicant employee
    try {
      if (employee?.user_id) {
        await notificationService.notify({
          eventKey: `leave.approved:req:${request.id}`,
          userIds: employee.user_id,
          type: 'success',
          title: 'Leave Request Approved',
          message: `Your leave request for ${request.days} day(s) from ${request.from_date} to ${request.to_date} has been approved.`,
          link: '/leaves/my',
        });
      }
    } catch (notifErr) {
      console.error('[LEAVE_NOTIFY_ERROR] Failed to send approval notification:', notifErr);
    }

    return updatedRequest!;
  }

  // ==========================================
  // REJECT LEAVE REQUEST
  // ==========================================
  async rejectLeave(
    requestId: number,
    currentUser: {
      userId: number;
      employeeId: number | null;
      roles: string[];
      permissions: string[];
    },
    dto: RejectLeaveRequestDto
  ): Promise<LeaveRequest> {
    if (!dto.decision_note || dto.decision_note.trim().length === 0) {
      throw new BadRequestError('Decision note is mandatory when rejecting a leave request.');
    }

    const request = await leavesRepository.findRequestById(requestId);
    if (!request) {
      throw new NotFoundError(`Leave request with ID ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new BadRequestError(
        `Cannot reject request with status '${request.status}'. Only pending requests can be rejected.`
      );
    }

    // A person cannot reject their own leave
    if (
      currentUser.employeeId &&
      currentUser.employeeId === request.employee_id
    ) {
      throw new ForbiddenError('You cannot reject your own leave request.');
    }

    // Permission check: reporting manager or HR/Admin
    const employee = await db('employees').where({ id: request.employee_id }).first();
    const isReportingManager =
      currentUser.employeeId &&
      employee?.reporting_manager_id === currentUser.employeeId;
    const isHrOrAdmin =
      currentUser.roles.includes('admin') ||
      currentUser.roles.includes('hr') ||
      currentUser.permissions.includes('leave.approve') ||
      currentUser.permissions.includes('*');

    if (!isReportingManager && !isHrOrAdmin) {
      throw new ForbiddenError(
        'You are not authorized to reject this leave request. Only the reporting manager or HR/Admin can reject.'
      );
    }

    const requestYear = new Date(request.from_date).getFullYear();

    let updatedRequest: LeaveRequest;
    await db.transaction(async (trx) => {
      // 1. Update request status
      updatedRequest = await leavesRepository.updateRequestStatus(
        request.id,
        {
          status: 'rejected',
          approver_employee_id: currentUser.employeeId || null,
          decided_at: new Date(),
          decision_note: dto.decision_note,
        },
        trx
      );

      // 2. Transition balance: pending -= days
      await leavesRepository.adjustBalance(
        request.employee_id,
        request.leave_type_id,
        requestYear,
        {
          pendingDelta: -request.days,
        },
        trx
      );
    });

    // 3. Notify applicant employee
    try {
      if (employee?.user_id) {
        await notificationService.notify({
          eventKey: `leave.rejected:req:${request.id}`,
          userIds: employee.user_id,
          type: 'danger',
          title: 'Leave Request Rejected',
          message: `Your leave request for ${request.from_date} to ${request.to_date} was rejected. Reason: ${dto.decision_note}`,
          link: '/leaves/my',
        });
      }
    } catch (notifErr) {
      console.error('[LEAVE_NOTIFY_ERROR] Failed to send rejection notification:', notifErr);
    }

    return updatedRequest!;
  }

  // ==========================================
  // CANCEL LEAVE REQUEST
  // ==========================================
  async cancelLeave(
    requestId: number,
    currentUser: {
      userId: number;
      employeeId: number | null;
      roles: string[];
      permissions: string[];
    }
  ): Promise<LeaveRequest> {
    const request = await leavesRepository.findRequestById(requestId);
    if (!request) {
      throw new NotFoundError(`Leave request with ID ${requestId} not found`);
    }

    // Only applicant or admin can cancel
    const isApplicant =
      currentUser.employeeId && currentUser.employeeId === request.employee_id;
    const isAdmin =
      currentUser.roles.includes('admin') || currentUser.roles.includes('hr');

    if (!isApplicant && !isAdmin) {
      throw new ForbiddenError('You can only cancel your own leave requests.');
    }

    if (request.status === 'cancelled' || request.status === 'rejected') {
      throw new BadRequestError(`Cannot cancel a leave request that is already ${request.status}.`);
    }

    const todayStr = getTodayKolkata();
    const requestYear = new Date(request.from_date).getFullYear();

    let updatedRequest: LeaveRequest;
    await db.transaction(async (trx) => {
      if (request.status === 'pending') {
        // Pending cancellation: pending -= days
        updatedRequest = await leavesRepository.updateRequestStatus(
          request.id,
          {
            status: 'cancelled',
            decision_note: 'Cancelled by applicant',
          },
          trx
        );

        await leavesRepository.adjustBalance(
          request.employee_id,
          request.leave_type_id,
          requestYear,
          {
            pendingDelta: -request.days,
          },
          trx
        );
      } else if (request.status === 'approved') {
        // Approved cancellation: allowed only if from_date is in the future
        if (request.from_date < todayStr) {
          throw new BadRequestError(
            'Cannot cancel an approved leave that has already started or passed in the past.'
          );
        }

        updatedRequest = await leavesRepository.updateRequestStatus(
          request.id,
          {
            status: 'cancelled',
            decision_note: 'Cancelled by applicant (Future Approved Leave)',
          },
          trx
        );

        // Revert used quota: used -= days
        await leavesRepository.adjustBalance(
          request.employee_id,
          request.leave_type_id,
          requestYear,
          {
            usedDelta: -request.days,
          },
          trx
        );

        // Revert attendance rows
        const calc = await this.calculateWorkingDays(
          request.from_date,
          request.to_date,
          request.is_half_day
        );
        await leavesRepository.revertAttendanceForLeave(
          request.employee_id,
          calc.workingDates,
          trx
        );
      } else {
        throw new BadRequestError('Invalid request status for cancellation');
      }
    });

    return updatedRequest!;
  }

  // ==========================================
  // RETRIEVAL & APPROVAL LISTS
  // ==========================================
  async getMyRequests(
    employeeId: number,
    filters?: { year?: number; status?: string }
  ): Promise<LeaveRequest[]> {
    return leavesRepository.findEmployeeRequests(employeeId, filters);
  }

  async getPendingApprovals(currentUser: {
    userId: number;
    employeeId: number | null;
    roles: string[];
    permissions: string[];
  }): Promise<LeaveRequest[]> {
    const isHrOrAdmin =
      currentUser.roles.includes('admin') ||
      currentUser.roles.includes('hr') ||
      currentUser.permissions.includes('leave.approve') ||
      currentUser.permissions.includes('*');

    if (isHrOrAdmin) {
      // HR/Admin sees all pending requests
      return leavesRepository.findPendingRequests();
    }

    if (!currentUser.employeeId) {
      return [];
    }

    // Manager sees only their direct reportees
    return leavesRepository.findPendingRequests(currentUser.employeeId);
  }

  async getTeamCalendar(
    month: string, // YYYY-MM
    currentUser: {
      userId: number;
      employeeId: number | null;
      roles: string[];
      permissions: string[];
    }
  ): Promise<LeaveRequest[]> {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    const lastDay = new Date(year, m, 0).getDate();
    const pad = (n: number) => n.toString().padStart(2, '0');

    const startDate = `${month}-01`;
    const endDate = `${month}-${pad(lastDay)}`;

    const isHrOrAdmin =
      currentUser.roles.includes('admin') ||
      currentUser.roles.includes('hr') ||
      currentUser.permissions.includes('leave.view') ||
      currentUser.permissions.includes('*');

    const reportingManagerId = isHrOrAdmin ? undefined : (currentUser.employeeId || -1);

    return leavesRepository.findApprovedLeavesForMonth(
      startDate,
      endDate,
      reportingManagerId
    );
  }
}

export const leavesService = new LeavesService();
