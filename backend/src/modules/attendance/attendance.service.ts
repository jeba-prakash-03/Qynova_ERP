import db from '../../db/knex';
import { attendanceRepository } from './attendance.repository';
import { holidaysService } from '../holidays/holidays.service';
import {
  Attendance,
  AttendanceBreak,
  AttendanceStatus,
  CheckInDto,
  CheckOutDto,
  ManualAttendanceDto,
  UpdateAttendanceDto,
  DailySheetItem,
  MonthlySheetEmployee,
} from './attendance.types';
import {
  getKolkataDateString,
  getKolkataMinutesOfDay,
  timeStringToMinutes,
} from '../../shared/utils/date.util';
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error';
import { auditService } from '../../shared/services/audit.service';
import {
  calculateHaversineDistance,
  isValidCoordinate,
  validateLocationAccuracy,
} from '../../shared/utils/geo.util';

export class AttendanceService {
  /**
   * Checks whether an employee has an approved Work From Home (WFH) request for the given date.
   */
  async isWfhApproved(employeeId: number, date: string): Promise<boolean> {
    // 1. Check existing attendance row
    const existing = await db('attendance')
      .where({ employee_id: employeeId, date })
      .first();
    if (existing && (existing.status === 'wfh' || existing.work_type === 'wfh')) {
      return true;
    }

    // 2. Check approved leave requests for WFH covering this date
    const approvedLeave = await db('leave_requests as lr')
      .join('leave_types as lt', 'lr.leave_type_id', 'lt.id')
      .join('leave_request_days as lrd', 'lrd.leave_request_id', 'lr.id')
      .where('lr.employee_id', employeeId)
      .where('lt.code', 'WFH')
      .where('lrd.date', date)
      .where('lrd.status', 'approved')
      .whereIn('lr.status', ['approved', 'partially_approved'])
      .first();

    return Boolean(approvedLeave);
  }

  /**
   * Employee Check-In
   */
  async checkIn(employeeId: number, dto: CheckInDto): Promise<Attendance> {
    const today = getKolkataDateString();

    const emp = await db('employees').where({ id: employeeId }).first();
    if (emp && emp.joining_date) {
      const empJoiningDate = emp.joining_date instanceof Date ? emp.joining_date.toISOString().split('T')[0] : String(emp.joining_date);
      if (today < empJoiningDate) {
        const jDateObj = new Date(empJoiningDate + 'T00:00:00');
        const formattedDate = jDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        throw new BadRequestError(`Employee joined on ${formattedDate}`);
      }
    }

    const existing = await attendanceRepository.findByEmployeeAndDate(employeeId, today);

    if (existing && existing.check_in) {
      throw new BadRequestError(`You have already checked in today at ${existing.check_in}`);
    }

    const now = new Date();
    const workSettings = await holidaysService.getWorkSettings();

    // 1. WFH Authorization check
    const isWfh = dto.work_type === 'wfh';
    if (isWfh) {
      const wfhAuthorized = await this.isWfhApproved(employeeId, today);
      if (!wfhAuthorized) {
        throw new BadRequestError(
          'Work from home check-in requires an approved WFH request for today. Please submit a WFH request in Leaves or check in at the office.'
        );
      }
    }

    // 2. Office Geofencing Verification (for office check-in)
    let locationMeta: {
      check_in_latitude?: number | null;
      check_in_longitude?: number | null;
      check_in_accuracy?: number | null;
      check_in_distance_meters?: number | null;
      office_location_id?: number | null;
    } = {};

    if (!isWfh && workSettings.geofencing_enabled) {
      // Gather all candidate offices (primary office + active multiple office locations)
      interface OfficeCandidate {
        id: number | null;
        name: string;
        latitude: number;
        longitude: number;
        radius_meters: number;
      }
      const candidates: OfficeCandidate[] = [];

      if (
        workSettings.office_latitude !== null &&
        workSettings.office_latitude !== undefined &&
        workSettings.office_longitude !== null &&
        workSettings.office_longitude !== undefined
      ) {
        candidates.push({
          id: null,
          name: workSettings.office_name || 'Primary Office',
          latitude: Number(workSettings.office_latitude),
          longitude: Number(workSettings.office_longitude),
          radius_meters: Number(workSettings.office_radius_meters) || 100,
        });
      }

      const activeOffices = await db('office_locations')
        .where({ is_active: true })
        .select('*');

      for (const o of activeOffices) {
        candidates.push({
          id: Number(o.id),
          name: o.name,
          latitude: Number(o.latitude),
          longitude: Number(o.longitude),
          radius_meters: Number(o.radius_meters) || 100,
        });
      }

      // Fail closed if geofencing is enabled but no office is configured
      if (candidates.length === 0) {
        throw new BadRequestError(
          'Office location has not been configured. Please contact your administrator.'
        );
      }

      // Validate submitted coordinates presence
      if (
        dto.latitude === undefined ||
        dto.latitude === null ||
        dto.longitude === undefined ||
        dto.longitude === null ||
        dto.accuracy === undefined ||
        dto.accuracy === null
      ) {
        throw new BadRequestError(
          'Location coordinates and accuracy are required for office check-in.'
        );
      }

      // Validate finite numbers & degree bounds
      if (!isValidCoordinate(dto.latitude, dto.longitude)) {
        throw new BadRequestError('Invalid latitude or longitude coordinates provided.');
      }

      // Validate reported GPS accuracy against configured threshold
      const maxAccuracy = workSettings.min_location_accuracy_meters || 50;
      const accuracyCheck = validateLocationAccuracy(dto.accuracy, maxAccuracy);
      if (!accuracyCheck.valid) {
        throw new BadRequestError(accuracyCheck.reason!);
      }

      // Calculate distance to each configured office and find the closest
      let closestCandidate: OfficeCandidate | null = null;
      let minDistance = Infinity;

      for (const cand of candidates) {
        const dist = calculateHaversineDistance(
          dto.latitude,
          dto.longitude,
          cand.latitude,
          cand.longitude
        );
        if (dist < minDistance) {
          minDistance = dist;
          closestCandidate = cand;
        }
      }

      if (!closestCandidate || minDistance > closestCandidate.radius_meters) {
        const allowed = closestCandidate ? closestCandidate.radius_meters : (workSettings.office_radius_meters || 100);
        throw new BadRequestError(
          `You are outside the permitted office check-in area (distance: ${Math.round(minDistance)}m, allowed: ${allowed}m).`
        );
      }

      locationMeta = {
        check_in_latitude: dto.latitude,
        check_in_longitude: dto.longitude,
        check_in_accuracy: dto.accuracy,
        check_in_distance_meters: minDistance,
        office_location_id: closestCandidate.id,
      };
    } else if (!isWfh && isValidCoordinate(dto.latitude, dto.longitude)) {
      // Optional recording when geofencing is disabled
      locationMeta = {
        check_in_latitude: dto.latitude,
        check_in_longitude: dto.longitude,
        check_in_accuracy: typeof dto.accuracy === 'number' && Number.isFinite(dto.accuracy) ? dto.accuracy : null,
      };
    }

    // Check if late (check_in minutes > shift_start + grace)
    const checkInMinutes = getKolkataMinutesOfDay(now);
    const shiftStartMinutes = timeStringToMinutes(workSettings.shift_start);
    const lateThreshold = shiftStartMinutes + workSettings.late_grace_minutes;
    const isLate = checkInMinutes > lateThreshold;

    const status: AttendanceStatus = isWfh ? 'wfh' : 'present';

    if (existing) {
      // Update existing record if created as placeholder
      const updated = await attendanceRepository.update(existing.id, {
        check_in: now.toISOString(),
        status,
        work_type: dto.work_type || 'office',
        is_late: isLate,
        remarks: dto.remarks || existing.remarks,
        ...locationMeta,
      });
      return updated!;
    }

    return attendanceRepository.create({
      employee_id: employeeId,
      date: today,
      check_in: now,
      status,
      work_type: dto.work_type || 'office',
      is_late: isLate,
      remarks: dto.remarks,
      ...locationMeta,
    });
  }

  /**
   * Employee Check-Out
   */
  async checkOut(employeeId: number, dto: CheckOutDto): Promise<Attendance> {
    const today = getKolkataDateString();
    const attendance = await attendanceRepository.findByEmployeeAndDate(employeeId, today);

    if (!attendance || !attendance.check_in) {
      throw new BadRequestError('Cannot check out without checking in first');
    }

    if (attendance.check_out) {
      throw new BadRequestError('You have already checked out today');
    }

    const now = new Date();
    const checkInDate = new Date(attendance.check_in);

    // Auto-close open breaks on check-out
    await attendanceRepository.closeAllOpenBreaks(attendance.id, now);

    // Recalculate total break minutes
    const breaks = await attendanceRepository.getBreaks(attendance.id);
    let totalBreakMinutes = 0;
    for (const b of breaks) {
      if (b.break_end) {
        const diff = Math.round(
          (new Date(b.break_end).getTime() - new Date(b.break_start).getTime()) / 60000
        );
        totalBreakMinutes += Math.max(0, diff);
      }
    }

    // Calculate gross and net working minutes
    const grossMinutes = Math.round((now.getTime() - checkInDate.getTime()) / 60000);
    const workingMinutes = Math.max(0, grossMinutes - totalBreakMinutes);

    // Work settings calculation
    const workSettings = await holidaysService.getWorkSettings();
    const shiftEndMinutes = timeStringToMinutes(workSettings.shift_end);
    const shiftStartMinutes = timeStringToMinutes(workSettings.shift_start);
    const shiftLengthMinutes = Math.max(0, shiftEndMinutes - shiftStartMinutes);

    const checkOutMinutes = getKolkataMinutesOfDay(now);
    const isEarlyCheckout = checkOutMinutes < shiftEndMinutes;

    // Overtime = minutes worked beyond shift length
    const overtimeMinutes = Math.max(0, workingMinutes - shiftLengthMinutes);

    // Determine status based on minimum hours
    const fullDayMinutes = workSettings.min_hours_full_day * 60;
    const halfDayMinutes = workSettings.min_hours_half_day * 60;

    let finalStatus: AttendanceStatus;
    if (workingMinutes >= fullDayMinutes) {
      finalStatus = attendance.work_type === 'wfh' ? 'wfh' : 'present';
    } else if (workingMinutes >= halfDayMinutes) {
      finalStatus = 'half_day';
    } else {
      finalStatus = 'absent';
    }

    const updated = await attendanceRepository.update(attendance.id, {
      check_out: now.toISOString(),
      working_minutes: workingMinutes,
      break_minutes: totalBreakMinutes,
      overtime_minutes: overtimeMinutes,
      is_early_checkout: isEarlyCheckout,
      status: finalStatus,
      remarks: dto.remarks || attendance.remarks,
    });

    return updated!;
  }

  /**
   * Start Break
   */
  async startBreak(employeeId: number): Promise<AttendanceBreak> {
    const today = getKolkataDateString();
    const attendance = await attendanceRepository.findByEmployeeAndDate(employeeId, today);

    if (!attendance || !attendance.check_in) {
      throw new BadRequestError('Must check in before taking a break');
    }

    if (attendance.check_out) {
      throw new BadRequestError('Cannot take a break after checking out');
    }

    const openBreak = await attendanceRepository.findOpenBreak(attendance.id);
    if (openBreak) {
      throw new BadRequestError('You already have an active break in progress');
    }

    const now = new Date();
    return attendanceRepository.createBreak(attendance.id, now);
  }

  /**
   * End Break
   */
  async endBreak(employeeId: number): Promise<AttendanceBreak> {
    const today = getKolkataDateString();
    const attendance = await attendanceRepository.findByEmployeeAndDate(employeeId, today);

    if (!attendance) {
      throw new BadRequestError('No active attendance record found for today');
    }

    const openBreak = await attendanceRepository.findOpenBreak(attendance.id);
    if (!openBreak) {
      throw new BadRequestError('No active break found to end');
    }

    const now = new Date();
    await attendanceRepository.closeBreak(openBreak.id, now);

    // Recalculate break minutes on attendance record
    const breaks = await attendanceRepository.getBreaks(attendance.id);
    let totalBreakMinutes = 0;
    for (const b of breaks) {
      const endTime = b.id === openBreak.id ? now : (b.break_end ? new Date(b.break_end) : null);
      if (endTime) {
        const diff = Math.round((endTime.getTime() - new Date(b.break_start).getTime()) / 60000);
        totalBreakMinutes += Math.max(0, diff);
      }
    }

    await attendanceRepository.update(attendance.id, {
      break_minutes: totalBreakMinutes,
    });

    return {
      ...openBreak,
      break_end: now.toISOString(),
    };
  }

  /**
   * Get Current Employee's Attendance for Today
   */
  async getToday(employeeId: number): Promise<{
    attendance: Attendance | null;
    activeBreak: AttendanceBreak | null;
    serverTime: string;
    serverDate: string;
    shift: { start: string; end: string };
    is_wfh_approved: boolean;
    geofencing_enabled: boolean;
    office_name: string | null;
    allowed_radius_meters: number;
    min_accuracy_meters: number;
  }> {
    const today = getKolkataDateString();
    const attendance = await attendanceRepository.findByEmployeeAndDate(employeeId, today);
    const activeBreak = attendance ? await attendanceRepository.findOpenBreak(attendance.id) : null;
    const settings = await holidaysService.getWorkSettings();
    const isWfhApproved = await this.isWfhApproved(employeeId, today);

    return {
      attendance,
      activeBreak,
      serverTime: new Date().toISOString(),
      serverDate: today,
      shift: {
        start: settings.shift_start,
        end: settings.shift_end,
      },
      is_wfh_approved: isWfhApproved,
      geofencing_enabled: Boolean(settings.geofencing_enabled),
      office_name: settings.office_name ?? null,
      allowed_radius_meters: Number(settings.office_radius_meters) || 100,
      min_accuracy_meters: Number(settings.min_location_accuracy_meters) || 50,
    };
  }

  /**
   * Get Current Employee's Monthly Calendar & Stats
   */
  async getMyMonthly(employeeId: number, monthStr?: string): Promise<{
    month: string;
    records: Record<string, Attendance>;
    days: Record<string, { status: AttendanceStatus; name?: string }>;
    summary: {
      totalPresent: number;
      totalAbsent: number;
      totalHalfDay: number;
      totalLeave: number;
      totalHoliday: number;
      totalWeekend: number;
      totalWorkingMinutes: number;
      totalOvertimeMinutes: number;
    };
  }> {
    const now = new Date();
    const month = monthStr || `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const [year, m] = month.split('-').map(Number);

    const totalDays = new Date(year, m, 0).getDate();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const startDate = `${year}-${pad(m)}-01`;
    const endDate = `${year}-${pad(m)}-${pad(totalDays)}`;

    const [attendanceList, holidays, settings] = await Promise.all([
      attendanceRepository.findByEmployeeAndMonth(employeeId, startDate, endDate),
      holidaysService.getAll({ year, month: m }),
      holidaysService.getWorkSettings(),
    ]);

    const weeklyOffs = new Set(settings.weekly_off_days);
    const holidayMap = new Map(holidays.map((h) => [h.date, h.name]));
    const recordsMap: Record<string, Attendance> = {};
    for (const a of attendanceList) {
      recordsMap[a.date] = a;
    }

    const daysMap: Record<string, { status: AttendanceStatus; name?: string }> = {};

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHalfDay = 0;
    let totalLeave = 0;
    let totalHoliday = 0;
    let totalWeekend = 0;
    let totalWorkingMinutes = 0;
    let totalOvertimeMinutes = 0;

    const todayStr = getKolkataDateString();

    const empObj = await db('employees').where({ id: employeeId }).first();
    const empJoiningDate = empObj && empObj.joining_date ? (empObj.joining_date instanceof Date ? empObj.joining_date.toISOString().split('T')[0] : String(empObj.joining_date)) : '1970-01-01';
    const empLastWorkingDate = empObj && empObj.last_working_date ? (empObj.last_working_date instanceof Date ? empObj.last_working_date.toISOString().split('T')[0] : String(empObj.last_working_date)) : null;

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${pad(m)}-${pad(day)}`;
      const dateObj = new Date(year, m - 1, day);
      const dayOfWeek = dateObj.getDay();

      if (dateStr < empJoiningDate || (empLastWorkingDate && dateStr > empLastWorkingDate)) {
        daysMap[dateStr] = { status: 'not_joined' as any };
      } else if (recordsMap[dateStr]) {
        const att = recordsMap[dateStr];
        daysMap[dateStr] = { status: att.status };
        totalWorkingMinutes += att.working_minutes;
        totalOvertimeMinutes += att.overtime_minutes;

        if (att.status === 'present' || att.status === 'wfh') totalPresent++;
        else if (att.status === 'half_day') totalHalfDay++;
        else if (att.status === 'leave') totalLeave++;
        else if (att.status === 'absent') totalAbsent++;
      } else {
        // Compute virtual status for unrecorded days
        if (holidayMap.has(dateStr)) {
          daysMap[dateStr] = { status: 'holiday', name: holidayMap.get(dateStr) };
          totalHoliday++;
        } else if (weeklyOffs.has(dayOfWeek)) {
          daysMap[dateStr] = { status: 'weekend' };
          totalWeekend++;
        } else if (dateStr < todayStr) {
          // Past working day without punch -> mark as absent
          daysMap[dateStr] = { status: 'absent' };
          totalAbsent++;
        } else {
          // Today (in progress) or future day: do not count as absent yet
          daysMap[dateStr] = { status: null as any };
        }
      }
    }

    return {
      month,
      records: recordsMap,
      days: daysMap,
      summary: {
        totalPresent,
        totalAbsent,
        totalHalfDay,
        totalLeave,
        totalHoliday,
        totalWeekend,
        totalWorkingMinutes,
        totalOvertimeMinutes,
      },
    };
  }

  /**
   * Daily Attendance Sheet (Admin, HR, Manager)
   */
  async getDailySheet(options: {
    date: string;
    departmentId?: number;
    search?: string;
    reportingManagerId?: number;
  }): Promise<{ date: string; items: DailySheetItem[]; summary: Record<string, number> }> {
    const rows = await attendanceRepository.getDailySheet(options);

    // Get holiday and work settings for the requested date
    const holiday = await holidaysService.getAll({
      year: Number(options.date.slice(0, 4)),
      month: Number(options.date.slice(5, 7)),
    });
    const holidayMatch = holiday.find((h) => h.date === options.date);
    const settings = await holidaysService.getWorkSettings();
    const dateObj = new Date(options.date);
    const isWeekend = settings.weekly_off_days.includes(dateObj.getDay());

    const summary: Record<string, number> = {
      total: rows.length,
      present: 0,
      absent: 0,
      half_day: 0,
      leave: 0,
      holiday: 0,
      weekend: 0,
      wfh: 0,
    };

    const items: DailySheetItem[] = rows.map((r) => {
      let status: AttendanceStatus;
      if (r.attendance_status) {
        status = r.attendance_status;
      } else if (holidayMatch) {
        status = 'holiday';
      } else if (isWeekend) {
        status = 'weekend';
      } else {
        status = 'absent';
      }

      summary[status] = (summary[status] || 0) + 1;

      return {
        employee_id: Number(r.employee_id),
        employee_code: r.employee_code,
        first_name: r.first_name,
        last_name: r.last_name,
        department_name: r.department_name || 'Unassigned',
        designation_title: r.designation_title || 'Unassigned',
        reporting_manager_id: r.reporting_manager_id ? Number(r.reporting_manager_id) : null,
        attendance_id: r.attendance_id ? Number(r.attendance_id) : null,
        date: options.date,
        check_in: r.check_in,
        check_out: r.check_out,
        status,
        work_type: r.work_type || 'office',
        working_minutes: Number(r.working_minutes || 0),
        break_minutes: Number(r.break_minutes || 0),
        overtime_minutes: Number(r.overtime_minutes || 0),
        is_late: Boolean(r.is_late),
        is_early_checkout: Boolean(r.is_early_checkout),
        remarks: r.remarks,
        edited_by: r.edited_by ? Number(r.edited_by) : null,
      };
    });

    return { date: options.date, items, summary };
  }

  /**
   * Monthly Matrix Sheet (Admin, HR, Manager)
   */
  async getMonthlySheet(options: {
    month: string; // YYYY-MM
    departmentId?: number;
    search?: string;
    reportingManagerId?: number;
  }): Promise<{
    month: string;
    totalDays: number;
    employees: MonthlySheetEmployee[];
  }> {
    const [year, m] = options.month.split('-').map(Number);
    const totalDays = new Date(year, m, 0).getDate();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const startDate = `${year}-${pad(m)}-01`;
    const endDate = `${year}-${pad(m)}-${pad(totalDays)}`;

    const [sheetData, holidays, settings] = await Promise.all([
      attendanceRepository.getMonthlySheetData({
        startDate,
        endDate,
        departmentId: options.departmentId,
        search: options.search,
        reportingManagerId: options.reportingManagerId,
      }),
      holidaysService.getAll({ year, month: m }),
      holidaysService.getWorkSettings(),
    ]);

    const weeklyOffs = new Set(settings.weekly_off_days);
    const holidayMap = new Map(holidays.map((h) => [h.date, h.name]));

    // Group attendance rows by employee_id -> date
    const attMap = new Map<number, Map<string, any>>();
    for (const row of sheetData.attendanceRows) {
      const empId = Number(row.employee_id);
      let dateStr = row.date;
      if (dateStr instanceof Date) dateStr = dateStr.toISOString().split('T')[0];

      if (!attMap.has(empId)) {
        attMap.set(empId, new Map());
      }
      attMap.get(empId)!.set(dateStr, row);
    }

    const todayStr = getKolkataDateString();

    const employeesResult: MonthlySheetEmployee[] = sheetData.employees.map((emp) => {
      const empId = Number(emp.employee_id);
      const empAttendance = attMap.get(empId) || new Map<string, any>();
      const days: Record<string, any> = {};

      const totals = {
        present: 0,
        absent: 0,
        half_day: 0,
        leave: 0,
        holiday: 0,
        weekend: 0,
        wfh: 0,
        total_working_minutes: 0,
        total_overtime_minutes: 0,
      };

      const empJoiningDate = emp.joining_date ? (emp.joining_date instanceof Date ? emp.joining_date.toISOString().split('T')[0] : String(emp.joining_date)) : '1970-01-01';
      const empLastWorkingDate = emp.last_working_date ? (emp.last_working_date instanceof Date ? emp.last_working_date.toISOString().split('T')[0] : String(emp.last_working_date)) : null;

      for (let day = 1; day <= totalDays; day++) {
        const dateStr = `${year}-${pad(m)}-${pad(day)}`;
        const dateObj = new Date(year, m - 1, day);
        const dayOfWeek = dateObj.getDay();

        if (dateStr < empJoiningDate || (empLastWorkingDate && dateStr > empLastWorkingDate)) {
          days[dateStr] = {
            date: dateStr,
            status: 'not_joined',
            statusCode: '-',
            working_minutes: 0,
            is_late: false,
          };
        } else if (empAttendance.has(dateStr)) {
          const rec = empAttendance.get(dateStr)!;
          const status = rec.status as AttendanceStatus;
          const code =
            status === 'present'
              ? 'P'
              : status === 'wfh'
              ? 'WFH'
              : status === 'half_day'
              ? 'HD'
              : status === 'leave'
              ? 'L'
              : status === 'holiday'
              ? 'H'
              : status === 'weekend'
              ? 'W'
              : 'A';

          days[dateStr] = {
            date: dateStr,
            status,
            statusCode: code,
            working_minutes: Number(rec.working_minutes || 0),
            is_late: Boolean(rec.is_late),
          };

          totals[status] = (totals[status] || 0) + 1;
          totals.total_working_minutes += Number(rec.working_minutes || 0);
          totals.total_overtime_minutes += Number(rec.overtime_minutes || 0);
        } else {
          // Virtual state
          let status: AttendanceStatus;
          let code: any;

          if (holidayMap.has(dateStr)) {
            status = 'holiday';
            code = 'H';
            totals.holiday++;
          } else if (weeklyOffs.has(dayOfWeek)) {
            status = 'weekend';
            code = 'W';
            totals.weekend++;
          } else if (dateStr < todayStr) {
            // Past working day without any attendance record -> absent
            status = 'absent';
            code = 'A';
            totals.absent++;
          } else {
            // Today (in progress) or future day — do not label absent
            status = null as any;
            code = '-';
          }

          days[dateStr] = {
            date: dateStr,
            status: code === '-' ? null : status,
            statusCode: code,
            working_minutes: 0,
            is_late: false,
          };
        }
      }

      return {
        employee_id: empId,
        employee_code: emp.employee_code,
        first_name: emp.first_name,
        last_name: emp.last_name,
        department_name: emp.department_name || 'Unassigned',
        days,
        totals,
      };
    });

    return {
      month: options.month,
      totalDays,
      employees: employeesResult,
    };
  }

  /**
   * Admin / HR Manual Edit
   */
  async updateAttendance(
    id: number,
    dto: UpdateAttendanceDto,
    userId: number
  ): Promise<Attendance> {
    const current = await attendanceRepository.findById(id);
    if (!current) {
      throw new NotFoundError(`Attendance record ${id} not found`);
    }

    const empRec = await db('employees').where({ id: current.employee_id }).first();
    if (empRec && empRec.joining_date) {
      const empJoiningDate = empRec.joining_date instanceof Date ? empRec.joining_date.toISOString().split('T')[0] : String(empRec.joining_date);
      if (current.date < empJoiningDate) {
        const jDateObj = new Date(empJoiningDate + 'T00:00:00');
        const formattedDate = jDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        throw new BadRequestError(`Employee joined on ${formattedDate}`);
      }
    }

    // Recalculate working minutes and status based on check-in and check-out
    const checkIn = dto.check_in !== undefined ? (dto.check_in ? new Date(dto.check_in) : null) : (current.check_in ? new Date(current.check_in) : null);
    const checkOut = dto.check_out !== undefined ? (dto.check_out ? new Date(dto.check_out) : null) : (current.check_out ? new Date(current.check_out) : null);

    let workingMinutes = current.working_minutes;
    let isLate = current.is_late;
    let isEarlyCheckout = current.is_early_checkout;
    let overtimeMinutes = current.overtime_minutes;
    let status = dto.status || current.status;

    const workSettings = await holidaysService.getWorkSettings();
    const shiftStartMinutes = timeStringToMinutes(workSettings.shift_start);
    const shiftEndMinutes = timeStringToMinutes(workSettings.shift_end);
    const shiftLengthMinutes = Math.max(0, shiftEndMinutes - shiftStartMinutes);

    if (checkIn && checkOut) {
      const gross = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);
      workingMinutes = Math.max(0, gross - current.break_minutes);

      const checkInMins = getKolkataMinutesOfDay(checkIn);
      isLate = checkInMins > shiftStartMinutes + workSettings.late_grace_minutes;

      const checkOutMins = getKolkataMinutesOfDay(checkOut);
      isEarlyCheckout = checkOutMins < shiftEndMinutes;

      overtimeMinutes = Math.max(0, workingMinutes - shiftLengthMinutes);

      if (!dto.status) {
        if (workingMinutes >= workSettings.min_hours_full_day * 60) {
          status = current.work_type === 'wfh' ? 'wfh' : 'present';
        } else if (workingMinutes >= workSettings.min_hours_half_day * 60) {
          status = 'half_day';
        } else {
          status = 'absent';
        }
      }
    }

    const updated = await attendanceRepository.update(id, {
      check_in: checkIn ? checkIn.toISOString() : null,
      check_out: checkOut ? checkOut.toISOString() : null,
      status,
      work_type: dto.work_type || current.work_type,
      working_minutes: workingMinutes,
      is_late: isLate,
      is_early_checkout: isEarlyCheckout,
      overtime_minutes: overtimeMinutes,
      remarks: dto.reason ? `[Edit Reason]: ${dto.reason}` : current.remarks,
      edited_by: userId,
    });

    // Record audit log
    await auditService.record({
      userId,
      action: 'attendance.edit',
      entity: 'attendance',
      entityId: id,
      oldValue: current,
      newValue: updated,
    });

    return updated!;
  }

  /**
   * Admin / HR Delete Attendance Record
   */
  async deleteAttendance(id: number, userId: number): Promise<void> {
    const current = await attendanceRepository.findById(id);
    if (!current) {
      throw new NotFoundError(`Attendance record ${id} not found`);
    }

    await db('attendance').where({ id }).delete();

    await auditService.record({
      userId,
      action: 'attendance.delete',
      entity: 'attendance',
      entityId: id,
      oldValue: current,
    });
  }

  /**
   * Admin / HR Create Attendance for Missing Day
   */
  async createManualAttendance(
    dto: ManualAttendanceDto,
    userId: number
  ): Promise<Attendance> {
    const empRec = await db('employees').where({ id: dto.employee_id }).first();
    if (empRec && empRec.joining_date) {
      const empJoiningDate = empRec.joining_date instanceof Date ? empRec.joining_date.toISOString().split('T')[0] : String(empRec.joining_date);
      if (dto.date < empJoiningDate) {
        const jDateObj = new Date(empJoiningDate + 'T00:00:00');
        const formattedDate = jDateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        throw new BadRequestError(`Employee joined on ${formattedDate}`);
      }
    }

    const existing = await attendanceRepository.findByEmployeeAndDate(dto.employee_id, dto.date);
    if (existing) {
      return this.updateAttendance(existing.id, dto, userId);
    }

    const checkIn = dto.check_in ? new Date(dto.check_in) : null;
    const checkOut = dto.check_out ? new Date(dto.check_out) : null;

    let workingMinutes = 0;
    let isLate = false;
    let isEarlyCheckout = false;
    let overtimeMinutes = 0;
    let status = dto.status || 'present';

    const workSettings = await holidaysService.getWorkSettings();
    const shiftStartMinutes = timeStringToMinutes(workSettings.shift_start);
    const shiftEndMinutes = timeStringToMinutes(workSettings.shift_end);
    const shiftLengthMinutes = Math.max(0, shiftEndMinutes - shiftStartMinutes);

    if (checkIn && checkOut) {
      const gross = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);
      workingMinutes = Math.max(0, gross);

      const checkInMins = getKolkataMinutesOfDay(checkIn);
      isLate = checkInMins > shiftStartMinutes + workSettings.late_grace_minutes;

      const checkOutMins = getKolkataMinutesOfDay(checkOut);
      isEarlyCheckout = checkOutMins < shiftEndMinutes;

      overtimeMinutes = Math.max(0, workingMinutes - shiftLengthMinutes);

      if (!dto.status) {
        if (workingMinutes >= workSettings.min_hours_full_day * 60) {
          status = dto.work_type === 'wfh' ? 'wfh' : 'present';
        } else if (workingMinutes >= workSettings.min_hours_half_day * 60) {
          status = 'half_day';
        } else {
          status = 'absent';
        }
      }
    }

    const created = await attendanceRepository.create({
      employee_id: dto.employee_id,
      date: dto.date,
      check_in: checkIn,
      check_out: checkOut,
      status,
      work_type: dto.work_type || 'office',
      working_minutes: workingMinutes,
      break_minutes: 0,
      overtime_minutes: overtimeMinutes,
      is_late: isLate,
      is_early_checkout: isEarlyCheckout,
      remarks: `[Manual Entry Reason]: ${dto.reason}`,
      edited_by: userId,
    });

    await auditService.record({
      userId,
      action: 'attendance.create_manual',
      entity: 'attendance',
      entityId: created.id,
      newValue: created,
    });

    return created;
  }
}

export const attendanceService = new AttendanceService();
