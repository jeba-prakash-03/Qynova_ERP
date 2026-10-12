import db from '../../db/knex';
import { TokenUserPayload } from '../utils/jwt.util';
import { registerDashboardWidget, getDashboardWidgets, executeDashboardWidget, getAllRegisteredWidgets } from './widget.registry';
import { registerReport, getReports, executeReport, getReportDefinition, getAllRegisteredReports } from './report.registry';
import { generateExcelReport, generatePdfReport } from './export.util';
import { DashboardWidgetDefinition, ReportDefinition, ReportFilterParams, ReportDataResult } from './types';

export * from './types';
export * from './widget.registry';
export * from './report.registry';
export * from './export.util';

// Register HR reports suite
import './hr.reports';

// ==========================================
// REGISTER BASE DASHBOARD WIDGETS
// ==========================================

// 1. Metrics Overview
registerDashboardWidget({
  key: 'metrics_overview',
  title: 'Company Metrics Overview',
  permission: 'employees.view',
  handler: async (_user: TokenUserPayload) => {
    const [totalEmpRow] = await db('employees').count('* as count');
    const [activeRow] = await db('employees').where({ status: 'active' }).count('* as count');
    const [onboardingRow] = await db('employees').where({ lifecycle_stage: 'onboarding' }).count('* as count');
    const [relievedRow] = await db('employees').where({ lifecycle_stage: 'relieved' }).count('* as count');
    const [deptRow] = await db('departments').count('* as count');
    const [roleRow] = await db('roles').count('* as count');

    return {
      totalEmployees: Number(totalEmpRow?.count || 0),
      activeTotal: Number(activeRow?.count || 0),
      onboardingCount: Number(onboardingRow?.count || 0),
      relievedCount: Number(relievedRow?.count || 0),
      departmentsCount: Number(deptRow?.count || 0),
      rolesCount: Number(roleRow?.count || 0),
    };
  },
});

// 2. Pending Leaves
registerDashboardWidget({
  key: 'pending_leaves',
  title: 'Pending Leave Approvals',
  permission: 'leaves.view',
  handler: async (user: TokenUserPayload) => {
    let query = db('leave_requests as lr')
      .join('employees as e', 'lr.employee_id', 'e.id')
      .join('leave_types as lt', 'lr.leave_type_id', 'lt.id')
      .select(
        'lr.id',
        'lr.start_date',
        'lr.end_date',
        'lr.total_days',
        'lr.reason',
        'lr.status',
        'lr.created_at',
        'e.first_name',
        'e.last_name',
        'e.employee_code',
        'lt.name as leave_type_name'
      )
      .where('lr.status', 'pending');

    const isAdmin = user.roles.some((r) => r.toLowerCase() === 'admin' || r === '*');
    if (!isAdmin && user.employeeId) {
      query = query.where('e.reporting_manager_id', user.employeeId);
    }

    const items = await query.orderBy('lr.created_at', 'desc').limit(10);
    return {
      count: items.length,
      items,
    };
  },
});

// 3. Today's Attendance Summary
registerDashboardWidget({
  key: 'today_attendance_summary',
  title: "Today's Attendance Summary",
  permission: 'attendance.view',
  handler: async (_user: TokenUserPayload) => {
    const today = new Date().toISOString().split('T')[0];

    const records = await db('attendance')
      .where({ date: today })
      .select('status', 'is_late', 'is_early_checkout');

    const totalMarked = records.length;
    const present = records.filter((r) => r.status === 'present').length;
    const absent = records.filter((r) => r.status === 'absent').length;
    const halfDay = records.filter((r) => r.status === 'half_day').length;
    const onLeave = records.filter((r) => r.status === 'leave').length;
    const late = records.filter((r) => Boolean(r.is_late)).length;

    const [activeEmpCountRow] = await db('employees').where({ status: 'active' }).count('* as count');
    const totalActive = Number(activeEmpCountRow?.count || 0);

    return {
      date: today,
      totalActive,
      totalMarked,
      present,
      absent: Math.max(absent, totalActive - totalMarked),
      halfDay,
      onLeave,
      late,
    };
  },
});

// 4. Recent Employees
registerDashboardWidget({
  key: 'recent_employees',
  title: 'Recent Joiners',
  permission: 'employees.view',
  handler: async (_user: TokenUserPayload) => {
    const employees = await db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('designations as des', 'e.designation_id', 'des.id')
      .select(
        'e.id',
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        'e.email',
        'e.status',
        'e.lifecycle_stage',
        'e.joining_date',
        'd.name as department_name',
        'des.name as designation_title'
      )
      .where('e.status', '!=', 'archived')
      .orderBy('e.joining_date', 'desc')
      .limit(5);

    return employees;
  },
});

// 5. Department Distribution
registerDashboardWidget({
  key: 'department_distribution',
  title: 'Department Distribution',
  permission: 'departments.view',
  handler: async (_user: TokenUserPayload) => {
    const distribution = await db('departments as d')
      .leftJoin('employees as e', function () {
        this.on('e.department_id', '=', 'd.id').andOnVal('e.status', '=', 'active');
      })
      .select('d.id', 'd.name')
      .count('e.id as employee_count')
      .groupBy('d.id', 'd.name')
      .orderBy('employee_count', 'desc');

    return distribution.map((d) => ({
      id: d.id,
      name: d.name,
      count: Number(d.employee_count || 0),
    }));
  },
});

// ==========================================
// REGISTER BASE REPORTS
// ==========================================

// Base Headcount / Directory Report
registerReport({
  key: 'employee_directory',
  title: 'Employee Directory & Headcount',
  group: 'HR',
  permission: 'employees.view',
  columns: [
    { key: 'employee_code', header: 'Emp Code', width: 14 },
    { key: 'full_name', header: 'Employee Name', width: 22 },
    { key: 'email', header: 'Email Address', width: 24 },
    { key: 'department', header: 'Department', width: 18 },
    { key: 'designation', header: 'Designation', width: 18 },
    { key: 'status', header: 'Status', width: 12 },
    { key: 'joining_date', header: 'Joining Date', width: 14, format: 'date' },
  ],
  handler: async (filters: ReportFilterParams, user: TokenUserPayload): Promise<ReportDataResult> => {
    let query = db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('designations as des', 'e.designation_id', 'des.id')
      .select(
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        'e.email',
        'e.status',
        'e.joining_date',
        'd.name as department_name',
        'des.name as designation_title'
      );

    const isAdmin = user.roles.some((r) => r.toLowerCase() === 'admin' || r === '*');
    if (!isAdmin && user.employeeId) {
      query = query.where('e.reporting_manager_id', user.employeeId);
    }

    if (filters.department) {
      query = query.where('e.department_id', filters.department);
    }

    if (filters.from) {
      query = query.where('e.joining_date', '>=', filters.from);
    }

    if (filters.to) {
      query = query.where('e.joining_date', '<=', filters.to);
    }

    const rows = await query.orderBy('e.joining_date', 'desc');

    return {
      title: 'Employee Directory & Headcount',
      columns: [
        { key: 'employee_code', header: 'Emp Code', width: 14 },
        { key: 'full_name', header: 'Employee Name', width: 22 },
        { key: 'email', header: 'Email Address', width: 24 },
        { key: 'department', header: 'Department', width: 18 },
        { key: 'designation', header: 'Designation', width: 18 },
        { key: 'status', header: 'Status', width: 12 },
        { key: 'joining_date', header: 'Joining Date', width: 14, format: 'date' },
      ],
      rows: rows.map((r) => ({
        employee_code: r.employee_code,
        full_name: `${r.first_name} ${r.last_name}`,
        email: r.email,
        department: r.department_name || '-',
        designation: r.designation_title || '-',
        status: (r.status || '').toUpperCase(),
        joining_date: r.joining_date ? new Date(r.joining_date).toISOString().split('T')[0] : '-',
      })),
      summary: {
        employee_code: 'Total Employees',
        full_name: rows.length,
      },
    };
  },
});
