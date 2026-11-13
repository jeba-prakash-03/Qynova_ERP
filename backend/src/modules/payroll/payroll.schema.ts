import { z } from 'zod';

export const setSalaryStructureSchema = z.object({
  employee_id: z.coerce.number().int().positive('employee_id must be a positive integer'),
  base_salary: z.coerce.number().positive('base_salary must be a positive number').finite('base_salary must be finite'),
  is_annual: z.boolean().optional().default(false),
  effective_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'effective_from must be in YYYY-MM-DD format')
    .optional(),
});

export const getSalaryHistoryParamsSchema = z.object({
  employeeId: z.coerce.number().int().positive('employeeId must be a positive integer'),
});

export const setPayrollAdjustmentSchema = z.object({
  employee_id: z.coerce.number().int().positive('employee_id must be a positive integer'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be in YYYY-MM format'),
  incentives: z.coerce.number().min(0, 'incentives must be non-negative').optional(),
  bonus: z.coerce.number().min(0, 'bonus must be non-negative').optional(),
  allowances: z.coerce.number().min(0, 'allowances must be non-negative').optional(),
  overtime: z.coerce.number().min(0, 'overtime must be non-negative').optional(),
  pf: z.coerce.number().min(0, 'pf must be non-negative').nullable().optional(),
  other_deductions: z.coerce.number().min(0, 'other_deductions must be non-negative').optional(),
  note: z.string().max(500).nullable().optional(),
});

export const getPayrollAdjustmentsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be in YYYY-MM format'),
  employee_id: z.coerce.number().int().positive('employee_id must be a positive integer').optional(),
});

export const generatePayrollSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be in YYYY-MM format'),
});

export const payrollMonthParamSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be in YYYY-MM format'),
});

export const updatePayrollStatusSchema = z.object({
  status: z.enum(['draft', 'processed', 'locked', 'paid'], {
    errorMap: () => ({ message: 'status must be one of: draft, processed, locked, paid' }),
  }),
});

export const payslipIdParamSchema = z.object({
  id: z.coerce.number().int().positive('id must be a positive integer'),
});

export const fnfParamsSchema = z.object({
  employeeId: z.coerce.number().int().positive('employeeId must be a positive integer'),
});

export const calculateFnFSchema = z.object({
  exit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'exit_date must be in YYYY-MM-DD format').optional(),
  worked_days: z.coerce.number().min(0, 'worked_days must be non-negative').optional(),
  encash_leave_days: z.coerce.number().min(0, 'encash_leave_days must be non-negative').optional(),
  notice_period_required_days: z.coerce.number().min(0, 'notice_period_required_days must be non-negative').optional(),
  notice_period_served_days: z.coerce.number().min(0, 'notice_period_served_days must be non-negative').optional(),
  additional_earnings: z.coerce.number().min(0, 'additional_earnings must be non-negative').optional(),
  deductions: z.coerce.number().min(0, 'deductions must be non-negative').optional(),
  remarks: z.string().max(1000).optional(),
});
