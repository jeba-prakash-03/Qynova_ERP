import db from '../../db/knex';
import { registerDashboardWidget } from './widget.registry';
import { TokenUserPayload } from '../utils/jwt.util';

// ==========================================
// ADMIN / HR CHART WIDGETS
// ==========================================

// 1. Employee Growth (last 12 months)
registerDashboardWidget({
  key: 'employee_growth_12m',
  title: 'Employee Growth Trend (Last 12 Months)',
  permission: 'employees.view',
  handler: async () => {
    const today = new Date();
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }

    // Active employees count cumulative up to each month
    const result: Array<{ month: string; count: number; joiners: number }> = [];

    for (const m of months) {
      const [yr, mo] = m.split('-').map(Number);
      const lastDay = new Date(yr, mo, 0).getDate();
      const endOfMonth = `${m}-${String(lastDay).padStart(2, '0')}`;
      const [cumRow] = await db('employees')
        .where('joining_date', '<=', endOfMonth)
        .where((builder) => {
          builder.whereNull('last_working_date').orWhere('last_working_date', '>', endOfMonth);
        })
        .whereNull('deleted_at')
        .count('* as count');

      const [joinerRow] = await db('employees')
        .whereRaw("DATE_FORMAT(joining_date, '%Y-%m') = ?", [m])
        .whereNull('deleted_at')
        .count('* as count');

      result.push({
        month: m,
        count: Number(cumRow?.count || 0),
        joiners: Number(joinerRow?.count || 0),
      });
    }

    return result;
  },
});

// 2. Headcount by Department
registerDashboardWidget({
  key: 'headcount_by_department_chart',
  title: 'Headcount by Department',
  permission: 'departments.view',
  handler: async () => {
    const rows = await db('departments as d')
      .leftJoin('employees as e', function () {
        this.on('e.department_id', '=', 'd.id')
          .andOnVal('e.status', '=', 'active')
          .andOnNull('e.deleted_at');
      })
      .select('d.name as department')
      .count('e.id as count')
      .groupBy('d.name')
      .orderBy('count', 'desc');

    return rows.map((r: any) => ({
      department: r.department,
      count: Number(r.count || 0),
    }));
  },
});

// 3. Attendance Trend (Last 30 Days: Present vs Absent vs Leave)
registerDashboardWidget({
  key: 'attendance_trend_30d',
  title: 'Attendance Trend (Last 30 Days)',
  permission: 'attendance.view',
  handler: async () => {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 29);

    const startStr = startDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const records = await db('attendance as a')
      .join('employees as e', 'a.employee_id', 'e.id')
      .where('a.date', '>=', startStr)
      .where('a.date', '<=', todayStr)
      .where('e.status', 'active')
      .whereNull('e.deleted_at')
      .select(
        db.raw("DATE_FORMAT(a.date, '%Y-%m-%d') as date"),
        db.raw("SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present"),
        db.raw("SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent"),
        db.raw("SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) as on_leave")
      )
      .groupBy(db.raw("DATE_FORMAT(a.date, '%Y-%m-%d')"))
      .orderBy('date', 'asc');

    return records.map((r: any) => ({
      date: r.date,
      present: Number(r.present || 0),
      absent: Number(r.absent || 0),
      on_leave: Number(r.on_leave || 0),
    }));
  },
});

// 4. Leave by Type
registerDashboardWidget({
  key: 'leave_by_type_chart',
  title: 'Leave Taken by Type',
  permission: 'leave.view',
  handler: async () => {
    const currentYear = new Date().getFullYear();

    const rows = await db('leave_balances as lb')
      .join('leave_types as lt', 'lb.leave_type_id', 'lt.id')
      .join('employees as e', 'lb.employee_id', 'e.id')
      .where('lb.year', currentYear)
      .where('e.status', 'active')
      .whereNull('e.deleted_at')
      .select('lt.name as leave_type', 'lt.code as code')
      .sum('lb.used as days_used')
      .groupBy('lt.name', 'lt.code')
      .orderBy('days_used', 'desc');

    return rows.map((r: any) => ({
      name: r.leave_type,
      code: r.code,
      days: Number(r.days_used || 0),
    }));
  },
});

// 5. Present Today & On Leave Today & Approvals Counts
registerDashboardWidget({
  key: 'admin_live_stats',
  title: 'Today Pulse & Pending Approvals',
  permission: 'employees.view',
  handler: async () => {
    const today = new Date().toISOString().split('T')[0];

    const [activeEmpRow] = await db('employees')
      .where({ status: 'active' })
      .whereNull('deleted_at')
      .count('* as count');
    const totalActive = Number(activeEmpRow?.count || 0);

    const [presentRow] = await db('attendance as a')
      .join('employees as e', 'a.employee_id', 'e.id')
      .where('a.date', today)
      .where('a.status', 'present')
      .where('e.status', 'active')
      .count('* as count');

    const [leaveRow] = await db('attendance as a')
      .join('employees as e', 'a.employee_id', 'e.id')
      .where('a.date', today)
      .where('a.status', 'leave')
      .where('e.status', 'active')
      .count('* as count');

    const [pendingLeavesRow] = await db('leave_requests')
      .where({ status: 'pending' })
      .count('* as count');

    const [pendingTimesheetsRow] = await db('timesheets')
      .where({ status: 'pending' })
      .count('* as count');

    return {
      totalActive,
      presentToday: Number(presentRow?.count || 0),
      onLeaveToday: Number(leaveRow?.count || 0),
      pendingLeavesCount: Number(pendingLeavesRow?.count || 0),
      pendingTimesheetsCount: Number(pendingTimesheetsRow?.count || 0),
      totalPendingApprovals: Number(pendingLeavesRow?.count || 0) + Number(pendingTimesheetsRow?.count || 0),
    };
  },
});

// ==========================================
// MANAGER WIDGETS
// ==========================================

// 6. Manager: Team Attendance Today
registerDashboardWidget({
  key: 'manager_team_attendance_today',
  title: 'Team Attendance Today',
  permission: 'attendance.view_team',
  handler: async (user: TokenUserPayload) => {
    if (!user.employeeId) return { teamCount: 0, presentCount: 0, absentCount: 0, members: [] };

    const today = new Date().toISOString().split('T')[0];

    const members = await db('employees as e')
      .leftJoin('attendance as a', function () {
        this.on('a.employee_id', '=', 'e.id').andOnVal('a.date', '=', today);
      })
      .where('e.reporting_manager_id', user.employeeId)
      .where('e.status', 'active')
      .whereNull('e.deleted_at')
      .select(
        'e.id',
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        'a.status as attendance_status',
        'a.check_in',
        'a.check_out',
        'a.work_type'
      );

    const presentCount = members.filter((m) => m.attendance_status === 'present').length;
    const onLeaveCount = members.filter((m) => m.attendance_status === 'leave').length;

    return {
      teamCount: members.length,
      presentCount,
      onLeaveCount,
      absentCount: members.length - presentCount - onLeaveCount,
      members,
    };
  },
});

// 7. Manager: Pending Leave and Timesheet Approvals
registerDashboardWidget({
  key: 'manager_pending_approvals',
  title: 'Pending Team Approvals',
  roles: ['Manager', 'Admin'],
  handler: async (user: TokenUserPayload) => {
    let leavesQ = db('leave_requests as lr')
      .join('employees as e', 'lr.employee_id', 'e.id')
      .join('leave_types as lt', 'lr.leave_type_id', 'lt.id')
      .where('lr.status', 'pending')
      .select('lr.id', 'e.first_name', 'e.last_name', 'lt.name as leave_type', 'lr.days', 'lr.from_date');

    let timesheetsQ = db('timesheets as t')
      .join('employees as e', 't.employee_id', 'e.id')
      .where('t.status', 'pending')
      .select('t.id', 'e.first_name', 'e.last_name', 't.hours', 't.date', 't.task_description');

    const isAdmin = user.roles.some((r) => r.toLowerCase() === 'admin' || r === '*');
    if (!isAdmin && user.employeeId) {
      leavesQ = leavesQ.where('e.reporting_manager_id', user.employeeId);
      timesheetsQ = timesheetsQ.where('e.reporting_manager_id', user.employeeId);
    }

    const pendingLeaves = await leavesQ.limit(5);
    const pendingTimesheets = await timesheetsQ.limit(5);

    return {
      pendingLeavesCount: pendingLeaves.length,
      pendingTimesheetsCount: pendingTimesheets.length,
      pendingLeaves,
      pendingTimesheets,
    };
  },
});

// 8. Manager: Team Leave Calendar (Next 14 Days)
registerDashboardWidget({
  key: 'manager_team_leave_calendar_14d',
  title: 'Team Leave Calendar (Next 14 Days)',
  roles: ['Manager', 'Admin'],
  handler: async (user: TokenUserPayload) => {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 14);

    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];

    let q = db('leave_request_days as lrd')
      .join('leave_requests as lr', 'lrd.leave_request_id', 'lr.id')
      .join('employees as e', 'lr.employee_id', 'e.id')
      .join('leave_types as lt', 'lr.leave_type_id', 'lt.id')
      .where('lrd.date', '>=', todayStr)
      .where('lrd.date', '<=', futureStr)
      .whereIn('lrd.status', ['approved', 'pending'])
      .where('e.status', 'active')
      .whereNull('e.deleted_at')
      .select(
        'lrd.date',
        'lrd.day_type',
        'lrd.status as day_status',
        'e.first_name',
        'e.last_name',
        'e.employee_code',
        'lt.name as leave_type_name'
      );

    const isAdmin = user.roles.some((r) => r.toLowerCase() === 'admin' || r === '*');
    if (!isAdmin && user.employeeId) {
      q = q.where('e.reporting_manager_id', user.employeeId);
    }

    const items = await q.orderBy('lrd.date', 'asc');
    return items;
  },
});

// ==========================================
// EMPLOYEE WIDGETS
// ==========================================

// 9. Employee: Today Attendance Card
registerDashboardWidget({
  key: 'employee_today_card',
  title: "Today's Attendance",
  handler: async (user: TokenUserPayload) => {
    if (!user.employeeId) return null;
    const today = new Date().toISOString().split('T')[0];

    const att = await db('attendance')
      .where({ employee_id: user.employeeId, date: today })
      .first();

    return att || { status: 'not_marked', date: today };
  },
});

// 10. Employee: Leave Balance Cards
registerDashboardWidget({
  key: 'employee_balances_card',
  title: 'My Leave Balances',
  handler: async (user: TokenUserPayload) => {
    if (!user.employeeId) return [];
    const currentYear = new Date().getFullYear();

    const rows = await db('leave_balances as lb')
      .join('leave_types as lt', 'lb.leave_type_id', 'lt.id')
      .where({ 'lb.employee_id': user.employeeId, 'lb.year': currentYear })
      .select(
        'lt.name as leave_type',
        'lt.code',
        'lb.allocated',
        'lb.used',
        'lb.pending'
      );

    return rows.map((r: any) => ({
      name: r.leave_type,
      code: r.code,
      available: Number(r.allocated),
      used: Number(r.used),
      pending: Number(r.pending),
      remaining: r.code === 'LOP' ? '∞' : Math.max(0, Number(r.allocated) - Number(r.used) - Number(r.pending)),
    }));
  },
});

// 11. Employee: Last 5 Payslips Link & Pending Timesheets
registerDashboardWidget({
  key: 'employee_recent_payslips_timesheets',
  title: 'Recent Payslips & Timesheets',
  handler: async (user: TokenUserPayload) => {
    if (!user.employeeId) return { payslips: [], pendingTimesheetsCount: 0 };

    const payslips = await db('payroll_items as pi')
      .join('payroll_runs as pr', 'pi.payroll_run_id', 'pr.id')
      .where('pi.employee_id', user.employeeId)
      .select('pi.id', 'pr.month', 'pi.net_salary', 'pi.status')
      .orderBy('pr.month', 'desc')
      .limit(5);

    const [tsRow] = await db('timesheets')
      .where({ employee_id: user.employeeId, status: 'pending' })
      .count('* as count');

    return {
      payslips: payslips.map((p) => ({
        id: p.id,
        month: p.month,
        netSalary: Number(p.net_salary),
        status: p.status,
      })),
      pendingTimesheetsCount: Number(tsRow?.count || 0),
    };
  },
});
