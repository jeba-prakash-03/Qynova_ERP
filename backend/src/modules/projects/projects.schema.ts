import { z } from 'zod';

export const projectPriorityEnum = z.enum(['low', 'medium', 'high', 'critical']);

export const projectStatusEnum = z.enum([
  'lead',
  'proposal',
  'won',
  'contract',
  'planning',
  'development',
  'testing',
  'uat',
  'deployment',
  'maintenance',
  'completed',
  'on_hold',
  'cancelled',
]);

export const memberRoleEnum = z.enum(['manager', 'team_lead', 'developer', 'qa', 'designer']);

export const milestoneStatusEnum = z.enum(['pending', 'in_progress', 'completed']);

export const projectIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Project ID must be a numeric integer'),
});

export const memberParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Project ID must be a numeric integer'),
  employeeId: z.string().regex(/^\d+$/, 'Employee ID must be a numeric integer'),
});

export const milestoneParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Project ID must be a numeric integer'),
  milestoneId: z.string().regex(/^\d+$/, 'Milestone ID must be a numeric integer'),
});

export const createProjectSchema = z.object({
  client_id: z.number({ required_error: 'Client ID is required' }).int().positive(),
  name: z.string().min(2, 'Project name is required').max(255),
  description: z.string().optional().nullable(),
  project_manager_id: z.number().int().positive().optional().nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional().nullable(),
  budget: z.number().nonnegative('Budget must be positive or zero').default(0),
  technologies: z.array(z.string()).optional().default([]),
  priority: projectPriorityEnum.default('medium'),
  status: projectStatusEnum.default('planning'),
});

export const updateProjectSchema = z.object({
  client_id: z.number().int().positive().optional(),
  name: z.string().min(2, 'Project name is required').max(255).optional(),
  description: z.string().optional().nullable(),
  project_manager_id: z.number().int().positive().optional().nullable(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional().nullable(),
  budget: z.number().nonnegative().optional(),
  technologies: z.array(z.string()).optional(),
  priority: projectPriorityEnum.optional(),
});

export const updateProjectStatusSchema = z.object({
  status: projectStatusEnum,
  reason: z.string().optional(),
});

export const addProjectMemberSchema = z.object({
  employee_id: z.number({ required_error: 'Employee ID is required' }).int().positive(),
  role: memberRoleEnum.default('developer'),
  allocation_percent: z.number().int().min(1, 'Allocation must be at least 1%').max(100, 'Allocation cannot exceed 100%').default(100),
  joined_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Joined date must be in YYYY-MM-DD format').optional(),
});

export const createMilestoneSchema = z.object({
  title: z.string().min(2, 'Milestone title is required').max(255),
  description: z.string().optional().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format'),
  amount: z.number().nonnegative('Amount cannot be negative').default(0),
  status: milestoneStatusEnum.default('pending'),
});

export const updateMilestoneSchema = createMilestoneSchema.partial();

export const projectQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  search: z.string().optional(),
  status: projectStatusEnum.optional(),
  priority: projectPriorityEnum.optional(),
  client_id: z.string().optional(),
  project_manager_id: z.string().optional(),
  sort: z.enum(['name', 'project_code', 'start_date', 'budget', 'status', 'priority', 'created_at']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type UpdateProjectStatusInput = z.infer<typeof updateProjectStatusSchema>;
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
