import { z } from 'zod';

export const expenseIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Expense ID must be a valid numeric ID'),
});

export const createExpenseSchema = z.object({
  category_id: z.number().int().positive().optional(),
  category: z.string().min(1, 'Category name is required').optional(),
  project_id: z.number().int().positive().nullable().optional(),
  employee_id: z.number().int().positive().optional(),
  amount: z.number({ required_error: 'Amount is required' }).positive('Amount must be greater than zero'),
  date: z.string({ required_error: 'Expense date is required' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  vendor: z.string().max(255).optional(),
  description: z.string().optional(),
  receipt_url: z.string().max(500).optional(),
  status: z.enum(['draft', 'pending_approval']).optional(),
}).refine((data) => data.category_id !== undefined || data.category !== undefined, {
  message: 'Either category_id or category name is required',
  path: ['category'],
});

export const updateExpenseSchema = z.object({
  category_id: z.number().int().positive().optional(),
  category: z.string().min(1).optional(),
  project_id: z.number().int().positive().nullable().optional(),
  amount: z.number().positive().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  vendor: z.string().max(255).optional(),
  description: z.string().optional(),
  receipt_url: z.string().max(500).optional(),
});

export const updateExpenseStatusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'paid'], {
    required_error: 'Target status is required',
  }),
  rejection_reason: z.string().optional(),
}).refine((data) => {
  if (data.status === 'rejected' && (!data.rejection_reason || !data.rejection_reason.trim())) {
    return false;
  }
  return true;
}, {
  message: 'Rejection reason is required when rejecting an expense',
  path: ['rejection_reason'],
});

export const expenseQuerySchema = z.object({
  project_id: z.string().regex(/^\d+$/).optional(),
  employee_id: z.string().regex(/^\d+$/).optional(),
  category: z.string().optional(),
  status: z.enum(['draft', 'pending_approval', 'approved', 'rejected', 'paid']).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});
