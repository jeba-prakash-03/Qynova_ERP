import db from '../../db/knex';
import {
  ProjectProfitability,
  LaborBreakdownItem,
  ExpenseBreakdownItem,
  FinanceOverview,
  MonthlyFinanceItem,
} from './profitability.types';
import { payrollIntegrationService } from './payroll-integration.service';
import { NotFoundError } from '../../shared/errors/app-error';

export class ProfitabilityService {
  public async getProjectProfitability(projectId: number): Promise<ProjectProfitability> {
    const project = await db('projects')
      .where({ id: projectId })
      .whereNull('deleted_at')
      .first();

    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }

    const budget = Number(project.budget || 0);

    // 1. Revenue = Total payments received for invoices of this project
    const revenueRes = await db('payments as p')
      .join('invoices as inv', 'p.invoice_id', 'inv.id')
      .where('inv.project_id', projectId)
      .sum<{ total: number }>('p.amount as total')
      .first();

    const revenue = Number(revenueRes?.total || 0);

    // 2. Labor Cost = Sum of (approved timesheet hours * hourly rate)
    const timesheetRows = await db('timesheets as t')
      .join('employees as e', 't.employee_id', 'e.id')
      .where('t.project_id', projectId)
      .where('t.status', 'approved')
      .groupBy('t.employee_id', 'e.first_name', 'e.last_name', 'e.employee_code')
      .select(
        't.employee_id',
        'e.employee_code',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as employee_name"),
        db.raw('SUM(t.hours) as total_hours')
      );

    const laborBreakdown: LaborBreakdownItem[] = [];
    let totalLaborCost = 0;

    for (const row of timesheetRows) {
      const hours = Number(Number(row.total_hours || 0).toFixed(2));
      const hourlyRate = await payrollIntegrationService.getHourlyCost(Number(row.employee_id));
      const cost = Number((hours * hourlyRate).toFixed(2));
      totalLaborCost += cost;

      laborBreakdown.push({
        employee_id: Number(row.employee_id),
        employee_name: row.employee_name,
        employee_code: row.employee_code,
        approved_hours: hours,
        hourly_rate: hourlyRate,
        labor_cost: cost,
      });
    }

    totalLaborCost = Number(totalLaborCost.toFixed(2));

    // 3. Project Expenses = Approved or Paid expenses linked to this project
    const expensesRes = await db('expenses')
      .where({ project_id: projectId })
      .whereIn('status', ['approved', 'paid'])
      .sum<{ total: number }>('amount as total')
      .first();

    const projectExpenses = Number(expensesRes?.total || 0);

    const expenseCategoryRows = await db('expenses')
      .where({ project_id: projectId })
      .whereIn('status', ['approved', 'paid'])
      .groupBy('category')
      .select('category', db.raw('SUM(amount) as total_amount'));

    const expenseBreakdown: ExpenseBreakdownItem[] = expenseCategoryRows.map((r: any) => ({
      category: r.category,
      total_amount: Number(r.total_amount || 0),
    }));

    // 4. Totals, Margin, and Budget Used
    const totalCost = Number((totalLaborCost + projectExpenses).toFixed(2));
    const profit = Number((revenue - totalCost).toFixed(2));
    const profitMarginPercent =
      revenue > 0 ? Number(((profit / revenue) * 100).toFixed(2)) : 0;
    const budgetUsedPercent =
      budget > 0 ? Number(((totalCost / budget) * 100).toFixed(2)) : 0;

    return {
      project_id: projectId,
      project_name: project.name,
      project_code: project.project_code,
      budget,
      revenue,
      labor_cost: totalLaborCost,
      project_expenses: projectExpenses,
      total_cost: totalCost,
      profit,
      profit_margin_percent: profitMarginPercent,
      budget_used_percent: budgetUsedPercent,
      labor_breakdown: laborBreakdown,
      expense_breakdown: expenseBreakdown,
    };
  }

  public async getFinanceOverview(): Promise<FinanceOverview> {
    // 1. Total revenue (all payments received)
    const revRes = await db('payments').sum<{ total: number }>('amount as total').first();
    const totalRevenue = Number(revRes?.total || 0);

    // 2. Total expenses (approved or paid)
    const expRes = await db('expenses')
      .whereIn('status', ['approved', 'paid'])
      .sum<{ total: number }>('amount as total')
      .first();
    const totalExpenses = Number(expRes?.total || 0);

    // 3. Pending invoices total amount (balance due)
    const pendingInvRes = await db('invoices')
      .whereIn('status', ['sent', 'viewed', 'partially_paid', 'overdue'])
      .select(db.raw('SUM(total - amount_paid) as pending_total'))
      .first();
    const pendingInvoicesAmount = Number(pendingInvRes?.pending_total || 0);

    // 4. Monthly Trend (last 6 months)
    const monthlyIncome = await db('payments')
      .select(
        db.raw("DATE_FORMAT(payment_date, '%Y-%m') as month"),
        db.raw('SUM(amount) as total')
      )
      .groupBy('month')
      .orderBy('month', 'desc')
      .limit(6);

    const monthlyExpenses = await db('expenses')
      .whereIn('status', ['approved', 'paid'])
      .select(
        db.raw("DATE_FORMAT(date, '%Y-%m') as month"),
        db.raw('SUM(amount) as total')
      )
      .groupBy('month')
      .orderBy('month', 'desc')
      .limit(6);

    const allMonths = Array.from(
      new Set([
        ...monthlyIncome.map((i: any) => i.month),
        ...monthlyExpenses.map((e: any) => e.month),
      ])
    ).sort();

    const monthlyTrend: MonthlyFinanceItem[] = allMonths.map((m) => {
      const inc = Number(monthlyIncome.find((i: any) => i.month === m)?.total || 0);
      const exp = Number(monthlyExpenses.find((e: any) => e.month === m)?.total || 0);
      return {
        month: m,
        income: inc,
        expenses: exp,
        net_profit: Number((inc - exp).toFixed(2)),
      };
    });

    return {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: Number((totalRevenue - totalExpenses).toFixed(2)),
      pending_invoices_amount: pendingInvoicesAmount,
      monthly_trend: monthlyTrend,
    };
  }
}

export const profitabilityService = new ProfitabilityService();
