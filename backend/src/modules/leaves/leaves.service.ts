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
import {
  leaveAppliedEmailTemplate,
  leaveStatusEmailTemplate,
} from '../../shared/services/email.templates';
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

    const [startYear, startMonth, startDay] = fromDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = toDate.split('-').map(Number);

    // Collect all year-month pairs spanned by the range using integer math
    const monthsToFetch: Array<{ year: number; month: number }> = [];
    let curYear = startYear;
    let curMonth = startMonth;

    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
      monthsToFetch.push({
        year: curYear,
        month: curMonth,
      });
      curMonth++;
      if (curMonth > 12) {
        curMonth = 1;
        curYear++;
      }
    }

    // Accumulate all working dates across the spanned months
    const allWorkingDates = new Set<string>();
    for (const { year, month } of monthsToFetch) {
      const res = await getWorkingDays(year, month);
      res.workingDates.forEach((d) => allWorkingDates.add(d));
    }

    // Iterate day-by-day across [fromDate, toDate] using timezone-safe UTC
    const workingDates: string[] = [];
    const holidayOrWeekendDates: string[] = [];
    const weekendDates: string[] = [];
    const holidayDates: string[] = [];

    const pad = (n: number) => n.toString().padStart(2, '0');
    const iter = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    const endDateObj = new Date(Date.UTC(endYear, endMonth - 1, endDay));

    while (iter <= endDateObj) {
      const dateStr = `${iter.getUTCFullYear()}-${pad(iter.getUTCMonth() + 1)}-${pad(iter.getUTCDate())}`;
      const dayOfWeek = iter.getUTCDay();

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

      iter.setUTCDate(iter.getUTCDate() + 1);
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
    const targetYear = year || parseInt(getTodayKolkata().slice(0, 4), 10);
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
    const isLop = leaveType.code === 'LOP';

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
        const [jY, jM, jD] = empJoiningDate.split('-').map(Number);
        const jDateObj = new Date(Date.UTC(jY, jM - 1, jD));
        const formattedDate = jDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
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

    // Group working days by calendar year for cross-year leave splitting
    const daysByYear = new Map<number, number>();
    if (isPermission) {
      const yr = parseInt(data.from_date.slice(0, 4), 10);
      daysByYear.set(yr, 0);
    } else {
      for (const dateStr of calc.workingDates) {
        const yr = parseInt(dateStr.slice(0, 4), 10);
        const dayWeight = data.is_half_day ? 0.5 : 1.0;
        daysByYear.set(yr, (daysByYear.get(yr) || 0) + dayWeight);
      }
    }

    // 2. Execute DB transaction with concurrency control
    let createdRequest: LeaveRequest;
    await db.transaction(async (trx) => {
      // Permission monthly limit check inside transaction
      if (isPermission) {
        const monthPrefix = data.from_date.slice(0, 7);
        const existingPermsCount = await trx('leave_requests')
          .where({ employee_id: employeeId, leave_type_id: leaveType.id })
          .whereIn('status', ['pending', 'approved', 'partially_approved'])
          .whereRaw('from_date LIKE ?', [`${monthPrefix}%`])
          .count('id as count')
          .first();

        if (Number(existingPermsCount?.count || 0) >= 2) {
          throw new BadRequestError('Maximum limit of 2 Permission requests per month reached');
        }
      }

      // Overlap check inside transaction
      const overlap = await leavesRepository.findOverlapping(
        employeeId,
        data.from_date,
        data.to_date,
        Boolean(data.is_half_day || isPermission),
        fromTime,
        toTime,
        undefined,
        trx
      );

      if (overlap) {
        throw new BadRequestError(
          `You already have an active leave request (${overlap.leave_type_name}, ${overlap.from_date} to ${overlap.to_date}, status: ${overlap.status}) overlapping with these dates.`
        );
      }

      // Check balance with forUpdate() on each calendar year spanned
      for (const [year, requestedDaysForYear] of daysByYear.entries()) {
        let balanceRow = await trx('leave_balances')
          .where({
            employee_id: employeeId,
            leave_type_id: leaveType.id,
            year,
          })
          .forUpdate()
          .first();

        if (!balanceRow && !isPermission) {
          await leavesRepository.upsertBalance(
            {
              employee_id: employeeId,
              leave_type_id: leaveType.id,
              year,
              allocated: 0,
            },
            trx
          );
          balanceRow = await trx('leave_balances')
            .where({
              employee_id: employeeId,
              leave_type_id: leaveType.id,
              year,
            })
            .forUpdate()
            .first();
        }

        if (!isLop && !isPermission) {
          const allocated = Number(balanceRow?.allocated || 0);
          const used = Number(balanceRow?.used || 0);
          const pending = Number(balanceRow?.pending || 0);
          const remaining = allocated - used - pending;

          if (requestedDaysForYear > remaining) {
            throw new BadRequestError(
              `Insufficient leave balance for ${leaveType.name} in year ${year}. Available remaining: ${remaining}, Requested: ${requestedDaysForYear}`
            );
          }
        }
      }

      // Create master leave request row
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

      // Increment pending in leave_balances split per year
      for (const [year, requestedDaysForYear] of daysByYear.entries()) {
        if (requestedDaysForYear > 0) {
          await leavesRepository.adjustBalance(
            employeeId,
            leaveType.id,
            year,
            { pendingDelta: requestedDaysForYear },
            trx
          );
        }
      }
    });

    // Notify Reporting Manager (fallback to HR if no manager)
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
        const reviewUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/leaves/approvals`;
        const emailHtml = leaveAppliedEmailTemplate({
          managerName: 'Manager',
          employeeName: `${employee.first_name} ${employee.last_name}`,
          leaveType: leaveType.name,
          days: daysCount,
          fromDate: data.from_date,
          toDate: data.to_date,
          reason: data.reason,
          reviewUrl,
        });

        await notificationService.notify({
          eventKey: `leave.applied:req:${createdRequest!.id}`,
          userIds: notifyUserId,
          type: 'info',
          title: 'New Leave Request',
          message: `${employee.first_name} ${employee.last_name} applied for ${daysCount} day(s) of ${leaveType.name} (${data.from_date} to ${data.to_date})`,
          link: '/leaves/approvals',
          emailDetails: {
            eventType: 'leave_request',
            subject: `New Leave Request from ${employee.first_name} ${employee.last_name}`,
            html: emailHtml,
          },
        });
      }
    } catch (err) {
      console.error('[LEAVE_APPLY_NOTIFICATION_ERROR]', err);
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
    const isHrOrAdmin =
      hasRole(currentUser.roles, SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.HR) ||
      currentUser.roles.some((r) => ['admin', 'hr'].includes(r.toLowerCase())) ||
      currentUser.permissions.includes('leave.approve_all');

    let updatedRequest: LeaveRequest;
    let employeeUserId: number | null = null;
    let employeeFullName = '';
    let applicantFromDate = '';
    let applicantToDate = '';
    let leaveTypeName = '';
    let totalRequestedDays = 0;
    let derivedStatus: string = 'approved';
    let finalApprovedDaysCount = 0;

    await db.transaction(async (trx) => {
      // 1. Read request with forUpdate() inside transaction
      await trx('leave_requests').where({ id: requestId }).forUpdate().first();
      const request = await leavesRepository.findRequestById(requestId, trx);
      if (!request) {
        throw new NotFoundError(`Leave request with ID ${requestId} not found`);
      }

      // Re-check status inside transaction
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
      const employee = await trx('employees').where({ id: request.employee_id }).first();
      const isReportingManager =
        currentUser.employeeId &&
        employee?.reporting_manager_id === currentUser.employeeId;

      if (!isReportingManager && !isHrOrAdmin) {
        throw new ForbiddenError(
          'You are not authorized to approve this leave request. Only the reporting manager or HR/Admin can approve.'
        );
      }

      const dayRows = await leavesRepository.findRequestDays(requestId, trx);
      const approvedDateSet = new Set(dto.approved_dates || dayRows.map((d) => d.date));
      const rejectedDateSet = new Set(dto.rejected_dates || []);

      const hasRejectedDays = dayRows.some((d) => !approvedDateSet.has(d.date) || rejectedDateSet.has(d.date));
      if (hasRejectedDays && (!dto.decision_note || dto.decision_note.trim().length === 0)) {
        throw new BadRequestError('Decision note is mandatory when partially approving or rejecting days.');
      }

      let approvedDaysCount = 0.0;
      let rejectedDaysCount = 0.0;
      const approvedDates: string[] = [];

      const requestedDaysByYear = new Map<number, number>();
      const approvedDaysByYear = new Map<number, number>();

      for (const d of dayRows) {
        const yr = parseInt(d.date.slice(0, 4), 10);
        const dayWeight = request.is_half_day ? 0.5 : 1.0;
        requestedDaysByYear.set(yr, (requestedDaysByYear.get(yr) || 0) + dayWeight);

        const isApproved = approvedDateSet.has(d.date) && !rejectedDateSet.has(d.date);
        const note = dto.day_notes?.[d.date] || dto.decision_note || (isApproved ? 'Approved' : 'Rejected');

        if (isApproved) {
          approvedDaysCount += dayWeight;
          approvedDates.push(d.date);
          approvedDaysByYear.set(yr, (approvedDaysByYear.get(yr) || 0) + dayWeight);
          await leavesRepository.updateRequestDayStatus(
            d.id,
            'approved',
            note,
            currentUser.employeeId,
            trx
          );
        } else {
          rejectedDaysCount += dayWeight;
          await leavesRepository.updateRequestDayStatus(
            d.id,
            'rejected',
            note,
            currentUser.employeeId,
            trx
          );
        }
      }

      if (dayRows.length === 0) {
        const fallbackYear = parseInt(request.from_date.slice(0, 4), 10);
        requestedDaysByYear.set(fallbackYear, request.days);
        approvedDaysByYear.set(fallbackYear, request.days);
        approvedDaysCount = request.days;
      }

      if (approvedDaysCount === 0) {
        derivedStatus = 'rejected';
      } else if (rejectedDaysCount > 0) {
        derivedStatus = 'partially_approved';
      }

      const isWfh = request.leave_type_code === 'WFH';

      // Update master leave_requests row
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
        trx,
        ['pending']
      );

      // Adjust balances per year
      for (const [yr, reqCount] of requestedDaysByYear.entries()) {
        const appCount = approvedDaysByYear.get(yr) || 0;
        await leavesRepository.adjustBalance(
          request.employee_id,
          request.leave_type_id,
          yr,
          {
            pendingDelta: -reqCount,
            usedDelta: appCount,
          },
          trx
        );
      }

      // Sync attendance ONLY for approved dates
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

      employeeUserId = employee?.user_id || null;
      employeeFullName = employee ? `${employee.first_name} ${employee.last_name}` : '';
      applicantFromDate = request.from_date;
      applicantToDate = request.to_date;
      leaveTypeName = request.leave_type_name || 'Leave';
      totalRequestedDays = request.days;
      finalApprovedDaysCount = approvedDaysCount;
    });

    // Notify applicant with unique eventKey
    try {
      if (employeeUserId) {
        const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/leaves/my`;

        let notifMsg = '';
        let notifType: 'success' | 'warning' | 'danger' = 'success';
        let notifTitle = '';
        let emailSubject = '';

        if (derivedStatus === 'rejected') {
          notifType = 'danger';
          notifTitle = 'Leave Request Rejected';
          notifMsg = `Your leave request for ${applicantFromDate} to ${applicantToDate} was rejected.${dto.decision_note ? ` Reason: ${dto.decision_note}` : ''}`;
          emailSubject = 'Leave Request Rejected';
        } else if (derivedStatus === 'partially_approved') {
          notifType = 'warning';
          notifTitle = 'Leave Partially Approved';
          notifMsg = `Leave ${applicantFromDate} to ${applicantToDate} partly approved: ${finalApprovedDaysCount} of ${totalRequestedDays} days approved.`;
          emailSubject = 'Leave Request Partially Approved';
        } else {
          notifType = 'success';
          notifTitle = 'Leave Request Approved';
          notifMsg = `Your leave request for ${finalApprovedDaysCount} day(s) from ${applicantFromDate} to ${applicantToDate} has been approved.`;
          emailSubject = 'Leave Request Approved';
        }

        const emailHtml = leaveStatusEmailTemplate({
          employeeName: employeeFullName,
          status: derivedStatus,
          leaveType: leaveTypeName,
          days: derivedStatus === 'rejected' ? totalRequestedDays : finalApprovedDaysCount,
          decisionNote: dto.decision_note,
          portalUrl,
        });

        await notificationService.notify({
          eventKey: `leave.${derivedStatus}:req:${requestId}`,
          userIds: employeeUserId,
          type: notifType,
          title: notifTitle,
          message: notifMsg,
          link: '/leaves/my',
          emailDetails: {
            eventType: 'leave_status',
            subject: emailSubject,
            html: emailHtml,
          },
        });
      }
    } catch (err) {
      console.error('[LEAVE_APPROVE_NOTIFICATION_ERROR]', err);
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

    const isHrOrAdmin =
      hasRole(currentUser.roles, SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.HR) ||
      currentUser.roles.some((r) => ['admin', 'hr'].includes(r.toLowerCase())) ||
      currentUser.permissions.includes('leave.approve_all');

    let updatedRequest: LeaveRequest;
    let employeeUserId: number | null = null;
    let employeeFullName = '';
    let applicantFromDate = '';
    let applicantToDate = '';
    let leaveTypeName = '';
    let totalRequestedDays = 0;

    await db.transaction(async (trx) => {
      await trx('leave_requests').where({ id: requestId }).forUpdate().first();
      const request = await leavesRepository.findRequestById(requestId, trx);
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
      const employee = await trx('employees').where({ id: request.employee_id }).first();
      const isReportingManager =
        currentUser.employeeId &&
        employee?.reporting_manager_id === currentUser.employeeId;

      if (!isReportingManager && !isHrOrAdmin) {
        throw new ForbiddenError(
          'You are not authorized to reject this leave request.'
        );
      }

      // 1. Update day rows
      const dayRows = await leavesRepository.findRequestDays(request.id, trx);
      const requestedDaysByYear = new Map<number, number>();

      for (const d of dayRows) {
        const yr = parseInt(d.date.slice(0, 4), 10);
        const dayWeight = request.is_half_day ? 0.5 : 1.0;
        requestedDaysByYear.set(yr, (requestedDaysByYear.get(yr) || 0) + dayWeight);

        await leavesRepository.updateRequestDayStatus(
          d.id,
          'rejected',
          dto.decision_note,
          currentUser.employeeId,
          trx
        );
      }

      if (dayRows.length === 0) {
        const fallbackYear = parseInt(request.from_date.slice(0, 4), 10);
        requestedDaysByYear.set(fallbackYear, request.days);
      }

      // 2. Update master request row
      updatedRequest = await leavesRepository.updateRequestStatus(
        request.id,
        {
          status: 'rejected',
          approver_employee_id: currentUser.employeeId || null,
          decided_at: new Date(),
          decision_note: dto.decision_note,
          approved_days: 0,
          rejected_days: request.days,
        },
        trx,
        ['pending']
      );

      // 3. Transition balance: pending -= days per year
      for (const [yr, reqCount] of requestedDaysByYear.entries()) {
        await leavesRepository.adjustBalance(
          request.employee_id,
          request.leave_type_id,
          yr,
          {
            pendingDelta: -reqCount,
          },
          trx
        );
      }

      employeeUserId = employee?.user_id || null;
      employeeFullName = employee ? `${employee.first_name} ${employee.last_name}` : '';
      applicantFromDate = request.from_date;
      applicantToDate = request.to_date;
      leaveTypeName = request.leave_type_name || 'Leave';
      totalRequestedDays = request.days;
    });

    // 4. Notify applicant employee
    try {
      if (employeeUserId) {
        const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/leaves/my`;
        const emailHtml = leaveStatusEmailTemplate({
          employeeName: employeeFullName,
          status: 'rejected',
          leaveType: leaveTypeName,
          days: totalRequestedDays,
          decisionNote: dto.decision_note,
          portalUrl,
        });

        await notificationService.notify({
          eventKey: `leave.rejected:req:${requestId}`,
          userIds: employeeUserId,
          type: 'danger',
          title: 'Leave Request Rejected',
          message: `Your leave request for ${applicantFromDate} to ${applicantToDate} was rejected. Reason: ${dto.decision_note}`,
          link: '/leaves/my',
          emailDetails: {
            eventType: 'leave_status',
            subject: 'Leave Request Rejected',
            html: emailHtml,
          },
        });
      }
    } catch (err) {
      console.error('[LEAVE_REJECT_NOTIFICATION_ERROR]', err);
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
    const isAdmin =
      hasRole(currentUser.roles, SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.HR) ||
      currentUser.roles.some((r) => ['admin', 'hr'].includes(r.toLowerCase())) ||
      currentUser.permissions.includes('leave.approve_all');

    const todayStr = getTodayKolkata();
    let updatedRequest: LeaveRequest;

    await db.transaction(async (trx) => {
      await trx('leave_requests').where({ id: requestId }).forUpdate().first();
      const request = await leavesRepository.findRequestById(requestId, trx);
      if (!request) {
        throw new NotFoundError(`Leave request with ID ${requestId} not found`);
      }

      const isApplicant = Boolean(
        currentUser.employeeId && currentUser.employeeId === request.employee_id
      );

      if (!isApplicant && !isAdmin) {
        throw new ForbiddenError('You can only cancel your own leave requests.');
      }

      if (request.status === 'cancelled' || request.status === 'rejected') {
        throw new BadRequestError(
          `Cannot cancel a leave request that is already ${request.status}.`
        );
      }

      const actorNote = isAdmin && !isApplicant ? 'Cancelled by HR/Admin' : 'Cancelled by applicant';
      const dayRows = await leavesRepository.findRequestDays(request.id, trx);

      if (request.status === 'pending') {
        const requestedDaysByYear = new Map<number, number>();
        for (const d of dayRows) {
          const yr = parseInt(d.date.slice(0, 4), 10);
          const dayWeight = request.is_half_day ? 0.5 : 1.0;
          requestedDaysByYear.set(yr, (requestedDaysByYear.get(yr) || 0) + dayWeight);

          await leavesRepository.updateRequestDayStatus(
            d.id,
            'cancelled',
            actorNote,
            currentUser.employeeId,
            trx
          );
        }

        if (dayRows.length === 0) {
          const fallbackYear = parseInt(request.from_date.slice(0, 4), 10);
          requestedDaysByYear.set(fallbackYear, request.days);
        }

        updatedRequest = await leavesRepository.updateRequestStatus(
          request.id,
          {
            status: 'cancelled',
            decision_note: actorNote,
          },
          trx,
          ['pending']
        );

        for (const [yr, reqCount] of requestedDaysByYear.entries()) {
          await leavesRepository.adjustBalance(
            request.employee_id,
            request.leave_type_id,
            yr,
            { pendingDelta: -reqCount },
            trx
          );
        }
      } else if (request.status === 'approved' || request.status === 'partially_approved') {
        // Only cancel future days: date >= todayStr
        const approvedDaysToCancel = dayRows.filter(
          (d) => d.status === 'approved' && d.date >= todayStr
        );

        if (approvedDaysToCancel.length === 0) {
          throw new BadRequestError(
            'Cannot cancel an approved leave that has already started or passed in the past.'
          );
        }

        const pastApprovedDays = dayRows.filter(
          (d) => d.status === 'approved' && d.date < todayStr
        );

        for (const d of approvedDaysToCancel) {
          await leavesRepository.updateRequestDayStatus(
            d.id,
            'cancelled',
            `${actorNote} (Future Leave)`,
            currentUser.employeeId,
            trx
          );
        }

        const daysRevertedCount =
          approvedDaysToCancel.length * (request.is_half_day ? 0.5 : 1.0);

        // Keep status 'approved' or 'partially_approved' if any past days were taken
        const nextStatus = pastApprovedDays.length > 0 ? request.status : 'cancelled';
        const note =
          pastApprovedDays.length > 0
            ? `${actorNote} (Future days cancelled)`
            : `${actorNote} (Future Approved Leave)`;

        const remainingApprovedDays = Math.max(
          0,
          Number(request.approved_days || request.days) - daysRevertedCount
        );

        updatedRequest = await leavesRepository.updateRequestStatus(
          request.id,
          {
            status: nextStatus,
            decision_note: note,
            approved_days: remainingApprovedDays,
          },
          trx,
          ['approved', 'partially_approved']
        );

        // Revert used quota per year for cancelled approved days
        const cancelledApprovedByYear = new Map<number, number>();
        for (const d of approvedDaysToCancel) {
          const yr = parseInt(d.date.slice(0, 4), 10);
          const dayWeight = request.is_half_day ? 0.5 : 1.0;
          cancelledApprovedByYear.set(
            yr,
            (cancelledApprovedByYear.get(yr) || 0) + dayWeight
          );
        }

        for (const [yr, cancelledCount] of cancelledApprovedByYear.entries()) {
          await leavesRepository.adjustBalance(
            request.employee_id,
            request.leave_type_id,
            yr,
            { usedDelta: -cancelledCount },
            trx
          );
        }

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
      currentUser.roles.some((r) => ['admin', 'hr'].includes(r.toLowerCase())) ||
      currentUser.permissions.includes('leave.approve_all');

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
    const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
    const pad = (n: number) => n.toString().padStart(2, '0');

    const startDate = `${month}-01`;
    const endDate = `${month}-${pad(lastDay)}`;

    const isHrOrAdmin =
      hasRole(currentUser.roles, SYSTEM_ROLES.ADMIN, SYSTEM_ROLES.HR) ||
      currentUser.roles.some((r) => ['admin', 'hr'].includes(r.toLowerCase())) ||
      currentUser.permissions.includes('leave.approve_all');

    const reportingManagerId = isHrOrAdmin ? undefined : (currentUser.employeeId || -1);

    return leavesRepository.findApprovedLeavesForMonth(startDate, endDate, reportingManagerId);
  }
}

export const leavesService = new LeavesService();
