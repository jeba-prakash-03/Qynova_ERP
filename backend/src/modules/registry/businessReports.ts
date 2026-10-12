import db from '../../db/knex';
import { registerReport, ReportResult } from '../../shared/registry/reportRegistry';
import { getTodayKolkata } from '../../shared/utils/date.util';
import { payrollIntegrationService } from '../profitability/payroll-integration.service';
import { LEAD_STAGES_CONFIG } from '../crm/crm.types';

export function registerAllBusinessReports(): void {
  // 1. Project Status Summary
  registerReport({
    id: 'project_status_summary',
    title: 'Project Status Summary',
    description: 'Overview of all engineering projects with timelines, clients, and budgets',
    category: 'projects',
    permission: 'projects.view',
    getData: async (filters) => {
      let query = db('projects')
        .join('clients', 'projects.client_id', 'clients.id')
        .leftJoin('employees', 'projects.project_manager_id', 'employees.id')
        .whereNull('projects.deleted_at');

      if (filters.fromDate) {
        query = query.where('projects.start_date', '>=', filters.fromDate);
      }
      if (filters.toDate) {
        query = query.where('projects.start_date', '<=', filters.toDate);
      }

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
        generatedAt: getTodayKolkata(),
        filters,
        columns: [
          { key: 'project_code', label: 'Project Code', format: 'text' },
          { key: 'name', label: 'Project Name', format: 'text' },
          { key: 'client_name', label: 'Client', format: 'text' },
          { key: 'status', label: 'Status', format: 'status' },
          { key: 'manager_name', label: 'Project Manager', format: 'text' },
          { key: 'start_date', label: 'Start Date', format: 'date' },
          { key: 'end_date', label: 'End Date', format: 'date' },
          { key: 'budget', label: 'Budget', format: 'currency' },
        ],
        rows: rows.map((r: any) => ({
          ...r,
          budget: Number(r.budget || 0),
          manager_name: r.manager_name || 'Unassigned',
        })),
        totalRows: rows.length,
      };
    },
  });

  // 2. Task Summary Per Employee
  registerReport({
    id: 'task_summary_per_employee',
    title: 'Task Summary Per Employee',
    description: 'Task assignment and completion metrics across technical staff',
    category: 'tasks',
    permission: 'tasks.view',
    getData: async (filters) => {
      const today = getTodayKolkata();

      let taskQuery = db('tasks')
        .join('projects', 'tasks.project_id', 'projects.id')
        .whereNull('projects.deleted_at');

      if (filters.fromDate) {
        taskQuery = taskQuery.where('tasks.created_at', '>=', `${filters.fromDate} 00:00:00`);
      }
      if (filters.toDate) {
        taskQuery = taskQuery.where('tasks.created_at', '<=', `${filters.toDate} 23:59:59`);
      }

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
        generatedAt: getTodayKolkata(),
        filters,
        columns: [
          { key: 'employee_code', label: 'Employee Code', format: 'text' },
          { key: 'employee_name', label: 'Employee Name', format: 'text' },
          { key: 'department', label: 'Department', format: 'text' },
          { key: 'total_tasks', label: 'Total Assigned', format: 'number' },
          { key: 'completed_tasks', label: 'Completed', format: 'number' },
          { key: 'in_progress_tasks', label: 'In Progress', format: 'number' },
          { key: 'overdue_tasks', label: 'Overdue', format: 'number' },
        ],
        rows,
        totalRows: rows.length,
      };
    },
  });

  // 3. Utilization Per Employee (Approved Hours vs Available Hours)
  registerReport({
    id: 'utilization_per_employee',
    title: 'Employee Timesheet Utilization',
    description: 'Productive approved timesheet hours versus available working capacity',
    category: 'hr',
    permission: 'timesheets.view',
    getData: async (filters) => {
      let tsQuery = db('timesheets').where('status', 'approved');

      if (filters.fromDate) {
        tsQuery = tsQuery.where('date', '>=', filters.fromDate);
      }
      if (filters.toDate) {
        tsQuery = tsQuery.where('date', '<=', filters.toDate);
      }

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

      // Default baseline: 160 available hours per standard month
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
        generatedAt: getTodayKolkata(),
        filters,
        columns: [
          { key: 'employee_code', label: 'Employee Code', format: 'text' },
          { key: 'employee_name', label: 'Employee Name', format: 'text' },
          { key: 'department', label: 'Department', format: 'text' },
          { key: 'approved_hours', label: 'Approved Hours', format: 'number' },
          { key: 'available_hours', label: 'Available Hours', format: 'number' },
          { key: 'utilization_percent', label: 'Utilization', format: 'percentage' },
        ],
        rows,
        totalRows: rows.length,
      };
    },
  });

  // 4. Budget vs Actual Per Project (Strictly guarded by projects.view_financials)
  registerReport({
    id: 'budget_vs_actual_per_project',
    title: 'Project Budget vs Actual Cost',
    description: 'Financial tracking comparing baseline project budgets against labor and expense costs',
    category: 'finance',
    permission: 'projects.view_financials',
    getData: async (filters) => {
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

          // 1. Labor Cost
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

          // 2. Expenses
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
        generatedAt: getTodayKolkata(),
        filters,
        columns: [
          { key: 'project_code', label: 'Project Code', format: 'text' },
          { key: 'project_name', label: 'Project Name', format: 'text' },
          { key: 'client_name', label: 'Client', format: 'text' },
          { key: 'budget', label: 'Budget', format: 'currency' },
          { key: 'labor_cost', label: 'Labor Cost', format: 'currency' },
          { key: 'expense_cost', label: 'Expense Cost', format: 'currency' },
          { key: 'total_actual', label: 'Total Actual', format: 'currency' },
          { key: 'variance', label: 'Variance', format: 'currency' },
          { key: 'budget_used_percent', label: 'Budget Used %', format: 'percentage' },
        ],
        rows,
        totalRows: rows.length,
      };
    },
  });

  // 5. Income vs Expenses Per Month
  registerReport({
    id: 'income_vs_expenses_per_month',
    title: 'Monthly Income vs Expenses',
    description: 'Cash-inflow from invoice payments compared against approved business expenditure',
    category: 'finance',
    permission: 'invoices.view',
    getData: async (filters) => {
      let paymentsQuery = db('payments');
      let expensesQuery = db('expenses').whereIn('status', ['approved', 'paid']);

      if (filters.fromDate) {
        paymentsQuery = paymentsQuery.where('payment_date', '>=', filters.fromDate);
        expensesQuery = expensesQuery.where('date', '>=', filters.fromDate);
      }
      if (filters.toDate) {
        paymentsQuery = paymentsQuery.where('payment_date', '<=', filters.toDate);
        expensesQuery = expensesQuery.where('date', '<=', filters.toDate);
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
        generatedAt: getTodayKolkata(),
        filters,
        columns: [
          { key: 'month', label: 'Month', format: 'text' },
          { key: 'income', label: 'Total Revenue (Income)', format: 'currency' },
          { key: 'expenses', label: 'Total Expenses', format: 'currency' },
          { key: 'net_profit', label: 'Net Margin', format: 'currency' },
        ],
        rows,
        totalRows: rows.length,
      };
    },
  });

  // 6. Invoice Aging
  registerReport({
    id: 'invoice_aging',
    title: 'Invoice Aging Analysis',
    description: 'Detailed analysis of receivables categorized by payment overdue timeline',
    category: 'finance',
    permission: 'invoices.view',
    getData: async (filters) => {
      const today = getTodayKolkata();
      const todayDate = new Date(today);

      let query = db('invoices')
        .join('clients', 'invoices.client_id', 'clients.id')
        .whereIn('invoices.status', ['sent', 'viewed', 'partially_paid', 'overdue']);

      if (filters.fromDate) {
        query = query.where('invoices.issue_date', '>=', filters.fromDate);
      }
      if (filters.toDate) {
        query = query.where('invoices.issue_date', '<=', filters.toDate);
      }

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
        generatedAt: getTodayKolkata(),
        filters,
        columns: [
          { key: 'invoice_number', label: 'Invoice #', format: 'text' },
          { key: 'client_name', label: 'Client', format: 'text' },
          { key: 'issue_date', label: 'Issue Date', format: 'date' },
          { key: 'due_date', label: 'Due Date', format: 'date' },
          { key: 'total', label: 'Total', format: 'currency' },
          { key: 'amount_paid', label: 'Paid', format: 'currency' },
          { key: 'balance_due', label: 'Balance Due', format: 'currency' },
          { key: 'days_overdue', label: 'Overdue Days', format: 'number' },
          { key: 'aging_bucket', label: 'Aging Category', format: 'status' },
        ],
        rows,
        totalRows: rows.length,
      };
    },
  });

  // 7. Client-wise Revenue
  registerReport({
    id: 'client_wise_revenue',
    title: 'Client-wise Revenue & Billing',
    description: 'Summary of billed amounts, collected payments, and active project counts per client',
    category: 'finance',
    permission: 'invoices.view',
    getData: async (filters) => {
      const clients = await db('clients')
        .whereNull('deleted_at')
        .select('id', 'client_code', 'company_name');

      const rows = await Promise.all(
        clients.map(async (c: any) => {
          // Projects count
          const projResult = await db('projects')
            .where({ client_id: c.id })
            .whereNull('deleted_at')
            .count('id as count')
            .first();

          // Invoiced totals
          let invQuery = db('invoices').where({ client_id: c.id });
          if (filters.fromDate) invQuery = invQuery.where('issue_date', '>=', filters.fromDate);
          if (filters.toDate) invQuery = invQuery.where('issue_date', '<=', filters.toDate);

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
        generatedAt: getTodayKolkata(),
        filters,
        columns: [
          { key: 'client_code', label: 'Client Code', format: 'text' },
          { key: 'company_name', label: 'Client Company', format: 'text' },
          { key: 'active_projects_count', label: 'Projects', format: 'number' },
          { key: 'total_invoiced', label: 'Total Invoiced', format: 'currency' },
          { key: 'total_paid', label: 'Total Collected', format: 'currency' },
          { key: 'outstanding_balance', label: 'Outstanding Balance', format: 'currency' },
        ],
        rows,
        totalRows: rows.length,
      };
    },
  });

  // 8. Sales Pipeline and Forecast
  registerReport({
    id: 'sales_pipeline_forecast',
    title: 'Sales Pipeline & Weighted Forecast',
    description: 'Current sales deals by stage with default win probabilities and weighted pipeline forecasts',
    category: 'sales',
    permission: 'crm.view',
    getData: async (filters) => {
      let query = db('leads');

      if (filters.fromDate) {
        query = query.where('created_at', '>=', `${filters.fromDate} 00:00:00`);
      }
      if (filters.toDate) {
        query = query.where('created_at', '<=', `${filters.toDate} 23:59:59`);
      }

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
        generatedAt: getTodayKolkata(),
        filters,
        columns: [
          { key: 'stage_label', label: 'Pipeline Stage', format: 'text' },
          { key: 'leads_count', label: 'Leads Count', format: 'number' },
          { key: 'total_value', label: 'Total Value', format: 'currency' },
          { key: 'default_probability', label: 'Probability %', format: 'percentage' },
          { key: 'weighted_value', label: 'Weighted Value', format: 'currency' },
        ],
        rows,
        totalRows: rows.length,
      };
    },
  });
}
