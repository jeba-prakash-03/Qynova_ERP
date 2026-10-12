import { z } from 'zod';

export const taskIdParamSchema = z.object({
  id: z.coerce.number({ invalid_type_error: 'Task ID must be a valid number' }).positive(),
});

export const commentIdParamSchema = z.object({
  id: z.coerce.number().positive(),
  commentId: z.coerce.number().positive(),
});

export const moduleIdParamSchema = z.object({
  id: z.coerce.number().positive(),
});

export const createTaskSchema = z.object({
  project_id: z.coerce
    .number({ required_error: 'Project ID is required' })
    .positive('Project ID must be positive'),
  module_id: z.coerce.number().positive().nullable().optional(),
  parent_task_id: z.coerce.number().positive().nullable().optional(),
  title: z
    .string({ required_error: 'Task title is required' })
    .min(1, 'Task title cannot be empty')
    .max(255, 'Task title cannot exceed 255 characters'),
  description: z.string().nullable().optional(),
  assignee_id: z.coerce.number().positive().nullable().optional(),
  reviewer_id: z.coerce.number().positive().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  status: z
    .enum([
      'backlog',
      'todo',
      'in_progress',
      'code_review',
      'changes_required',
      'testing',
      'qa_passed',
      'completed',
    ])
    .default('backlog'),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format')
    .nullable()
    .optional(),
  estimated_hours: z.coerce.number().min(0, 'Estimated hours must be non-negative').default(0),
});

export const updateTaskSchema = createTaskSchema.partial().omit({ project_id: true });

export const updateTaskStatusSchema = z.object({
  status: z.enum(
    [
      'backlog',
      'todo',
      'in_progress',
      'code_review',
      'changes_required',
      'testing',
      'qa_passed',
      'completed',
    ],
    { required_error: 'Target status is required' }
  ),
  comment: z.string().optional(),
});

export const createCommentSchema = z.object({
  comment: z
    .string({ required_error: 'Comment cannot be empty' })
    .min(1, 'Comment cannot be empty')
    .max(5000, 'Comment cannot exceed 5000 characters'),
});

export const createModuleSchema = z.object({
  project_id: z.coerce.number().positive('Project ID is required'),
  name: z.string().min(1, 'Module name is required').max(255),
  description: z.string().nullable().optional(),
});

export const taskQuerySchema = z.object({
  project_id: z.coerce.number().positive().optional(),
  module_id: z.coerce.number().positive().optional(),
  assignee_id: z.coerce.number().positive().optional(),
  reviewer_id: z.coerce.number().positive().optional(),
  status: z
    .enum([
      'backlog',
      'todo',
      'in_progress',
      'code_review',
      'changes_required',
      'testing',
      'qa_passed',
      'completed',
    ])
    .optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  parent_task_id: z.coerce.number().nullable().optional(),
  search: z.string().optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(50),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
