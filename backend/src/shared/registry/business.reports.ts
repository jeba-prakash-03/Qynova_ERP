import db from '../../db/knex';
import { registerReport } from './report.registry';
import { ReportFilterParams, ReportDataResult } from './types';
import { TokenUserPayload } from '../utils/jwt.util';
import { getTodayKolkata } from '../utils/date.util';
import { payrollIntegrationService } from '../../modules/profitability/payroll-integration.service';
import { LEAD_STAGES_CONFIG } from '../../modules/crm/crm.types';

// 1. Project Status Summary
registerReport({
  key: 'project_status_summary',
  title: 'Project Status Summary',
  group: 'Projects',
  permission: 'projects.view',
  columns: [
    { key: 'project_code', header: 'Project Code', width: 14 },
    { key: 'name', header: 'Project Name', width: 22 },
    { key: 'client_name', header: 'Client', width: 20 },
    { key: 'status', header: 'Status', width: 14 },
    { key: 'manager_name', header: 'Project Manager', width: 18 },
    { key: 'start_date', header: 'Start Date', width: 14, format: 'date' },
    { key: 'end_date', header: 'End Date', width: 14, format: 'date' },
    { key: 'budget', header: 'Budget', width: 16, format: 'currency' },
  ],
  handler: async (filters: ReportFilterParams): Promise<ReportDataResult> => {
    let query = db('projects')
      .join('clients', 'projects.client_id', 'clients.id')
      .leftJoin('employees', 'projects.project_manager_id', 'employees.id')
      .whereNull('projects.deleted_at');

    const fromDate = filters.from || filters.fromDate;
    const toDate = filters.to || filters.toDate;

    if (fromDate) query = query.where('projects.start_date', '>=', fromDate);
    if (toDate) query = query.where('projects.start_date', '<=', toDate);

    const rows = await query
      .select(
        'projects.id',
        'projects.project_code',
        'projects.name',
        'clients.company_name as client_name',
        'projects.status',
        db.raw("CONCAT(employees.first_name, ' ', employees.last_name) as manager_name"),
        'projects.start_date',
        'projects.end_date',
        'projects.budget'
      )
      .orderBy('projects.start_date', 'desc');

    return {
      title: 'Project Status Summary',
      columns: [
        { key: 'project_code', header: 'Project Code', width: 14 },
        { key: 'name', header: 'Project Name', width: 22 },
        { key: 'client_name', header: 'Client', width: 20 },
        { key: 'status', header: 'Status', width: 14 },
        { key: 'manager_name', header: 'Project Manager', width: 18 },
        { key: 'start_date', header: 'Start Date', width: 14, format: 'date' },
        { key: 'end_date', header: 'End Date', width: 14, format: 'date' },
        { key: 'budget', header: 'Budget', width: 16, format: 'currency' },
      ],
      rows: rows.map((r: any) => ({
        ...r,
        budget: Number(r.budget || 0),
        manager_name: r.manager_name || 'Unassigned',
      })),
      summary: {
        project_code: 'Total Projects',
        name: rows.length,
      },
    };
  },
});

// 2. Task Summary Per Employee
registerReport({
  key: 'task_summary_per_employee',
  title: 'Task Summary Per Employee',
  group: 'Tasks',
  permission: 'tasks.view',
  columns: [
    { key: 'employee_code', header: 'Employee Code', width: 14 },
    { key: 'employee_name', header: 'Employee Name', width: 22 },
    { key: 'department', header: 'Department', width: 18 },
    { key: 'total_tasks', header: 'Total Assigned', width: 14, format: 'number' },
    { key: 'completed_tasks', header: 'Completed', width: 14, format: 'number' },
    { key: 'in_progress_tasks', header: 'In Progress', width: 14, format: 'number' },
    { key: 'overdue_tasks', header: 'Overdue', width: 14, format: 'number' },
  ],
  handler: async (filters: ReportFilterParams): Promise<ReportDataResult> => {
    const today = getTodayKolkata();
    const fromDate = filters.from || filters.fromDate;
    const toDate = filters.to || filters.toDate;

    let taskQuery = db('tasks')
      .join('projects', 'tasks.project_id', 'projects.id')
      .whereNull('projects.deleted_at');

    if (fromDate) taskQuery = taskQuery.where('tasks.created_at', '>=', `${fromDate} 00:00:00`);
    if (toDate) taskQuery = taskQuery.where('tasks.created_at', '<=', `${toDate} 23:59:59`);

    const tasks = await taskQuery.select(
      'tasks.id',
      'tasks.assignee_id',
      'tasks.status',
      'tasks.due_date'
    );

    const employees = await db('employees')
      .leftJoin('departments', 'employees.department_id', 'departments.id')
      .select(
        'employees.id',
        'employees.employee_code',
        db.raw("CONCAT(employees.first_name, ' ', employees.last_name) as employee_name"),
        'departments.name as department_name'
      );

    const summaryMap = new Map<
      number,
      {
        employee_code: string;
        employee_name: string;
        department: string;
        total_tasks: number;
        completed_tasks: number;
        in_progress_tasks: number;
        overdue_tasks: number;
      }
    >();

    employees.forEach((emp: any) => {
      summaryMap.set(emp.id, {
        employee_code: emp.employee_code,
        employee_name: emp.employee_name,
        department: emp.department_name || 'Engineering',
        total_tasks: 0,
        completed_tasks: 0,
        in_progress_tasks: 0,
        overdue_tasks: 0,
      });
    });

    tasks.forEach((t: any) => {
      if (!t.assignee_id || !summaryMap.has(t.assignee_id)) return;
      const entry = summaryMap.get(t.assignee_id)!;
      entry.total_tasks += 1;
      if (t.status === 'completed') {
        entry.completed_tasks += 1;
      } else {
        if (t.status === 'in_progress') {
          entry.in_progress_tasks += 1;
        }
        if (t.due_date && t.due_date < today) {
          entry.overdue_tasks += 1;
        }
      }
    });

    const rows = Array.from(summaryMap.values()).filter((r) => r.total_tasks > 0);

    return {
      title: 'Task Summary Per Employee',
      columns: [
        { key: 'employee_code', header: 'Employee Code', width: 14 },
        { key: 'employee_name', header: 'Employee Name', width: 22 },
        { key: 'department', header: 'Department', width: 18 },
        { key: 'total_tasks', header: 'Total Assigned', width: 14, format: 'number' },
        { key: 'completed_tasks', header: 'Completed', width: 14, format: 'number' },
        { key: 'in_progress_tasks', header: 'In Progress', width: 14, format: 'number' },
        { key: 'overdue_tasks', header: 'Overdue', width: 14, format: 'number' },
      ],
      rows,
      summary: {
        employee_code: 'Total Active Staff',
        employee_name: rows.length,
      },
    };
  },
});

// 3. Utilization Per Employee
registerReport({
  key: 'utilization_per_employee',
  title: 'Employee Timesheet Utilization',
  group: 'HR',
  permission: 'timesheets.view',
  columns: [
    { key: 'employee_code', header: 'Employee Code', width: 14 },
    { key: 'employee_name', header: 'Employee Name', width: 22 },
    { key: 'department', header: 'Department', width: 18 },
    { key: 'approved_hours', header: 'Approved Hours', width: 16, format: 'number' },
    { key: 'available_hours', header: 'Available Hours', width: 16, format: 'number' },
    { key: 'utilization_percent', header: 'Utilization', width: 14 },
  ],
  handler: async (filters: ReportFilterParams): Promise<ReportDataResult> => {
    let tsQuery = db('timesheets').where('status', 'approved');
    const fromDate = filters.from || filters.fromDate;
    const toDate = filters.to || filters.toDate;

    if (fromDate) tsQuery = tsQuery.where('date', '>=', fromDate);
    if (toDate) tsQuery = tsQuery.where('date', '<=', toDate);

    const timesheetRows = await tsQuery
      .groupBy('employee_id')
      .select('employee_id')
      .sum('hours as total_hours');

    const employees = await db('employees')
      .leftJoin('departments', 'employees.department_id', 'departments.id')
      .select(
        'employees.id',
        'employees.employee_code',
        db.raw("CONCAT(employees.first_name, ' ', employees.last_name) as employee_name"),
        'departments.name as department'
      );

    const availableHours = 160;
    const hoursMap = new Map<number, number>();
    timesheetRows.forEach((r: any) => {
      hoursMap.set(Number(r.employee_id), Number(r.total_hours || 0));
    });

    const rows = employees.map((emp: any) => {
      const approvedHours = hoursMap.get(emp.id) || 0;
      const utilization = Number(((approvedHours / availableHours) * 100).toFixed(1));

      return {
        employee_code: emp.employee_code,
        employee_name: emp.employee_name,
        department: emp.department || 'Engineering',
        approved_hours: approvedHours,
        available_hours: availableHours,
        utilization_percent: `${utilization}%`,
      };
    });

    return {
      title: 'Employee Timesheet Utilization',
      columns: [
        { key: 'employee_code', header: 'Employee Code', width: 14 },
        { key: 'employee_name', header: 'Employee Name', width: 22 },
        { key: 'department', header: 'Department', width: 18 },
        { key: 'approved_hours', header: 'Approved Hours', width: 16, format: 'number' },
        { key: 'available_hours', header: 'Available Hours', width: 16, format: 'number' },
        { key: 'utilization_percent', header: 'Utilization', width: 14 },
      ],
      rows,
    };
  },
});

// 4. Budget vs Actual Per Project (Guarded by projects.view_financials)
registerReport({
  key: 'budget_vs_actual_per_project',
  title: 'Project Budget vs Actual Cost',
  group: 'Finance',
  permission: 'projects.view_financials',
  columns: [
    { key: 'project_code', header: 'Project Code', width: 14 },
    { key: 'project_name', header: 'Project Name', width: 22 },
    { key: 'client_name', header: 'Client', width: 20 },
    { key: 'budget', header: 'Budget', width: 16, format: 'currency' },
    { key: 'labor_cost', header: 'Labor Cost', width: 16, format: 'currency' },
    { key: 'expense_cost', header: 'Expense Cost', width: 16, format: 'currency' },
    { key: 'total_actual', header: 'Total Actual', width: 16, format: 'currency' },
    { key: 'variance', header: 'Variance', width: 16, format: 'currency' },
    { key: 'budget_used_percent', header: 'Budget Used %', width: 14 },
  ],
  handler: async (): Promise<ReportDataResult> => {
    const projects = await db('projects')
      .join('clients', 'projects.client_id', 'clients.id')
      .whereNull('projects.deleted_at')
      .select(
        'projects.id',
        'projects.project_code',
        'projects.name',
        'projects.budget',
        'clients.company_name as client_name'
      );

    const rows = await Promise.all(
      projects.map(async (p: any) => {
        const budget = Number(p.budget || 0);

        const tsRows = await db('timesheets')
          .where({ project_id: p.id, status: 'approved' })
          .groupBy('employee_id')
          .select('employee_id')
          .sum('hours as total_hours');

        let laborCost = 0;
        for (const ts of tsRows) {
          const hourlyRate = await payrollIntegrationService.getHourlyCost(Number(ts.employee_id));
          laborCost += Number(ts.total_hours || 0) * hourlyRate;
        }

        const expResult = await db('expenses')
          .where({ project_id: p.id })
          .whereIn('status', ['approved', 'paid'])
          .sum('amount as total_expenses')
          .first();

        const expenseCost = Number(expResult?.total_expenses || 0);
        const totalActual = laborCost + expenseCost;
        const variance = budget - totalActual;
        const budgetUsedPercent = budget > 0 ? Number(((totalActual / budget) * 100).toFixed(1)) : 0;

        return {
          project_code: p.project_code,
          project_name: p.name,
          client_name: p.client_name,
          budget: Number(budget.toFixed(2)),
          labor_cost: Number(laborCost.toFixed(2)),
          expense_cost: Number(expenseCost.toFixed(2)),
          total_actual: Number(totalActual.toFixed(2)),
          variance: Number(variance.toFixed(2)),
          budget_used_percent: `${budgetUsedPercent}%`,
        };
      })
    );

    return {
      title: 'Project Budget vs Actual Cost',
      columns: [
        { key: 'project_code', header: 'Project Code', width: 14 },
        { key: 'project_name', header: 'Project Name', width: 22 },
        { key: 'client_name', header: 'Client', width: 20 },
        { key: 'budget', header: 'Budget', width: 16, format: 'currency' },
        { key: 'labor_cost', header: 'Labor Cost', width: 16, format: 'currency' },
        { key: 'expense_cost', header: 'Expense Cost', width: 16, format: 'currency' },
        { key: 'total_actual', header: 'Total Actual', width: 16, format: 'currency' },
        { key: 'variance', header: 'Variance', width: 16, format: 'currency' },
        { key: 'budget_used_percent', header: 'Budget Used %', width: 14 },
      ],
      rows,
    };
  },
});

// 5. Income vs Expenses Per Month
registerReport({
  key: 'income_vs_expenses_per_month',
  title: 'Monthly Income vs Expenses',
  group: 'Finance',
  permission: 'invoices.view',
  columns: [
    { key: 'month', header: 'Month', width: 14 },
    { key: 'income', header: 'Total Revenue (Income)', width: 22, format: 'currency' },
    { key: 'expenses', header: 'Total Expenses', width: 20, format: 'currency' },
    { key: 'net_profit', header: 'Net Margin', width: 20, format: 'currency' },
  ],
  handler: async (filters: ReportFilterParams): Promise<ReportDataResult> => {
    let paymentsQuery = db('payments');
    let expensesQuery = db('expenses').whereIn('status', ['approved', 'paid']);
    const fromDate = filters.from || filters.fromDate;
    const toDate = filters.to || filters.toDate;

    if (fromDate) {
      paymentsQuery = paymentsQuery.where('payment_date', '>=', fromDate);
      expensesQuery = expensesQuery.where('date', '>=', fromDate);
    }
    if (toDate) {
      paymentsQuery = paymentsQuery.where('payment_date', '<=', toDate);
      expensesQuery = expensesQuery.where('date', '<=', toDate);
    }

    const payments = await paymentsQuery.select(
      db.raw("DATE_FORMAT(payment_date, '%Y-%m') as month"),
      db.raw('SUM(amount) as income')
    ).groupBy('month');

    const expenses = await expensesQuery.select(
      db.raw("DATE_FORMAT(date, '%Y-%m') as month"),
      db.raw('SUM(amount) as total_expenses')
    ).groupBy('month');

    const monthsSet = new Set<string>();
    payments.forEach((p: any) => monthsSet.add(p.month));
    expenses.forEach((e: any) => monthsSet.add(e.month));

    const sortedMonths = Array.from(monthsSet).sort();
    const paymentMap = new Map(payments.map((p: any) => [p.month, Number(p.income || 0)]));
    const expenseMap = new Map(expenses.map((e: any) => [e.month, Number(e.total_expenses || 0)]));

    const rows = sortedMonths.map((m) => {
      const income = paymentMap.get(m) || 0;
      const expense = expenseMap.get(m) || 0;
      const netProfit = income - expense;

      return {
        month: m,
        income: Number(income.toFixed(2)),
        expenses: Number(expense.toFixed(2)),
        net_profit: Number(netProfit.toFixed(2)),
      };
    });

    return {
      title: 'Monthly Income vs Expenses',
      columns: [
        { key: 'month', header: 'Month', width: 14 },
        { key: 'income', header: 'Total Revenue (Income)', width: 22, format: 'currency' },
        { key: 'expenses', header: 'Total Expenses', width: 20, format: 'currency' },
        { key: 'net_profit', header: 'Net Margin', width: 20, format: 'currency' },
      ],
      rows,
    };
  },
});

// 6. Invoice Aging
registerReport({
  key: 'invoice_aging',
  title: 'Invoice Aging Analysis',
  group: 'Finance',
  permission: 'invoices.view',
  columns: [
    { key: 'invoice_number', header: 'Invoice #', width: 16 },
    { key: 'client_name', header: 'Client', width: 20 },
    { key: 'issue_date', header: 'Issue Date', width: 14, format: 'date' },
    { key: 'due_date', header: 'Due Date', width: 14, format: 'date' },
    { key: 'total', header: 'Total', width: 16, format: 'currency' },
    { key: 'amount_paid', header: 'Paid', width: 16, format: 'currency' },
    { key: 'balance_due', header: 'Balance Due', width: 16, format: 'currency' },
    { key: 'days_overdue', header: 'Overdue Days', width: 14, format: 'number' },
    { key: 'aging_bucket', header: 'Aging Category', width: 16 },
  ],
  handler: async (filters: ReportFilterParams): Promise<ReportDataResult> => {
    const today = getTodayKolkata();
    const todayDate = new Date(today);
    const fromDate = filters.from || filters.fromDate;
    const toDate = filters.to || filters.toDate;

    let query = db('invoices')
      .join('clients', 'invoices.client_id', 'clients.id')
      .whereIn('invoices.status', ['sent', 'viewed', 'partially_paid', 'overdue']);

    if (fromDate) query = query.where('invoices.issue_date', '>=', fromDate);
    if (toDate) query = query.where('invoices.issue_date', '<=', toDate);

    const invoices = await query.select(
      'invoices.id',
      'invoices.invoice_number',
      'clients.company_name as client_name',
      'invoices.issue_date',
      'invoices.due_date',
      'invoices.total',
      'invoices.amount_paid'
    );

    const rows = invoices.map((inv: any) => {
      const total = Number(inv.total || 0);
      const paid = Number(inv.amount_paid || 0);
      const balanceDue = Math.max(0, total - paid);

      const dueDate = new Date(inv.due_date);
      const diffMs = todayDate.getTime() - dueDate.getTime();
      const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      let bucket = 'Current';
      if (diffDays > 90) bucket = '90+ Days';
      else if (diffDays > 60) bucket = '61-90 Days';
      else if (diffDays > 30) bucket = '31-60 Days';
      else if (diffDays > 0) bucket = '0-30 Days';

      return {
        invoice_number: inv.invoice_number,
        client_name: inv.client_name,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        total,
        amount_paid: paid,
        balance_due: balanceDue,
        days_overdue: diffDays,
        aging_bucket: bucket,
      };
    });

    return {
      title: 'Invoice Aging Analysis',
      columns: [
        { key: 'invoice_number', header: 'Invoice #', width: 16 },
        { key: 'client_name', header: 'Client', width: 20 },
        { key: 'issue_date', header: 'Issue Date', width: 14, format: 'date' },
        { key: 'due_date', header: 'Due Date', width: 14, format: 'date' },
        { key: 'total', header: 'Total', width: 16, format: 'currency' },
        { key: 'amount_paid', header: 'Paid', width: 16, format: 'currency' },
        { key: 'balance_due', header: 'Balance Due', width: 16, format: 'currency' },
        { key: 'days_overdue', header: 'Overdue Days', width: 14, format: 'number' },
        { key: 'aging_bucket', header: 'Aging Category', width: 16 },
      ],
      rows,
    };
  },
});

// 7. Client-wise Revenue
registerReport({
  key: 'client_wise_revenue',
  title: 'Client-wise Revenue & Billing',
  group: 'Finance',
  permission: 'invoices.view',
  columns: [
    { key: 'client_code', header: 'Client Code', width: 14 },
    { key: 'company_name', header: 'Client Company', width: 22 },
    { key: 'active_projects_count', header: 'Projects', width: 12, format: 'number' },
    { key: 'total_invoiced', header: 'Total Invoiced', width: 18, format: 'currency' },
    { key: 'total_paid', header: 'Total Collected', width: 18, format: 'currency' },
    { key: 'outstanding_balance', header: 'Outstanding Balance', width: 18, format: 'currency' },
  ],
  handler: async (filters: ReportFilterParams): Promise<ReportDataResult> => {
    const clients = await db('clients')
      .whereNull('deleted_at')
      .select('id', 'client_code', 'company_name');

    const fromDate = filters.from || filters.fromDate;
    const toDate = filters.to || filters.toDate;

    const rows = await Promise.all(
      clients.map(async (c: any) => {
        const projResult = await db('projects')
          .where({ client_id: c.id })
          .whereNull('deleted_at')
          .count('id as count')
          .first();

        let invQuery = db('invoices').where({ client_id: c.id });
        if (fromDate) invQuery = invQuery.where('issue_date', '>=', fromDate);
        if (toDate) invQuery = invQuery.where('issue_date', '<=', toDate);

        const invResult = await invQuery
          .whereNot('status', 'cancelled')
          .sum('total as total_invoiced')
          .sum('amount_paid as total_paid')
          .first();

        const totalInvoiced = Number(invResult?.total_invoiced || 0);
        const totalPaid = Number(invResult?.total_paid || 0);
        const balance = Math.max(0, totalInvoiced - totalPaid);

        return {
          client_code: c.client_code,
          company_name: c.company_name,
          active_projects_count: Number(projResult?.count || 0),
          total_invoiced: totalInvoiced,
          total_paid: totalPaid,
          outstanding_balance: balance,
        };
      })
    );

    return {
      title: 'Client-wise Revenue & Billing',
      columns: [
        { key: 'client_code', header: 'Client Code', width: 14 },
        { key: 'company_name', header: 'Client Company', width: 22 },
        { key: 'active_projects_count', header: 'Projects', width: 12, format: 'number' },
        { key: 'total_invoiced', header: 'Total Invoiced', width: 18, format: 'currency' },
        { key: 'total_paid', header: 'Total Collected', width: 18, format: 'currency' },
        { key: 'outstanding_balance', header: 'Outstanding Balance', width: 18, format: 'currency' },
      ],
      rows,
    };
  },
});

// 8. Sales Pipeline and Forecast
registerReport({
  key: 'sales_pipeline_forecast',
  title: 'Sales Pipeline & Weighted Forecast',
  group: 'Sales',
  permission: 'crm.view',
  columns: [
    { key: 'stage_label', header: 'Pipeline Stage', width: 18 },
    { key: 'leads_count', header: 'Leads Count', width: 14, format: 'number' },
    { key: 'total_value', header: 'Total Value', width: 18, format: 'currency' },
    { key: 'default_probability', header: 'Probability %', width: 14 },
    { key: 'weighted_value', header: 'Weighted Value', width: 18, format: 'currency' },
  ],
  handler: async (filters: ReportFilterParams): Promise<ReportDataResult> => {
    let query = db('leads');
    const fromDate = filters.from || filters.fromDate;
    const toDate = filters.to || filters.toDate;

    if (fromDate) query = query.where('created_at', '>=', `${fromDate} 00:00:00`);
    if (toDate) query = query.where('created_at', '<=', `${toDate} 23:59:59`);

    const leads = await query.select(
      'stage',
      'estimated_value',
      'probability_percent'
    );

    const stages = [
      'lead',
      'contact',
      'requirement',
      'meeting',
      'proposal',
      'negotiation',
      'won',
      'lost',
    ] as const;

    const rows = stages.map((stg) => {
      const config = LEAD_STAGES_CONFIG[stg];
      const stageLeads = leads.filter((l: any) => l.stage === stg);
      const count = stageLeads.length;
      const totalValue = stageLeads.reduce(
        (acc: number, l: any) => acc + Number(l.estimated_value || 0),
        0
      );
      const weightedValue = stageLeads.reduce(
        (acc: number, l: any) =>
          acc + (Number(l.estimated_value || 0) * Number(l.probability_percent || 0)) / 100,
        0
      );

      return {
        stage: stg,
        stage_label: config.label,
        leads_count: count,
        total_value: Number(totalValue.toFixed(2)),
        default_probability: `${config.defaultProbability}%`,
        weighted_value: Number(weightedValue.toFixed(2)),
      };
    });

    return {
      title: 'Sales Pipeline & Weighted Forecast',
      columns: [
        { key: 'stage_label', header: 'Pipeline Stage', width: 18 },
        { key: 'leads_count', header: 'Leads Count', width: 14, format: 'number' },
        { key: 'total_value', header: 'Total Value', width: 18, format: 'currency' },
        { key: 'default_probability', header: 'Probability %', width: 14 },
        { key: 'weighted_value', header: 'Weighted Value', width: 18, format: 'currency' },
      ],
      rows,
    };
  },
});
