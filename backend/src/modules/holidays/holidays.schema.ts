import { z } from 'zod';

export const createHolidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  name: z.string().min(2, 'Holiday name is required').max(255),
  type: z.enum(['public', 'company', 'optional']).default('public'),
});

export const updateHolidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  name: z.string().min(2).max(255).optional(),
  type: z.enum(['public', 'company', 'optional']).optional(),
});

export const holidayQuerySchema = z.object({
  year: z.string().regex(/^\d{4}$/).optional(),
  month: z.string().regex(/^\d{1,2}$/).optional(),
  type: z.enum(['public', 'company', 'optional']).optional(),
});

export const updateWorkSettingsSchema = z.object({
  weekly_off_days: z.array(z.number().min(0).max(6)).min(1, 'At least one off day must be specified').optional(),
  shift_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Shift start must be in HH:mm format').optional(),
  shift_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Shift end must be in HH:mm format').optional(),
  late_grace_minutes: z.number().int().min(0).max(60).optional(),
  min_hours_full_day: z.number().min(1).max(24).optional(),
  min_hours_half_day: z.number().min(1).max(12).optional(),
});
