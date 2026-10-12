export interface LaborBreakdownItem {
  employee_id: number;
  employee_name: string;
  employee_code?: string;
  approved_hours: number;
  hourly_rate: number;
  labor_cost: number;
}

export interface ExpenseBreakdownItem {
  category: string;
  total_amount: number;
}

export interface ProjectProfitability {
  project_id: number;
  project_name: string;
  project_code: string;
  budget: number;
  revenue: number; // Total payments received on project invoices
  labor_cost: number; // Sum of approved timesheet hours * hourly rate
  project_expenses: number; // Sum of approved/paid expenses
  total_cost: number; // labor_cost + project_expenses
  profit: number; // revenue - total_cost
  profit_margin_percent: number; // (profit / revenue) * 100
  budget_used_percent: number; // (total_cost / budget) * 100
  labor_breakdown: LaborBreakdownItem[];
  expense_breakdown: ExpenseBreakdownItem[];
}

export interface MonthlyFinanceItem {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
  net_profit: number;
}

export interface FinanceOverview {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  pending_invoices_amount: number;
  monthly_trend: MonthlyFinanceItem[];
}
