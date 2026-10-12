import db from '../../db/knex';
import { registerDashboardWidget } from './widget.registry';
import { TokenUserPayload } from '../utils/jwt.util';
import { getTodayKolkata } from '../utils/date.util';

// 1. Active Projects
registerDashboardWidget({
  key: 'active_projects',
  title: 'Active Projects',
  permission: 'projects.view',
  handler: async (user: TokenUserPayload) => {
    const activeStatuses = [
      'planning',
      'development',
      'testing',
      'uat',
      'deployment',
      'maintenance',
    ];

    let query = db('projects')
      .whereNull('deleted_at')
      .whereIn('status', activeStatuses);

    const isManager = user.roles.some((r) => r.toLowerCase() === 'manager');
    if (isManager && user.employeeId) {
      query = query.andWhere((qb) => {
        qb.where('project_manager_id', user.employeeId).orWhereExists(function () {
          this.select('*')
            .from('project_members')
            .whereRaw('project_members.project_id = projects.id')
            .where('project_members.employee_id', user.employeeId);
        });
      });
    }

    const countResult = await query.clone().count('id as count').first();
    const count = Number(countResult?.count || 0);

    const recentActive = await query
      .clone()
      .select('id', 'project_code', 'name', 'status', 'priority', 'budget')
      .orderBy('updated_at', 'desc')
      .limit(5);

    return {
      count,
      items: recentActive,
    };
  },
});

// 2. Clients Count
registerDashboardWidget({
  key: 'clients_count',
  title: 'Clients Count',
  permission: 'clients.view',
  handler: async () => {
    const totalResult = await db('clients')
      .whereNull('deleted_at')
      .count('id as total')
      .first();
    const activeResult = await db('clients')
      .whereNull('deleted_at')
      .where('status', 'active')
      .count('id as active')
      .first();

    return {
      total: Number(totalResult?.total || 0),
      active: Number(activeResult?.active || 0),
    };
  },
});

// 3. Revenue This Month
registerDashboardWidget({
  key: 'revenue_this_month',
  title: 'Revenue This Month',
  permission: 'invoices.view',
  handler: async () => {
    const today = getTodayKolkata();
    const [year, month] = today.split('-');
    const startOfMonth = `${year}-${month}-01`;
    const endOfMonth = `${year}-${month}-31`;

    const result = await db('payments')
      .where('payment_date', '>=', startOfMonth)
      .where('payment_date', '<=', endOfMonth)
      .sum('amount as total_revenue')
      .first();

    const revenue = Number(result?.total_revenue || 0);
    return {
      amount: revenue,
      month: `${year}-${month}`,
    };
  },
});

// 4. Expenses This Month
registerDashboardWidget({
  key: 'expenses_this_month',
  title: 'Expenses This Month',
  permission: 'expenses.view',
  handler: async () => {
    const today = getTodayKolkata();
    const [year, month] = today.split('-');
    const startOfMonth = `${year}-${month}-01`;
    const endOfMonth = `${year}-${month}-31`;

    const result = await db('expenses')
      .whereIn('status', ['approved', 'paid'])
      .where('date', '>=', startOfMonth)
      .where('date', '<=', endOfMonth)
      .sum('amount as total_expenses')
      .first();

    const expenses = Number(result?.total_expenses || 0);
    return {
      amount: expenses,
      month: `${year}-${month}`,
    };
  },
});

// 5. Pending Invoices Amount
registerDashboardWidget({
  key: 'pending_invoices_amount',
  title: 'Pending Invoices Amount',
  permission: 'invoices.view',
  handler: async () => {
    const rows = await db('invoices')
      .whereIn('status', ['sent', 'viewed', 'partially_paid', 'overdue'])
      .select('total', 'amount_paid');

    let totalPending = 0;
    rows.forEach((r: any) => {
      const bal = Math.max(0, Number(r.total || 0) - Number(r.amount_paid || 0));
      totalPending += bal;
    });

    return {
      amount: Number(totalPending.toFixed(2)),
      invoice_count: rows.length,
    };
  },
});

// 6. Invoice Aging Breakdown (0-30, 31-60, 61-90, 90+)
registerDashboardWidget({
  key: 'invoice_aging',
  title: 'Invoice Aging Breakdown',
  permission: 'invoices.view',
  handler: async () => {
    const today = getTodayKolkata();
    const todayDate = new Date(today);

    const rows = await db('invoices')
      .whereIn('status', ['sent', 'viewed', 'partially_paid', 'overdue'])
      .select('id', 'invoice_number', 'due_date', 'total', 'amount_paid');

    const buckets = {
      current: { label: 'Current / Not Due', amount: 0, count: 0 },
      days_0_30: { label: '0-30 Days Overdue', amount: 0, count: 0 },
      days_31_60: { label: '31-60 Days Overdue', amount: 0, count: 0 },
      days_61_90: { label: '61-90 Days Overdue', amount: 0, count: 0 },
      days_90_plus: { label: '90+ Days Overdue', amount: 0, count: 0 },
    };

    rows.forEach((inv: any) => {
      const balance = Math.max(0, Number(inv.total || 0) - Number(inv.amount_paid || 0));
      if (balance <= 0) return;

      const dueDate = new Date(inv.due_date);
      const diffMs = todayDate.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        buckets.current.amount += balance;
        buckets.current.count += 1;
      } else if (diffDays <= 30) {
        buckets.days_0_30.amount += balance;
        buckets.days_0_30.count += 1;
      } else if (diffDays <= 60) {
        buckets.days_31_60.amount += balance;
        buckets.days_31_60.count += 1;
      } else if (diffDays <= 90) {
        buckets.days_61_90.amount += balance;
        buckets.days_61_90.count += 1;
      } else {
        buckets.days_90_plus.amount += balance;
        buckets.days_90_plus.count += 1;
      }
    });

    return buckets;
  },
});

// 7. Project Status Distribution
registerDashboardWidget({
  key: 'project_status_chart',
  title: 'Project Status Distribution',
  permission: 'projects.view',
  handler: async (user: TokenUserPayload) => {
    let query = db('projects').whereNull('deleted_at');

    const isManager = user.roles.some((r) => r.toLowerCase() === 'manager');
    if (isManager && user.employeeId) {
      query = query.andWhere((qb) => {
        qb.where('project_manager_id', user.employeeId).orWhereExists(function () {
          this.select('*')
            .from('project_members')
            .whereRaw('project_members.project_id = projects.id')
            .where('project_members.employee_id', user.employeeId);
        });
      });
    }

    const rows = await query
      .groupBy('status')
      .select('status')
      .count('id as count');

    return rows.map((r: any) => ({
      status: r.status,
      count: Number(r.count || 0),
    }));
  },
});

// 8. Overdue Tasks (Manager / Admin)
registerDashboardWidget({
  key: 'overdue_tasks',
  title: 'Overdue Tasks',
  permission: 'tasks.view',
  handler: async (user: TokenUserPayload) => {
    const today = getTodayKolkata();

    let query = db('tasks')
      .join('projects', 'tasks.project_id', 'projects.id')
      .leftJoin('employees', 'tasks.assignee_id', 'employees.id')
      .where('tasks.due_date', '<', today)
      .whereNot('tasks.status', 'completed')
      .whereNull('projects.deleted_at');

    const isManager = user.roles.some((r) => r.toLowerCase() === 'manager');
    if (isManager && user.employeeId) {
      query = query.where('projects.project_manager_id', user.employeeId);
    }

    const countResult = await query.clone().count('tasks.id as count').first();
    const count = Number(countResult?.count || 0);

    const items = await query
      .clone()
      .select(
        'tasks.id',
        'tasks.task_code',
        'tasks.title',
        'tasks.priority',
        'tasks.status',
        'tasks.due_date',
        'projects.name as project_name',
        db.raw("CONCAT(employees.first_name, ' ', employees.last_name) as assignee_name")
      )
      .orderBy('tasks.due_date', 'asc')
      .limit(6);

    return {
      count,
      items,
    };
  },
});

// 9. My Tasks (Employee)
registerDashboardWidget({
  key: 'my_tasks',
  title: 'My Assigned Tasks',
  handler: async (user: TokenUserPayload) => {
    if (!user.employeeId) {
      return { count: 0, items: [] };
    }

    const query = db('tasks')
      .join('projects', 'tasks.project_id', 'projects.id')
      .where('tasks.assignee_id', user.employeeId)
      .whereNot('tasks.status', 'completed')
      .whereNull('projects.deleted_at');

    const countResult = await query.clone().count('tasks.id as count').first();
    const count = Number(countResult?.count || 0);

    const items = await query
      .clone()
      .select(
        'tasks.id',
        'tasks.task_code',
        'tasks.title',
        'tasks.priority',
        'tasks.status',
        'tasks.due_date',
        'projects.name as project_name'
      )
      .orderBy('tasks.priority', 'desc')
      .orderBy('tasks.due_date', 'asc')
      .limit(6);

    return {
      count,
      items,
    };
  },
});
