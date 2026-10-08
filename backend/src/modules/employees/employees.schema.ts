import { z } from 'zod';

export const bankDetailsSchema = z.object({
  account_holder: z.string().min(1, 'Account holder name is required'),
  bank_name: z.string().min(1, 'Bank name is required'),
  account_number: z.string().min(1, 'Account number is required'),
  ifsc: z.string().min(1, 'IFSC code is required'),
});

export const emergencyContactSchema = z.object({
  contact_name: z.string().min(1, 'Contact name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  phone: z.string().min(1, 'Phone number is required'),
  alt_phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const createEmployeeSchema = z.object({
  // User & Identity
  email: z.string().email('Please enter a valid email address'),
  role_id: z.number().int().positive('Role is required'),

  // Personal Info
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  photo_url: z.string().url('Photo URL must be a valid URL').optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD').optional().nullable(),
  address: z.string().optional().nullable(),

  // Employment Info
  department_id: z.number().int().positive().optional().nullable(),
  designation_id: z.number().int().positive().optional().nullable(),
  reporting_manager_id: z.number().int().positive().optional().nullable(),
  joining_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Joining date must be YYYY-MM-DD'),
  employment_type: z.enum(['full_time', 'intern', 'contract']).default('full_time'),
  status: z.enum(['active', 'inactive']).default('active'),
  lifecycle_stage: z
    .enum([
      'candidate',
      'selected',
      'offer_generated',
      'offer_accepted',
      'onboarding',
      'active',
      'probation',
      'confirmed',
      'resigned',
      'notice_period',
      'relieved',
    ])
    .default('active'),
  skills: z.array(z.string()).optional().nullable(),
  experience_years: z.number().min(0).default(0),

  // Child details (optional on create)
  bank_details: bankDetailsSchema.optional().nullable(),
  emergency_contacts: z.array(emergencyContactSchema).optional().nullable(),

  // Dev 2 integration field placeholder
  initial_salary: z.number().optional().nullable(),
});

export const updateEmployeeSchema = z.object({
  first_name: z.string().min(1).max(100).optional(),
  last_name: z.string().min(1).max(100).optional(),
  photo_url: z.string().url().optional().nullable().or(z.literal('')),
  phone: z.string().max(50).optional().nullable(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  address: z.string().optional().nullable(),
  department_id: z.number().int().positive().optional().nullable(),
  designation_id: z.number().int().positive().optional().nullable(),
  reporting_manager_id: z.number().int().positive().optional().nullable(),
  joining_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  employment_type: z.enum(['full_time', 'intern', 'contract']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  lifecycle_stage: z
    .enum([
      'candidate',
      'selected',
      'offer_generated',
      'offer_accepted',
      'onboarding',
      'active',
      'probation',
      'confirmed',
      'resigned',
      'notice_period',
      'relieved',
    ])
    .optional(),
  skills: z.array(z.string()).optional().nullable(),
  experience_years: z.number().min(0).optional(),
  role_id: z.number().int().positive().optional(),
  bank_details: bankDetailsSchema.optional().nullable(),
  emergency_contacts: z.array(emergencyContactSchema).optional().nullable(),
});

export const updateLifecycleSchema = z.object({
  lifecycle_stage: z.enum([
    'candidate',
    'selected',
    'offer_generated',
    'offer_accepted',
    'onboarding',
    'active',
    'probation',
    'confirmed',
    'resigned',
    'notice_period',
    'relieved',
  ]),
  notes: z.string().optional(),
});

export const employeeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  department_id: z.coerce.number().int().positive().optional(),
  employment_type: z.enum(['full_time', 'intern', 'contract']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  lifecycle_stage: z
    .enum([
      'candidate',
      'selected',
      'offer_generated',
      'offer_accepted',
      'onboarding',
      'active',
      'probation',
      'confirmed',
      'resigned',
      'notice_period',
      'relieved',
    ])
    .optional(),
  sort: z.string().default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const employeeIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Employee ID must be a valid number'),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type UpdateLifecycleInput = z.infer<typeof updateLifecycleSchema>;
export type EmployeeQueryParams = z.infer<typeof employeeQuerySchema>;
