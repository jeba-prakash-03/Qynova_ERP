import { z } from 'zod';

export const updateCompanySettingsSchema = z.object({
  company_name: z
    .string({ required_error: 'Company name is required' })
    .min(1, 'Company name cannot be empty')
    .max(255, 'Company name is too long')
    .optional(),
  legal_name: z.string().max(255).nullable().optional(),
  tagline: z.string().max(255).nullable().optional(),
  address_line1: z.string().max(255).nullable().optional(),
  address_line2: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  pincode: z.string().max(20).nullable().optional(),
  country: z.string().max(100).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().email('Invalid email address').max(255).nullable().optional().or(z.literal('')),
  support_email: z.string().email('Invalid support email address').max(255).nullable().optional().or(z.literal('')),
  website: z.string().url('Invalid website URL').max(255).nullable().optional().or(z.literal('')),
  gstin: z.string().max(50).nullable().optional(),
  pan: z.string().max(50).nullable().optional(),
  cin: z.string().max(50).nullable().optional(),
  currency: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  date_format: z.string().max(20).optional(),
  financial_year_start_month: z.number().int().min(1).max(12).optional(),
  signatory_name: z.string().max(255).nullable().optional(),
  signatory_designation: z.string().max(255).nullable().optional(),
  payslip_footer_text: z.string().nullable().optional(),
  email_footer_text: z.string().nullable().optional(),
  free_leave_per_month: z.number().min(0, 'Free leave per month must be 0 or more').optional(),
  pf_percent: z.number().min(0).max(100, 'PF percentage must be between 0 and 100').optional(),
  overtime_multiplier: z.number().min(1, 'Overtime multiplier must be at least 1.0').optional(),
});

export const updateWorkSettingsSchema = z.object({
  shift_start: z
    .string({ required_error: 'Shift start time is required' })
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Shift start must be in HH:mm format'),
  shift_end: z
    .string({ required_error: 'Shift end time is required' })
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Shift end must be in HH:mm format'),
  weekly_off_days: z
    .array(z.number().int().min(0).max(6), {
      required_error: 'Weekly off days are required',
    })
    .min(1, 'At least one weekly off day is required'),
  late_grace_minutes: z
    .number({ required_error: 'Late grace minutes is required' })
    .int()
    .min(0, 'Grace minutes must be 0 or more'),
  min_hours_full_day: z
    .number({ required_error: 'Minimum full day hours is required' })
    .min(1, 'Full day hours must be at least 1')
    .max(24, 'Full day hours cannot exceed 24'),
  min_hours_half_day: z
    .number({ required_error: 'Minimum half day hours is required' })
    .min(0.5, 'Half day hours must be at least 0.5')
    .max(12, 'Half day hours cannot exceed 12'),
  geofencing_enabled: z.boolean().optional(),
  office_name: z.string().max(255).nullable().optional(),
  office_latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .nullable()
    .optional(),
  office_longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .nullable()
    .optional(),
  office_radius_meters: z
    .number()
    .int('Radius must be an integer')
    .min(10, 'Radius must be at least 10 metres')
    .max(50000, 'Radius cannot exceed 50,000 metres')
    .optional(),
  min_location_accuracy_meters: z
    .number()
    .int('Accuracy threshold must be an integer')
    .min(5, 'Minimum accuracy must be at least 5 metres')
    .max(1000, 'Minimum accuracy cannot exceed 1,000 metres')
    .optional(),
  office_locations: z
    .array(
      z.object({
        id: z.number().int().positive().optional(),
        name: z.string().min(1, 'Office name is required').max(255),
        latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
        longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
        radius_meters: z.number().int().min(10, 'Radius must be at least 10 metres').max(50000),
        is_active: z.boolean().optional(),
      })
    )
    .optional(),
});

export const updateLeavePolicySchema = z.object({
  free_leave_per_month: z
    .number({ required_error: 'Free leave per month is required' })
    .min(0, 'Free leave per month must be 0 or more')
    .max(10, 'Free leave per month cannot exceed 10'),
  leave_types: z
    .array(
      z.object({
        id: z.number().int().positive(),
        yearly_quota: z.number().min(0, 'Yearly quota cannot be negative'),
        is_carry_forward: z.boolean(),
        max_carry_forward: z.number().min(0, 'Max carry forward cannot be negative'),
      })
    )
    .optional(),
});

export const updatePayrollSettingsSchema = z.object({
  pf_percent: z
    .number({ required_error: 'PF percentage is required' })
    .min(0, 'PF percentage cannot be negative')
    .max(100, 'PF percentage cannot exceed 100'),
  overtime_multiplier: z
    .number({ required_error: 'Overtime multiplier is required' })
    .min(1.0, 'Overtime multiplier must be at least 1.0')
    .max(5.0, 'Overtime multiplier cannot exceed 5.0'),
});
