import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const createLeaveRequestSchema = z
  .object({
    leave_type_id: z.coerce.number().int().positive('Valid leave type ID is required'),
    from_date: z.string().regex(dateRegex, 'from_date must be in YYYY-MM-DD format'),
    to_date: z.string().regex(dateRegex, 'to_date must be in YYYY-MM-DD format'),
    is_half_day: z.boolean().optional().default(false),
    half_day_session: z.enum(['first', 'second']).optional().nullable(),
    reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(1000),
  })
  .refine(
    (data) => {
      return data.from_date <= data.to_date;
    },
    {
      message: 'to_date cannot be earlier than from_date',
      path: ['to_date'],
    }
  )
  .refine(
    (data) => {
      if (data.is_half_day) {
        return data.from_date === data.to_date;
      }
      return true;
    },
    {
      message: 'Half day leave must be for a single date (from_date must equal to_date)',
      path: ['is_half_day'],
    }
  );

export const approveLeaveRequestSchema = z.object({
  decision_note: z.string().max(500).optional().nullable(),
});

export const rejectLeaveRequestSchema = z.object({
  decision_note: z
    .string()
    .trim()
    .min(1, 'Decision note is mandatory when rejecting a leave request')
    .max(500),
});

export const allocateBalanceSchema = z
  .object({
    employee_id: z.coerce.number().int().positive().optional(),
    leave_type_id: z.coerce.number().int().positive('Valid leave type ID is required'),
    year: z.coerce.number().int().min(2020).max(2050),
    allocated: z.coerce.number().min(0, 'Allocated quota cannot be negative'),
    allocate_all: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      if (!data.allocate_all && !data.employee_id) {
        return false;
      }
      return true;
    },
    {
      message: 'employee_id is required unless allocate_all is true',
      path: ['employee_id'],
    }
  );

export const calculateDaysSchema = z
  .object({
    from_date: z.string().regex(dateRegex, 'from_date must be in YYYY-MM-DD format'),
    to_date: z.string().regex(dateRegex, 'to_date must be in YYYY-MM-DD format'),
    is_half_day: z.boolean().optional().default(false),
  })
  .refine((data) => data.from_date <= data.to_date, {
    message: 'to_date cannot be earlier than from_date',
    path: ['to_date'],
  });
