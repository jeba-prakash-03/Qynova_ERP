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
import { getWorkingDays, holidaysService } from '../holidays/holidays.service';
import { notificationService } from '../../shared/services/notification.service';
import { getTodayKolkata, timeStringToMinutes } from '../../shared/utils/date.util';
import { SYSTEM_ROLES } from '../../shared/constants/roles';

/** Case-insensitive role check — DB stores 'Admin', 'HR', etc. */
const hasRole = (roles: string[], ...targets: string[]): boolean =>
  roles.some((r) => targets.map((t) => t.toLowerCase()).includes(r.toLowerCase()));

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
      const dateStr = `${iter.getFullYear()}-${pad(iter.getMonth() + 1)}-${pad(iter.getDate())}`;
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
    const isPermission = leaveType.code === 'PERM';
    const isWfh = leaveType.code === 'WFH';

    if (data.is_half_day && !leaveType.allow_half_day) {
      throw new BadRequestError(`Half day is not allowed for ${leaveType.name}`);
    }

    // Permission leave type rules
    if (isPermission) {
      if (!data.from_time || !data.to_time) {
        throw new BadRequestError('from_time and to_time are required for Permission requests');
      }
      const [h1, m1] = data.from_time.split(':').map(Number);
      const [h2, m2] = data.to_time.split(':').map(Number);
      const durationMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);

      if (durationMinutes <= 0) {
        throw new BadRequestError('to_time must be later than from_time');
      }
      if (durationMinutes > 120) {
        throw new BadRequestError('Permission duration cannot exceed 2 hours (120 minutes)');
      }

      // Check max 2 per month for this employee
      const monthPrefix = data.from_date.slice(0, 7);
      const existingPermsCount = await db('leave_requests')
        .where({ employee_id: employeeId, leave_type_id: leaveType.id })
        .whereIn('status', ['pending', 'approved', 'partially_approved'])
        .whereRaw('from_date LIKE ?', [`${monthPrefix}%`])
        .count('id as count')
        .first();

      if (Number(existingPermsCount?.count || 0) >= 2) {
        throw new BadRequestError('Maximum limit of 2 Permission requests per month reached');
      }
    }

    // Half day time defaults & duration validation
    let fromTime = data.from_time || null;
    let toTime = data.to_time || null;

    if (data.is_half_day) {
      data.to_date = data.from_date;
      if (!fromTime || !toTime) {
        throw new BadRequestError('Both From time and To time are required for half day leave', [
          { field: 'from_time', message: 'From time is required' },
          { field: 'to_time', message: 'To time is required' },
        ]);
      }

      const workSettings = await holidaysService.getWorkSettings();
      const shiftStartMins = timeStringToMinutes(workSettings.shift_start);
      const shiftEndMins = timeStringToMinutes(workSettings.shift_end);
      const fromMins = timeStringToMinutes(fromTime);
      const toMins = timeStringToMinutes(toTime);

      if (fromMins >= toMins) {
        throw new BadRequestError('To time must be later than From time', [
          { field: 'to_time', message: 'To time must be later than From time' },
        ]);
      }

      if (fromMins < shiftStartMins || toMins > shiftEndMins) {
        throw new BadRequestError(`Times must be inside shift hours (${workSettings.shift_start} to ${workSettings.shift_end})`, [
          { field: 'from_time', message: `Times must be inside shift hours (${workSettings.shift_start} to ${workSettings.shift_end})` },
        ]);
      }

      const shiftLength = shiftEndMins - shiftStartMins;
      const maxHalfDayMins = shiftLength / 2 + 15;
      const duration = toMins - fromMins;

      if (duration > maxHalfDayMins) {
        throw new BadRequestError(`Half day duration (${duration} mins) exceeds maximum allowed half shift length (${maxHalfDayMins} mins)`, [
          { field: 'to_time', message: `Half day duration exceeds maximum allowed half shift length (${maxHalfDayMins} mins)` },
        ]);
      }
    }

    const empRec = await db('employees').where({ id: employeeId }).first();
    if (empRec && empRec.joining_date) {
      const empJoiningDate = empRec.joining_date instanceof Date ? empRec.joining_date.toISOString().split('T')[0] : String(empRec.joining_date);
      if (data.from_date < empJoiningDate) {
        const jDateObj = new Date(empJoiningDate + 'T00:00:00');
        const formattedDate = jDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        throw new BadRequestError(
          `Leave cannot be applied for dates before joining date (${formattedDate}).`,
          [{ field: 'from_date', message: `Leave cannot be applied for dates before joining date (${formattedDate}).` }]
        );
      }
    }

    // 1. Calculate working days
    const calc = await this.calculateWorkingDays(
      data.from_date,
      data.to_date,
      Boolean(data.is_half_day)
    );

    const daysCount = isPermission ? 0.0 : calc.days;

    if (!isPermission && calc.days <= 0) {
      throw new BadRequestError(
        'Selected date range contains no working days (all selected days are weekly offs or holidays).'
      );
    }

    // 2. Block overlapping requests
    const overlap = await leavesRepository.findOverlapping(
      employeeId,
      data.from_date,
      data.to_date,
      Boolean(data.is_half_day || isPermission),
      fromTime,
      toTime
    );

    if (overlap) {
      throw new BadRequestError(
        `You already have an active leave request (${overlap.leave_type_name}, ${overlap.from_date} to ${overlap.to_date}, status: ${overlap.status}) overlapping with these dates.`
      );
    }

    // 3. Verify balance (except LOP and Permission)
    const requestYear = new Date(data.from_date).getFullYear();
    const balance = await leavesRepository.findBalance(
      employeeId,
      leaveType.id,
      requestYear
    );

    const isLop = leaveType.code === 'LOP';
    if (!isLop && !isPermission) {
      const remaining = balance?.remaining ?? 0;
      if (daysCount > remaining) {
        throw new BadRequestError(
          `Insufficient leave balance for ${leaveType.name}. Available remaining: ${remaining}, Requested: ${daysCount}`
        );
      }
    }

    // 4. Create request and increment pending in DB Transaction
    let createdRequest: LeaveRequest;
    await db.transaction(async (trx) => {
      if (!balance && !isPermission) {
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
          from_time: fromTime,
          to_time: toTime,
          days: daysCount,
          reason: data.reason,
          status: 'pending',
        },
        trx
      );

      // Create day breakdown rows for working dates
      const dayType = data.is_half_day
        ? data.half_day_session === 'second'
          ? 'second_half'
          : 'first_half'
        : 'full';

      const dayRows = calc.workingDates.map((dateStr) => ({
        leave_request_id: createdRequest.id,
        date: dateStr,
        day_type: dayType as 'full' | 'first_half' | 'second_half',
        from_time: fromTime,
        to_time: toTime,
        status: 'pending',
      }));

      if (dayRows.length > 0) {
        await leavesRepository.createRequestDays(dayRows, trx);
      }

      // Increment pending in leave_balances if daysCount > 0
      if (daysCount > 0) {
        await leavesRepository.adjustBalance(
          employeeId,
          leaveType.id,
          requestYear,
          { pendingDelta: daysCount },
          trx
        );
      }
    });

    // 5. Notify Reporting Manager (fallback to HR if no manager)
    try {
      const employee = await db('employees').where({ id: employeeId }).first();
      let notifyUserId: number | null = null;

      if (employee?.reporting_manager_id) {
        const manager = await db('employees')
          .where({ id: employee.reporting_manager_id })
          .first();
        notifyUserId = manager?.user_id || null;
      }

      if (!notifyUserId) {
        const hrUser = await db('users')
          .join('user_roles', 'users.id', 'user_roles.user_id')
          .join('roles', 'user_roles.role_id', 'roles.id')
          .where('roles.name', SYSTEM_ROLES.HR)
          .where('users.status', 'active')
          .select('users.id')
          .first();
        notifyUserId = hrUser?.id || null;
      }

      if (notifyUserId && employee) {
        await notificationService.notify({
          eventKey: `leave.applied:req:${createdRequest!.id}`,
          userIds: notifyUserId,
          type: 'info',
          title: 'New Leave Request',
          message: `${employee.first_name} ${employee.last_name} applied for ${daysCount} day(s) of ${leaveType.name} (${data.from_date} to ${data.to_date})`,
          link: '/leaves/approvals',
        });
      }
    } catch {
      // Non-fatal
    }

    return createdRequest!;
  }

  // ==========================================
  // APPROVE LEAVE REQUEST (supports Partial Approval)
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

    // Self approval prevention
    if (currentUser.employeeId && currentUser.employeeId === request.employee_id) {
      throw new ForbiddenError('You cannot approve your own leave request.');
    }

    // Permission check: reporting manager or HR/Admin
    const employee = await db('employees').where({ id: request.employee_id }).first();
    const isReportingManager =
      currentUser.employeeId &&
      employee?.reporting_manager_id === currentUser.employeeId;
    const isHrOrAdmin =
      hasRole(currentUser.roles, SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.HR) ||
      currentUser.permissions.includes('leave.approve') ||
      currentUser.permissions.includes('*');

    if (!isReportingManager && !isHrOrAdmin) {
      throw new ForbiddenError(
        'You are not authorized to approve this leave request. Only the reporting manager or HR/Admin can approve.'
      );
    }

    const dayRows = await leavesRepository.findRequestDays(requestId);
    const approvedDateSet = new Set(dto.approved_dates || dayRows.map((d) => d.date));
    const rejectedDateSet = new Set(dto.rejected_dates || []);

    const hasRejectedDays = dayRows.some((d) => !approvedDateSet.has(d.date) || rejectedDateSet.has(d.date));
    if (hasRejectedDays && (!dto.decision_note || dto.decision_note.trim().length === 0)) {
      throw new BadRequestError('Decision note is mandatory when partially approving or rejecting days.');
    }

    let approvedDaysCount = 0.0;
    let rejectedDaysCount = 0.0;

    const approvedDates: string[] = [];

    for (const d of dayRows) {
      const isApproved = approvedDateSet.has(d.date) && !rejectedDateSet.has(d.date);
      const dayWeight = request.is_half_day ? 0.5 : 1.0;
      const note = dto.day_notes?.[d.date] || dto.decision_note || (isApproved ? 'Approved' : 'Rejected');

      if (isApproved) {
        approvedDaysCount += dayWeight;
        approvedDates.push(d.date);
        await leavesRepository.updateRequestDayStatus(
          d.id,
          'approved',
          note,
          currentUser.employeeId
        );
      } else {
        rejectedDaysCount += dayWeight;
        await leavesRepository.updateRequestDayStatus(
          d.id,
          'rejected',
          note,
          currentUser.employeeId
        );
      }
    }

    // If dayRows were empty (legacy fallback), default to request.days
    if (dayRows.length === 0) {
      approvedDaysCount = request.days;
    }

    // Determine derived request status
    let derivedStatus: 'approved' | 'partially_approved' | 'rejected' = 'approved';
    if (approvedDaysCount === 0) {
      derivedStatus = 'rejected';
    } else if (rejectedDaysCount > 0) {
      derivedStatus = 'partially_approved';
    }

    const requestYear = new Date(request.from_date).getFullYear();
    const isWfh = request.leave_type_code === 'WFH';

    let updatedRequest: LeaveRequest;
    await db.transaction(async (trx) => {
      // 1. Update master leave_requests row
      updatedRequest = await leavesRepository.updateRequestStatus(
        request.id,
        {
          status: derivedStatus as any,
          approver_employee_id: currentUser.employeeId || null,
          decided_at: new Date(),
          decision_note: dto.decision_note || (derivedStatus === 'approved' ? 'Approved' : 'Partially Approved'),
          approved_days: approvedDaysCount,
          rejected_days: rejectedDaysCount,
        },
        trx
      );

      // 2. Adjust balance: pending -= requested.days, used += approvedDaysCount
      await leavesRepository.adjustBalance(
        request.employee_id,
        request.leave_type_id,
        requestYear,
        {
          pendingDelta: -request.days,
          usedDelta: approvedDaysCount,
        },
        trx
      );

      // 3. Sync attendance ONLY for approved dates
      for (const dateStr of approvedDates) {
        await leavesRepository.syncAttendanceForLeave(
          request.employee_id,
          dateStr,
          request.is_half_day,
          request.leave_type_name || 'Leave',
          isWfh,
          trx
        );
      }
    });

    // 4. Notify applicant with unique eventKey
    try {
      if (employee?.user_id) {
        const notifMsg =
          derivedStatus === 'partially_approved'
            ? `Leave ${request.from_date} to ${request.to_date} partly approved: ${approvedDaysCount} of ${request.days} days approved.`
            : `Your leave request for ${approvedDaysCount} day(s) from ${request.from_date} to ${request.to_date} has been approved.`;

        await notificationService.notify({
          eventKey: `leave.${derivedStatus}:req:${request.id}`,
          userIds: employee.user_id,
          type: derivedStatus === 'partially_approved' ? 'warning' : 'success',
          title: derivedStatus === 'partially_approved' ? 'Leave Partially Approved' : 'Leave Request Approved',
          message: notifMsg,
          link: '/leaves/my',
        });
      }
    } catch {
      // Non-fatal
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

    // Self rejection check
    if (currentUser.employeeId && currentUser.employeeId === request.employee_id) {
      throw new ForbiddenError('You cannot reject your own leave request.');
    }

    // Permission check
    const employee = await db('employees').where({ id: request.employee_id }).first();
    const isReportingManager =
      currentUser.employeeId &&
      employee?.reporting_manager_id === currentUser.employeeId;
    const isHrOrAdmin =
      hasRole(currentUser.roles, SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.HR) ||
      currentUser.permissions.includes('leave.approve') ||
      currentUser.permissions.includes('*');

    if (!isReportingManager && !isHrOrAdmin) {
      throw new ForbiddenError(
        'You are not authorized to reject this leave request.'
      );
    }

    const requestYear = new Date(request.from_date).getFullYear();

    let updatedRequest: LeaveRequest;
    await db.transaction(async (trx) => {
      // 1. Update day rows
      const dayRows = await leavesRepository.findRequestDays(request.id, trx);
      for (const d of dayRows) {
        await leavesRepository.updateRequestDayStatus(
          d.id,
          'rejected',
          dto.decision_note,
          currentUser.employeeId,
          trx
        );
      }

      // 2. Update master request row
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

      await trx('leave_requests').where({ id: request.id }).update({
        approved_days: 0,
        rejected_days: request.days,
      });

      // 3. Transition balance: pending -= days (restored to available)
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

    // 4. Notify applicant employee
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
    } catch {
      // Non-fatal
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

    const isApplicant =
      currentUser.employeeId && currentUser.employeeId === request.employee_id;
    const isAdmin = hasRole(currentUser.roles, SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.HR);

    if (!isApplicant && !isAdmin) {
      throw new ForbiddenError('You can only cancel your own leave requests.');
    }

    if (request.status === 'cancelled' || request.status === 'rejected') {
      throw new BadRequestError(
        `Cannot cancel a leave request that is already ${request.status}.`
      );
    }

    const todayStr = getTodayKolkata();
    const requestYear = new Date(request.from_date).getFullYear();

    let updatedRequest: LeaveRequest;
    await db.transaction(async (trx) => {
      const dayRows = await leavesRepository.findRequestDays(request.id, trx);

      if (request.status === 'pending') {
        // Pending cancellation
        for (const d of dayRows) {
          await leavesRepository.updateRequestDayStatus(d.id, 'cancelled', 'Cancelled by applicant', currentUser.employeeId, trx);
        }

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
      } else if (request.status === 'approved' || request.status === 'partially_approved') {
        // Approved/Partial cancellation: allowed only if dates >= today
        const approvedDaysToCancel = dayRows.filter((d) => d.status === 'approved' && d.date >= todayStr);
        if (approvedDaysToCancel.length === 0 && request.from_date < todayStr) {
          throw new BadRequestError(
            'Cannot cancel an approved leave that has already started or passed in the past.'
          );
        }

        for (const d of approvedDaysToCancel) {
          await leavesRepository.updateRequestDayStatus(d.id, 'cancelled', 'Cancelled by applicant (Future Leave)', currentUser.employeeId, trx);
        }

        const daysRevertedCount = approvedDaysToCancel.length * (request.is_half_day ? 0.5 : 1.0);

        updatedRequest = await leavesRepository.updateRequestStatus(
          request.id,
          {
            status: 'cancelled',
            decision_note: 'Cancelled by applicant (Future Approved Leave)',
          },
          trx
        );

        // Revert used quota
        await leavesRepository.adjustBalance(
          request.employee_id,
          request.leave_type_id,
          requestYear,
          {
            usedDelta: -daysRevertedCount,
          },
          trx
        );

        // Revert attendance rows for cancelled dates
        const datesToRevert = approvedDaysToCancel.map((d) => d.date);
        await leavesRepository.revertAttendanceForLeave(
          request.employee_id,
          datesToRevert,
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
      hasRole(currentUser.roles, SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.HR) ||
      currentUser.permissions.includes('leave.approve') ||
      currentUser.permissions.includes('*');

    const requests = isHrOrAdmin
      ? await leavesRepository.findPendingRequests()
      : currentUser.employeeId
      ? await leavesRepository.findPendingRequests(currentUser.employeeId)
      : [];

    for (const req of requests) {
      req.day_rows = await leavesRepository.findRequestDays(req.id);
    }

    return requests;
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
      hasRole(currentUser.roles, SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.HR) ||
      currentUser.permissions.includes('leave.view') ||
      currentUser.permissions.includes('*');

    const reportingManagerId = isHrOrAdmin ? undefined : (currentUser.employeeId || -1);

    return leavesRepository.findApprovedLeavesForMonth(startDate, endDate, reportingManagerId);
  }
}

export const leavesService = new LeavesService();
