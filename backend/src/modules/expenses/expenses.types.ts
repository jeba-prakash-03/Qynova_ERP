export type ExpenseStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid';

export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  expense_code: string;
  category_id?: number | null;
  category: string;
  project_id?: number | null;
  project_name?: string | null;
  project_code?: string | null;
  employee_id: number;
  employee_name?: string | null;
  employee_code?: string | null;
  amount: number;
  date: string;
  vendor?: string | null;
  description?: string | null;
  receipt_url?: string | null;
  status: ExpenseStatus;
  approved_by?: number | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseInput {
  category_id?: number;
  category?: string;
  project_id?: number | null;
  employee_id?: number;
  amount: number;
  date: string;
  vendor?: string;
  description?: string;
  receipt_url?: string;
  status?: ExpenseStatus;
}

export interface UpdateExpenseInput {
  category_id?: number;
  category?: string;
  project_id?: number | null;
  amount?: number;
  date?: string;
  vendor?: string;
  description?: string;
  receipt_url?: string;
}

export interface UpdateExpenseStatusInput {
  status: 'approved' | 'rejected' | 'paid';
  rejection_reason?: string;
}

export interface ExpenseQueryParams {
  project_id?: number;
  employee_id?: number;
  category?: string;
  status?: ExpenseStatus;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  limit?: number;
}
