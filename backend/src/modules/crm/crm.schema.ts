import { z } from 'zod';

export const LeadStageEnum = z.enum([
  'lead',
  'contact',
  'requirement',
  'meeting',
  'proposal',
  'negotiation',
  'won',
  'lost',
]);

export const LeadActivityTypeEnum = z.enum([
  'call',
  'email',
  'meeting',
  'note',
  'stage_change',
]);

export const createLeadSchema = z.object({
  company_name: z
    .string({ required_error: 'Company name is required' })
    .min(2, { message: 'Company name must be at least 2 characters' }),
  contact_name: z
    .string({ required_error: 'Contact name is required' })
    .min(2, { message: 'Contact name must be at least 2 characters' }),
  email: z
    .string()
    .email({ message: 'Invalid email address' })
    .optional()
    .nullable()
    .or(z.literal('')),
  phone: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  requirement: z.string().optional().nullable(),
  estimated_value: z
    .number({ invalid_type_error: 'Estimated value must be a number' })
    .min(0, { message: 'Estimated value cannot be negative' })
    .default(0),
  probability_percent: z
    .number({ invalid_type_error: 'Probability must be a number' })
    .int()
    .min(0, { message: 'Probability must be between 0 and 100' })
    .max(100, { message: 'Probability must be between 0 and 100' })
    .default(10),
  expected_closing_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Expected closing date must be YYYY-MM-DD' })
    .optional()
    .nullable(),
  salesperson_id: z.number().int().positive().optional().nullable(),
  stage: LeadStageEnum.default('lead'),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  lost_reason: z.string().optional().nullable(),
});

export const updateStageSchema = z
  .object({
    stage: LeadStageEnum,
    lost_reason: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.stage === 'lost') {
        return Boolean(data.lost_reason && data.lost_reason.trim().length > 0);
      }
      return true;
    },
    {
      message: 'Lost reason is required when moving a lead to Lost stage',
      path: ['lost_reason'],
    }
  );

export const convertLeadSchema = z.object({
  project_name: z.string().optional(),
  project_description: z.string().optional(),
  project_manager_id: z.number().int().positive().optional(),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Start date must be YYYY-MM-DD' })
    .optional(),
  end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'End date must be YYYY-MM-DD' })
    .optional(),
});

export const createActivitySchema = z.object({
  type: LeadActivityTypeEnum,
  title: z
    .string({ required_error: 'Activity title is required' })
    .min(2, { message: 'Activity title must be at least 2 characters' }),
  description: z.string().optional().nullable(),
  activity_date: z.string().optional(),
});
