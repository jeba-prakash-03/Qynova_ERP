import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters').max(150),
  code: z.string().min(2, 'Department code must be at least 2 characters').max(50),
  parent_id: z.number().int().positive().nullable().optional(),
  description: z.string().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters').max(150).optional(),
  code: z.string().min(2, 'Department code must be at least 2 characters').max(50).optional(),
  parent_id: z.number().int().positive().nullable().optional(),
  description: z.string().optional(),
});

export const departmentIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Department ID must be a valid number'),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
