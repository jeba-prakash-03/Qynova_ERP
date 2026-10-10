import { z } from 'zod';

export const checkInSchema = z.object({
  work_type: z.enum(['office', 'wfh']).default('office').optional(),
  remarks: z.string().max(500).optional(),
});

export const checkOutSchema = z.object({
  remarks: z.string().max(500).optional(),
});

export const breakSchema = z.object({
  remarks: z.string().max(255).optional(),
});

export const manualAttendanceSchema = z.object({
  employee_id: z.number().int().positive('Valid employee ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  check_in: z.string().optional(), // ISO string or 'YYYY-MM-DD HH:mm:ss'
  check_out: z.string().optional(),
  status: z.enum(['present', 'absent', 'half_day', 'leave', 'holiday', 'weekend', 'wfh']).optional(),
  work_type: z.enum(['office', 'wfh']).default('office').optional(),
  reason: z.string().min(5, 'Mandatory audit reason must be at least 5 characters long'),
});

export const updateAttendanceSchema = z.object({
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  status: z.enum(['present', 'absent', 'half_day', 'leave', 'holiday', 'weekend', 'wfh']).optional(),
  work_type: z.enum(['office', 'wfh']).optional(),
  reason: z.string().min(5, 'Mandatory audit reason must be at least 5 characters long'),
});

export const attendanceSheetQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  department_id: z.string().optional(),
  search: z.string().optional(),
});

export const monthlySheetQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  department_id: z.string().optional(),
  search: z.string().optional(),
});
