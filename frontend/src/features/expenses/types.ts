export type ExpenseStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid';

export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string | null;
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
  created_at: string;
  updated_at: string;
}

export interface CreateExpensePayload {
  category?: string;
  category_id?: number;
  project_id?: number | null;
  amount: number;
  date: string;
  vendor?: string;
  description?: string;
  receipt_url?: string;
  status?: ExpenseStatus;
}

export const EXPENSE_STATUS_CONFIG: Record<
  ExpenseStatus,
  { label: string; bg: string; color: string; border: string }
> = {
  draft: { label: 'Draft', bg: 'bg-slate-100', color: 'text-slate-700', border: 'border-slate-200' },
  pending_approval: { label: 'Pending Approval', bg: 'bg-amber-50', color: 'text-amber-700', border: 'border-amber-200' },
  approved: { label: 'Approved', bg: 'bg-blue-50', color: 'text-blue-700', border: 'border-blue-200' },
  rejected: { label: 'Rejected', bg: 'bg-rose-50', color: 'text-rose-700', border: 'border-rose-200' },
  paid: { label: 'Paid / Reimbursed', bg: 'bg-emerald-50', color: 'text-emerald-700', border: 'border-emerald-200' },
};
