export interface MonthlyFinanceItem {
  month: string;
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

export interface LaborCostItem {
  employee_id: number;
  employee_name: string;
  hourly_rate: number;
  hours: number;
  cost: number;
}

export interface ProjectProfitability {
  project_id: number;
  project_name: string;
  project_code: string;
  budget: number;
  revenue: number;
  labor_cost: number;
  project_expenses: number;
  total_cost: number;
  net_profit: number;
  profit_margin_percent: number;
  budget_used_percent: number;
  labor_breakdown: LaborCostItem[];
}
