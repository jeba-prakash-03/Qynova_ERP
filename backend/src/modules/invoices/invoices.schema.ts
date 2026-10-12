import { z } from 'zod';

export const invoiceIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invoice ID must be a numeric ID'),
});

export const milestoneIdParamSchema = z.object({
  milestoneId: z.string().regex(/^\d+$/, 'Milestone ID must be a numeric ID'),
});

const invoiceItemSchema = z.object({
  description: z.string({ required_error: 'Item description is required' }).min(1, 'Description cannot be empty'),
  quantity: z.number({ required_error: 'Quantity is required' }).positive('Quantity must be greater than zero'),
  unit_price: z.number({ required_error: 'Unit price is required' }).nonnegative('Unit price cannot be negative'),
});

export const createInvoiceSchema = z.object({
  client_id: z.number({ required_error: 'Client ID is required' }).int().positive('Valid client ID is required'),
  project_id: z.number().int().positive().nullable().optional(),
  milestone_id: z.number().int().positive().nullable().optional(),
  issue_date: z.string({ required_error: 'Issue date is required' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  due_date: z.string({ required_error: 'Due date is required' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  tax_percent: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'Invoice must have at least one line item'),
});

export const updateInvoiceSchema = z.object({
  client_id: z.number().int().positive().optional(),
  project_id: z.number().int().positive().nullable().optional(),
  milestone_id: z.number().int().positive().nullable().optional(),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tax_percent: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1).optional(),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['draft', 'sent', 'viewed', 'cancelled'], {
    required_error: 'Status is required',
  }),
});

export const recordPaymentSchema = z.object({
  amount: z.number({ required_error: 'Payment amount is required' }).positive('Payment amount must be greater than zero'),
  payment_date: z.string({ required_error: 'Payment date is required' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  method: z.enum(['bank_transfer', 'upi', 'credit_card', 'cheque', 'cash', 'other']).optional(),
  reference: z.string().max(100).optional(),
  notes: z.string().optional(),
});

export const invoiceQuerySchema = z.object({
  client_id: z.string().regex(/^\d+$/).optional(),
  project_id: z.string().regex(/^\d+$/).optional(),
  status: z.enum(['draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'cancelled']).optional(),
  due_before: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_after: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});
