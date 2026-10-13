import { z } from 'zod';

export const createTemplateSchema = z.object({
  name: z.string().trim().min(2, 'Template name must be at least 2 characters'),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters'),
  body_html: z.string().trim().min(10, 'Body content must be at least 10 characters'),
  is_default: z.boolean().optional().default(false),
});

export const updateTemplateSchema = z.object({
  name: z.string().trim().min(2, 'Template name must be at least 2 characters').optional(),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').optional(),
  body_html: z.string().trim().min(10, 'Body content must be at least 10 characters').optional(),
  is_default: z.boolean().optional(),
});

export const generateOfferLetterSchema = z.object({
  employee_id: z.number({ required_error: 'Employee ID is required' }).int().positive(),
  template_id: z.number().int().positive().optional(),
  joining_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Joining date must be in YYYY-MM-DD format').optional(),
  designation: z.string().trim().min(2, 'Designation must be at least 2 characters').optional(),
  department: z.string().trim().optional(),
  employment_type: z.enum(['full_time', 'intern', 'contract']).optional(),
  monthly_gross: z.number().positive('Monthly gross salary must be positive').optional(),
  annual_ctc: z.number().positive('Annual CTC must be positive').optional(),
  probation_months: z.number().int().min(0, 'Probation months must be 0 or more').optional().default(3),
  work_location: z.string().trim().min(2, 'Work location must be at least 2 characters').optional().default('Headquarters'),
  working_hours: z.string().trim().optional().default('9:30 AM - 6:30 PM (Mon-Fri)'),
  notice_period_days: z.number().int().min(0, 'Notice period must be 0 or more days').optional().default(30),
  offer_valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Offer valid until date must be in YYYY-MM-DD format').optional(),
  reporting_manager: z.string().trim().optional(),
  custom_body_html: z.string().optional(),
  save_as_draft: z.boolean().optional().default(false),
});

export const declineOfferSchema = z.object({
  reason: z.string().trim().min(3, 'Decline reason must be at least 3 characters'),
});

export const sendOfferSchema = z.object({
  recipient_email: z.string().email('Invalid email address').optional(),
  custom_message: z.string().optional(),
});
