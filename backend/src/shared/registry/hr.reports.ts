import db from '../../db/knex';
import { registerReport } from './report.registry';
import { ReportFilterParams, ReportDataResult } from './types';
import { TokenUserPayload } from '../utils/jwt.util';
import { ForbiddenError } from '../errors/app-error';

// Helper to check whether user has company-wide permission or team-only manager scope
function getEmployeeScopeCondition(user: TokenUserPayload, companyPermission: string, teamPermission: string) {
  const isAdmin = user.roles.some((r) => r.toLowerCase() === 'admin' || r === '*');
  if (isAdmin) return null;

  const hasCompanyView = user.permissions.includes(companyPermission) || user.permissions.includes('*');
  if (hasCompanyView) return null;

  const hasTeamView = user.permissions.includes(teamPermission);
  if (hasTeamView && user.employeeId) {
    return user.employeeId;
  }

  // If neither, but is an employee, scope to self
  return user.employeeId || -1;
}

// ==========================================
// 1. HEADCOUNT BY DEPARTMENT & DESIGNATION
// ==========================================
registerReport({
  key: 'headcount_by_department_designation',
  title: 'Headcount by Department & Designation',
  group: 'HR',
  permission: 'employees.view',
  columns: [
    { key: 'department', header: 'Department', width: 22 },
    { key: 'designation', header: 'Designation', width: 22 },
    { key: 'active_count', header: 'Active Employees', width: 16, align: 'center' },
    { key: 'onboarding_count', header: 'Onboarding', width: 14, align: 'center' },
    { key: 'total_headcount', header: 'Total Headcount', width: 16, align: 'center' },
  ],
  handler: async (filters: ReportFilterParams, user: TokenUserPayload): Promise<ReportDataResult> => {
    let q = db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('designations as des', 'e.designation_id', 'des.id')
      .whereNull('e.deleted_at')
      .whereNot('e.lifecycle_stage', 'relieved')
      .select(
        db.raw("COALESCE(d.name, 'Unassigned') as department"),
        db.raw("COALESCE(des.name, 'Unassigned') as designation"),
        db.raw("SUM(CASE WHEN e.status = 'active' THEN 1 ELSE 0 END) as active_count"),
        db.raw("SUM(CASE WHEN e.lifecycle_stage = 'onboarding' THEN 1 ELSE 0 END) as onboarding_count"),
        db.raw("COUNT(e.id) as total_headcount")
      )
      .groupBy('d.name', 'des.name');

    const managerId = getEmployeeScopeCondition(user, 'employees.view', 'employees.view_team');
    if (managerId !== null) {
      q = q.where('e.reporting_manager_id', managerId);
    }

    if (filters.department) {
      q = q.where('e.department_id', filters.department);
    }

    if (filters.from) {
      q = q.where('e.joining_date', '>=', filters.from);
    }

    if (filters.to) {
      q = q.where('e.joining_date', '<=', filters.to);
    }

    const rows = await q.orderBy('department', 'asc').orderBy('designation', 'asc');

    let totalActive = 0;
    let totalOnboarding = 0;
    let grandTotal = 0;

    const formattedRows = rows.map((r: any) => {
      const active = Number(r.active_count || 0);
      const onboarding = Number(r.onboarding_count || 0);
      const total = Number(r.total_headcount || 0);
      totalActive += active;
      totalOnboarding += onboarding;
      grandTotal += total;

      return {
        department: r.department,
        designation: r.designation,
        active_count: active,
        onboarding_count: onboarding,
        total_headcount: total,
      };
    });

    return {
      title: 'Headcount by Department & Designation',
      columns: [
        { key: 'department', header: 'Department', width: 22 },
        { key: 'designation', header: 'Designation', width: 22 },
        { key: 'active_count', header: 'Active Employees', width: 16, align: 'center' },
        { key: 'onboarding_count', header: 'Onboarding', width: 14, align: 'center' },
        { key: 'total_headcount', header: 'Total Headcount', width: 16, align: 'center' },
      ],
      rows: formattedRows,
      summary: {
        department: 'Total',
        designation: '-',
        active_count: totalActive,
        onboarding_count: totalOnboarding,
        total_headcount: grandTotal,
      },
    };
  },
});

// ==========================================
// 2. JOINERS AND LEAVERS BY MONTH
// ==========================================
registerReport({
  key: 'joiners_and_leavers_by_month',
  title: 'Joiners and Leavers by Month',
  group: 'HR',
  permission: 'employees.view',
  columns: [
    { key: 'month', header: 'Month', width: 14 },
    { key: 'joiners_count', header: 'New Joiners', width: 16, align: 'center' },
    { key: 'leavers_count', header: 'Leavers / Relieved', width: 18, align: 'center' },
    { key: 'net_change', header: 'Net Growth', width: 16, align: 'center' },
  ],
  handler: async (filters: ReportFilterParams, user: TokenUserPayload): Promise<ReportDataResult> => {
    let joinersQ = db('employees as e')
      .whereNull('e.deleted_at')
      .select(
        db.raw("DATE_FORMAT(e.joining_date, '%Y-%m') as month"),
        db.raw("COUNT(e.id) as joiners")
      )
      .groupBy(db.raw("DATE_FORMAT(e.joining_date, '%Y-%m')"));

    let leaversQ = db('employees as e')
      .whereNotNull('e.last_working_date')
      .select(
        db.raw("DATE_FORMAT(e.last_working_date, '%Y-%m') as month"),
        db.raw("COUNT(e.id) as leavers")
      )
      .groupBy(db.raw("DATE_FORMAT(e.last_working_date, '%Y-%m')"));

    const managerId = getEmployeeScopeCondition(user, 'employees.view', 'employees.view_team');
    if (managerId !== null) {
      joinersQ = joinersQ.where('e.reporting_manager_id', managerId);
      leaversQ = leaversQ.where('e.reporting_manager_id', managerId);
    }

    if (filters.department) {
      joinersQ = joinersQ.where('e.department_id', filters.department);
      leaversQ = leaversQ.where('e.department_id', filters.department);
    }

    const joiners = await joinersQ;
    const leavers = await leaversQ;

    const monthMap: Record<string, { joiners: number; leavers: number }> = {};

    joiners.forEach((j: any) => {
      if (j.month) {
        if (!monthMap[j.month]) monthMap[j.month] = { joiners: 0, leavers: 0 };
        monthMap[j.month].joiners = Number(j.joiners || 0);
      }
    });

    leavers.forEach((l: any) => {
      if (l.month) {
        if (!monthMap[l.month]) monthMap[l.month] = { joiners: 0, leavers: 0 };
        monthMap[l.month].leavers = Number(l.leavers || 0);
      }
    });

    let months = Object.keys(monthMap).sort();

    if (filters.from) {
      const fromMonth = filters.from.slice(0, 7);
      months = months.filter((m) => m >= fromMonth);
    }
    if (filters.to) {
      const toMonth = filters.to.slice(0, 7);
      months = months.filter((m) => m <= toMonth);
    }

    let totJ = 0;
    let totL = 0;
    const rows = months.map((m) => {
      const item = monthMap[m];
      const j = item.joiners;
      const l = item.leavers;
      totJ += j;
      totL += l;
      const net = j - l;
      return {
        month: m,
        joiners_count: j,
        leavers_count: l,
        net_change: net >= 0 ? `+${net}` : String(net),
      };
    });

    return {
      title: 'Joiners and Leavers by Month',
      columns: [
        { key: 'month', header: 'Month', width: 14 },
        { key: 'joiners_count', header: 'New Joiners', width: 16, align: 'center' },
        { key: 'leavers_count', header: 'Leavers / Relieved', width: 18, align: 'center' },
        { key: 'net_change', header: 'Net Growth', width: 16, align: 'center' },
      ],
      rows,
      summary: {
        month: 'Total',
        joiners_count: totJ,
        leavers_count: totL,
        net_change: totJ - totL >= 0 ? `+${totJ - totL}` : String(totJ - totL),
      },
    };
  },
});

// ==========================================
// 3. EMPLOYEE LIFECYCLE SUMMARY
// ==========================================
registerReport({
  key: 'employee_lifecycle_summary',
  title: 'Employee Lifecycle Summary',
  group: 'HR',
  permission: 'employees.view',
  columns: [
    { key: 'employee_code', header: 'Emp Code', width: 14 },
    { key: 'employee_name', header: 'Employee Name', width: 22 },
    { key: 'department', header: 'Department', width: 18 },
    { key: 'designation', header: 'Designation', width: 18 },
    { key: 'lifecycle_stage', header: 'Lifecycle Stage', width: 16 },
    { key: 'status', header: 'Status', width: 12 },
    { key: 'joining_date', header: 'Joining Date', width: 14 },
    { key: 'last_working_date', header: 'Relieved Date', width: 14 },
  ],
  handler: async (filters: ReportFilterParams, user: TokenUserPayload): Promise<ReportDataResult> => {
    let q = db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('designations as des', 'e.designation_id', 'des.id')
      .whereNull('e.deleted_at')
      .select(
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        'e.lifecycle_stage',
        'e.status',
        'e.joining_date',
        'e.last_working_date',
        'd.name as department_name',
        'des.name as designation_title'
      );

    const managerId = getEmployeeScopeCondition(user, 'employees.view', 'employees.view_team');
    if (managerId !== null) {
      q = q.where('e.reporting_manager_id', managerId);
    }

    if (filters.department) {
      q = q.where('e.department_id', filters.department);
    }

    if (filters.from) {
      q = q.where('e.joining_date', '>=', filters.from);
    }

    if (filters.to) {
      q = q.where('e.joining_date', '<=', filters.to);
    }

    const rows = await q.orderBy('e.joining_date', 'desc');

    return {
      title: 'Employee Lifecycle Summary',
      columns: [
        { key: 'employee_code', header: 'Emp Code', width: 14 },
        { key: 'employee_name', header: 'Employee Name', width: 22 },
        { key: 'department', header: 'Department', width: 18 },
        { key: 'designation', header: 'Designation', width: 18 },
        { key: 'lifecycle_stage', header: 'Lifecycle Stage', width: 16 },
        { key: 'status', header: 'Status', width: 12 },
        { key: 'joining_date', header: 'Joining Date', width: 14 },
        { key: 'last_working_date', header: 'Relieved Date', width: 14 },
      ],
      rows: rows.map((r: any) => ({
        employee_code: r.employee_code,
        employee_name: `${r.first_name} ${r.last_name}`,
        department: r.department_name || '-',
        designation: r.designation_title || '-',
        lifecycle_stage: (r.lifecycle_stage || '').toUpperCase().replace('_', ' '),
        status: (r.status || '').toUpperCase(),
        joining_date: r.joining_date ? new Date(r.joining_date).toISOString().split('T')[0] : '-',
        last_working_date: r.last_working_date ? new Date(r.last_working_date).toISOString().split('T')[0] : '-',
      })),
      summary: {
        employee_code: 'Total Records',
        employee_name: rows.length,
      },
    };
  },
});

// ==========================================
// 4. ATTENDANCE SUMMARY REPORT
// ==========================================
registerReport({
  key: 'attendance_summary',
  title: 'Attendance Summary by Date Range',
  group: 'Attendance',
  permission: 'attendance.view',
  columns: [
    { key: 'employee_code', header: 'Emp Code', width: 14 },
    { key: 'employee_name', header: 'Employee Name', width: 22 },
    { key: 'department', header: 'Department', width: 18 },
    { key: 'present_days', header: 'Present', width: 12, align: 'center' },
    { key: 'absent_days', header: 'Absent', width: 12, align: 'center' },
    { key: 'half_days', header: 'Half Day', width: 12, align: 'center' },
    { key: 'leave_days', header: 'On Leave', width: 12, align: 'center' },
    { key: 'wfh_days', header: 'WFH', width: 12, align: 'center' },
    { key: 'late_count', header: 'Late In', width: 12, align: 'center' },
    { key: 'total_hours', header: 'Working Hours', width: 14, align: 'right' },
  ],
  handler: async (filters: ReportFilterParams, user: TokenUserPayload): Promise<ReportDataResult> => {
    // Default to current month if no dates supplied
    const today = new Date().toISOString().split('T')[0];
    const fromDate = filters.from || `${today.slice(0, 7)}-01`;
    const toDate = filters.to || today;

    let q = db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('attendance as a', function () {
        this.on('a.employee_id', '=', 'e.id')
          .andOn('a.date', '>=', db.raw('?', [fromDate]))
          .andOn('a.date', '<=', db.raw('?', [toDate]));
      })
      .whereNull('e.deleted_at')
      .select(
        'e.id as employee_id',
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        'd.name as department_name',
        db.raw("SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present_days"),
        db.raw("SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days"),
        db.raw("SUM(CASE WHEN a.status = 'half_day' THEN 1 ELSE 0 END) as half_days"),
        db.raw("SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) as leave_days"),
        db.raw("SUM(CASE WHEN a.work_type = 'wfh' THEN 1 ELSE 0 END) as wfh_days"),
        db.raw("SUM(CASE WHEN a.is_late = 1 THEN 1 ELSE 0 END) as late_count"),
        db.raw("COALESCE(SUM(a.working_minutes), 0) as total_working_minutes")
      )
      .groupBy('e.id', 'e.employee_code', 'e.first_name', 'e.last_name', 'd.name');

    const managerId = getEmployeeScopeCondition(user, 'attendance.view', 'attendance.view_team');
    if (managerId !== null) {
      q = q.where('e.reporting_manager_id', managerId);
    }

    if (filters.department) {
      q = q.where('e.department_id', filters.department);
    }

    const rows = await q.orderBy('e.employee_code', 'asc');

    let sumP = 0;
    let sumA = 0;
    let sumHD = 0;
    let sumL = 0;
    let sumWFH = 0;
    let sumLate = 0;
    let sumMin = 0;

    const formattedRows = rows.map((r: any) => {
      const p = Number(r.present_days || 0);
      const a = Number(r.absent_days || 0);
      const hd = Number(r.half_days || 0);
      const l = Number(r.leave_days || 0);
      const w = Number(r.wfh_days || 0);
      const lt = Number(r.late_count || 0);
      const mins = Number(r.total_working_minutes || 0);

      sumP += p;
      sumA += a;
      sumHD += hd;
      sumL += l;
      sumWFH += w;
      sumLate += lt;
      sumMin += mins;

      return {
        employee_code: r.employee_code,
        employee_name: `${r.first_name} ${r.last_name}`,
        department: r.department_name || '-',
        present_days: p,
        absent_days: a,
        half_days: hd,
        leave_days: l,
        wfh_days: w,
        late_count: lt,
        total_hours: (mins / 60).toFixed(1) + ' hrs',
      };
    });

    return {
      title: `Attendance Summary (${fromDate} to ${toDate})`,
      columns: [
        { key: 'employee_code', header: 'Emp Code', width: 14 },
        { key: 'employee_name', header: 'Employee Name', width: 22 },
        { key: 'department', header: 'Department', width: 18 },
        { key: 'present_days', header: 'Present', width: 12, align: 'center' },
        { key: 'absent_days', header: 'Absent', width: 12, align: 'center' },
        { key: 'half_days', header: 'Half Day', width: 12, align: 'center' },
        { key: 'leave_days', header: 'On Leave', width: 12, align: 'center' },
        { key: 'wfh_days', header: 'WFH', width: 12, align: 'center' },
        { key: 'late_count', header: 'Late In', width: 12, align: 'center' },
        { key: 'total_hours', header: 'Working Hours', width: 14, align: 'right' },
      ],
      rows: formattedRows,
      summary: {
        employee_code: 'Total',
        employee_name: rows.length + ' Employees',
        present_days: sumP,
        absent_days: sumA,
        half_days: sumHD,
        leave_days: sumL,
        wfh_days: sumWFH,
        late_count: sumLate,
        total_hours: (sumMin / 60).toFixed(1) + ' hrs',
      },
    };
  },
});

// ==========================================
// 5. LEAVE SUMMARY REPORT
// ==========================================
registerReport({
  key: 'leave_summary',
  title: 'Leave Summary by Employee & Type',
  group: 'Leaves',
  permission: 'leave.view',
  columns: [
    { key: 'employee_code', header: 'Emp Code', width: 14 },
    { key: 'employee_name', header: 'Employee Name', width: 22 },
    { key: 'department', header: 'Department', width: 18 },
    { key: 'leave_type', header: 'Leave Type', width: 18 },
    { key: 'allocated', header: 'Available Quota', width: 14, align: 'center' },
    { key: 'used', header: 'Used Days', width: 12, align: 'center' },
    { key: 'pending', header: 'Pending Days', width: 14, align: 'center' },
    { key: 'remaining', header: 'Remaining Balance', width: 16, align: 'center' },
  ],
  handler: async (filters: ReportFilterParams, user: TokenUserPayload): Promise<ReportDataResult> => {
    const currentYear = filters.from ? new Date(filters.from).getFullYear() : new Date().getFullYear();

    let q = db('leave_balances as lb')
      .join('employees as e', 'lb.employee_id', 'e.id')
      .join('leave_types as lt', 'lb.leave_type_id', 'lt.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .where('lb.year', currentYear)
      .whereNull('e.deleted_at')
      .select(
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        'd.name as department_name',
        'lt.name as leave_type_name',
        'lt.code as leave_type_code',
        'lb.allocated',
        'lb.used',
        'lb.pending'
      );

    const managerId = getEmployeeScopeCondition(user, 'leave.view', 'leave.view_team');
    if (managerId !== null) {
      q = q.where('e.reporting_manager_id', managerId);
    }

    if (filters.department) {
      q = q.where('e.department_id', filters.department);
    }

    const rows = await q.orderBy('e.employee_code', 'asc').orderBy('lt.id', 'asc');

    let sumAlloc = 0;
    let sumUsed = 0;
    let sumPending = 0;

    const formattedRows = rows.map((r: any) => {
      const isLop = r.leave_type_code === 'LOP';
      const alloc = Number(r.allocated || 0);
      const used = Number(r.used || 0);
      const pending = Number(r.pending || 0);
      const rem = isLop ? '∞' : Math.max(0, alloc - used - pending);

      if (!isLop) {
        sumAlloc += alloc;
        sumUsed += used;
        sumPending += pending;
      }

      return {
        employee_code: r.employee_code,
        employee_name: `${r.first_name} ${r.last_name}`,
        department: r.department_name || '-',
        leave_type: `${r.leave_type_name} (${r.leave_type_code})`,
        allocated: isLop ? 'Unlimited' : alloc,
        used,
        pending,
        remaining: rem,
      };
    });

    return {
      title: `Leave Summary (${currentYear})`,
      columns: [
        { key: 'employee_code', header: 'Emp Code', width: 14 },
        { key: 'employee_name', header: 'Employee Name', width: 22 },
        { key: 'department', header: 'Department', width: 18 },
        { key: 'leave_type', header: 'Leave Type', width: 18 },
        { key: 'allocated', header: 'Available Quota', width: 14, align: 'center' },
        { key: 'used', header: 'Used Days', width: 12, align: 'center' },
        { key: 'pending', header: 'Pending Days', width: 14, align: 'center' },
        { key: 'remaining', header: 'Remaining Balance', width: 16, align: 'center' },
      ],
      rows: formattedRows,
      summary: {
        employee_code: 'Total Paid Leaves',
        allocated: sumAlloc,
        used: sumUsed,
        pending: sumPending,
        remaining: Math.max(0, sumAlloc - sumUsed - sumPending),
      },
    };
  },
});

// ==========================================
// 6. PAYROLL SUMMARY REPORT
// ==========================================
registerReport({
  key: 'payroll_summary',
  title: 'Monthly Payroll Summary by Department',
  group: 'Payroll',
  permission: 'payroll.view',
  columns: [
    { key: 'month', header: 'Month', width: 12 },
    { key: 'department', header: 'Department', width: 20 },
    { key: 'employee_count', header: 'Employees', width: 12, align: 'center' },
    { key: 'total_gross', header: 'Gross Earnings (₹)', width: 18, align: 'right', format: 'currency' },
    { key: 'total_lop', header: 'LOP Deductions (₹)', width: 18, align: 'right', format: 'currency' },
    { key: 'total_deductions', header: 'PF & Deductions (₹)', width: 18, align: 'right', format: 'currency' },
    { key: 'total_net', header: 'Net Payout (₹)', width: 18, align: 'right', format: 'currency' },
  ],
  handler: async (filters: ReportFilterParams, user: TokenUserPayload): Promise<ReportDataResult> => {
    const hasPayrollView =
      user.roles.some((r) => r.toLowerCase() === 'admin' || r.toLowerCase() === 'hr' || r === '*') ||
      user.permissions.includes('payroll.view') ||
      user.permissions.includes('*');

    if (!hasPayrollView) {
      throw new ForbiddenError('Viewing salary reports requires payroll.view permission');
    }

    let q = db('payroll_items as pi')
      .join('payroll_runs as pr', 'pi.payroll_run_id', 'pr.id')
      .join('employees as e', 'pi.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .select(
        'pr.month',
        db.raw("COALESCE(d.name, 'Unassigned') as department"),
        db.raw('COUNT(pi.id) as employee_count'),
        db.raw('SUM(pi.gross_earning) as total_gross'),
        db.raw('SUM(pi.lop_deduction) as total_lop'),
        db.raw('SUM(COALESCE(pi.pf_deduction, 0) + COALESCE(pi.other_deductions, 0)) as total_deductions'),
        db.raw('SUM(pi.net_salary) as total_net')
      )
      .groupBy('pr.month', 'd.name');

    if (filters.from) {
      const fromMonth = filters.from.slice(0, 7);
      q = q.where('pr.month', '>=', fromMonth);
    }
    if (filters.to) {
      const toMonth = filters.to.slice(0, 7);
      q = q.where('pr.month', '<=', toMonth);
    }
    if (filters.department) {
      q = q.where('e.department_id', filters.department);
    }

    const rows = await q.orderBy('pr.month', 'desc').orderBy('department', 'asc');

    let sumHeadcount = 0;
    let sumGross = 0;
    let sumLop = 0;
    let sumDed = 0;
    let sumNet = 0;

    const formattedRows = rows.map((r: any) => {
      const cnt = Number(r.employee_count || 0);
      const gross = Number(r.total_gross || 0);
      const lop = Number(r.total_lop || 0);
      const ded = Number(r.total_deductions || 0);
      const net = Number(r.total_net || 0);

      sumHeadcount += cnt;
      sumGross += gross;
      sumLop += lop;
      sumDed += ded;
      sumNet += net;

      return {
        month: r.month,
        department: r.department,
        employee_count: cnt,
        total_gross: gross.toFixed(2),
        total_lop: lop.toFixed(2),
        total_deductions: ded.toFixed(2),
        total_net: net.toFixed(2),
      };
    });

    return {
      title: 'Monthly Payroll Summary by Department',
      columns: [
        { key: 'month', header: 'Month', width: 12 },
        { key: 'department', header: 'Department', width: 20 },
        { key: 'employee_count', header: 'Employees', width: 12, align: 'center' },
        { key: 'total_gross', header: 'Gross Earnings (₹)', width: 18, align: 'right', format: 'currency' },
        { key: 'total_lop', header: 'LOP Deductions (₹)', width: 18, align: 'right', format: 'currency' },
        { key: 'total_deductions', header: 'PF & Deductions (₹)', width: 18, align: 'right', format: 'currency' },
        { key: 'total_net', header: 'Net Payout (₹)', width: 18, align: 'right', format: 'currency' },
      ],
      rows: formattedRows,
      summary: {
        month: 'Total',
        department: '-',
        employee_count: sumHeadcount,
        total_gross: sumGross.toFixed(2),
        total_lop: sumLop.toFixed(2),
        total_deductions: sumDed.toFixed(2),
        total_net: sumNet.toFixed(2),
      },
    };
  },
});

// ==========================================
// 7. PAYSLIP REGISTER REPORT
// ==========================================
registerReport({
  key: 'payslip_register',
  title: 'Detailed Payslip Register',
  group: 'Payroll',
  permission: 'payroll.view',
  columns: [
    { key: 'month', header: 'Month', width: 12 },
    { key: 'employee_code', header: 'Emp Code', width: 14 },
    { key: 'employee_name', header: 'Employee Name', width: 22 },
    { key: 'department', header: 'Department', width: 18 },
    { key: 'monthly_salary', header: 'Base Salary (₹)', width: 16, align: 'right' },
    { key: 'incentives', header: 'Incentives (₹)', width: 14, align: 'right' },
    { key: 'bonus', header: 'Bonus (₹)', width: 14, align: 'right' },
    { key: 'overtime', header: 'OT (₹)', width: 12, align: 'right' },
    { key: 'gross_earning', header: 'Gross (₹)', width: 16, align: 'right' },
    { key: 'lop_deduction', header: 'LOP (₹)', width: 14, align: 'right' },
    { key: 'pf_deduction', header: 'PF (₹)', width: 14, align: 'right' },
    { key: 'net_salary', header: 'Net Payout (₹)', width: 16, align: 'right' },
    { key: 'status', header: 'Status', width: 12 },
  ],
  handler: async (filters: ReportFilterParams, user: TokenUserPayload): Promise<ReportDataResult> => {
    const hasPayrollView =
      user.roles.some((r) => r.toLowerCase() === 'admin' || r.toLowerCase() === 'hr' || r === '*') ||
      user.permissions.includes('payroll.view') ||
      user.permissions.includes('*');

    if (!hasPayrollView) {
      throw new ForbiddenError('Viewing payslip register requires payroll.view permission');
    }

    let q = db('payroll_items as pi')
      .join('payroll_runs as pr', 'pi.payroll_run_id', 'pr.id')
      .join('employees as e', 'pi.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .select(
        'pr.month',
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        'd.name as department_name',
        'pi.monthly_salary',
        'pi.incentives',
        'pi.bonus',
        'pi.overtime',
        'pi.gross_earning',
        'pi.lop_deduction',
        'pi.pf_deduction',
        'pi.net_salary',
        'pi.status'
      );

    if (filters.from) {
      const fromMonth = filters.from.slice(0, 7);
      q = q.where('pr.month', '>=', fromMonth);
    }
    if (filters.to) {
      const toMonth = filters.to.slice(0, 7);
      q = q.where('pr.month', '<=', toMonth);
    }
    if (filters.department) {
      q = q.where('e.department_id', filters.department);
    }

    const rows = await q.orderBy('pr.month', 'desc').orderBy('e.employee_code', 'asc');

    let sumGross = 0;
    let sumNet = 0;

    const formattedRows = rows.map((r: any) => {
      const g = Number(r.gross_earning || 0);
      const n = Number(r.net_salary || 0);
      sumGross += g;
      sumNet += n;

      return {
        month: r.month,
        employee_code: r.employee_code,
        employee_name: `${r.first_name} ${r.last_name}`,
        department: r.department_name || '-',
        monthly_salary: Number(r.monthly_salary).toFixed(2),
        incentives: Number(r.incentives || 0).toFixed(2),
        bonus: Number(r.bonus || 0).toFixed(2),
        overtime: Number(r.overtime || 0).toFixed(2),
        gross_earning: g.toFixed(2),
        lop_deduction: Number(r.lop_deduction || 0).toFixed(2),
        pf_deduction: Number(r.pf_deduction || 0).toFixed(2),
        net_salary: n.toFixed(2),
        status: (r.status || '').toUpperCase(),
      };
    });

    return {
      title: 'Detailed Payslip Register',
      columns: [
        { key: 'month', header: 'Month', width: 12 },
        { key: 'employee_code', header: 'Emp Code', width: 14 },
        { key: 'employee_name', header: 'Employee Name', width: 22 },
        { key: 'department', header: 'Department', width: 18 },
        { key: 'monthly_salary', header: 'Base Salary (₹)', width: 16, align: 'right' },
        { key: 'incentives', header: 'Incentives (₹)', width: 14, align: 'right' },
        { key: 'bonus', header: 'Bonus (₹)', width: 14, align: 'right' },
        { key: 'overtime', header: 'OT (₹)', width: 12, align: 'right' },
        { key: 'gross_earning', header: 'Gross (₹)', width: 16, align: 'right' },
        { key: 'lop_deduction', header: 'LOP (₹)', width: 14, align: 'right' },
        { key: 'pf_deduction', header: 'PF (₹)', width: 14, align: 'right' },
        { key: 'net_salary', header: 'Net Payout (₹)', width: 16, align: 'right' },
        { key: 'status', header: 'Status', width: 12 },
      ],
      rows: formattedRows,
      summary: {
        month: 'Total',
        employee_code: rows.length + ' Payslips',
        gross_earning: sumGross.toFixed(2),
        net_salary: sumNet.toFixed(2),
      },
    };
  },
});
