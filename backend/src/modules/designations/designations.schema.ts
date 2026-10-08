import { z } from 'zod';

export const createDesignationSchema = z.object({
  name: z.string().min(2, 'Designation name must be at least 2 characters').max(150),
  code: z.string().min(2, 'Designation code must be at least 2 characters').max(50),
  description: z.string().optional(),
});

export const updateDesignationSchema = z.object({
  name: z.string().min(2, 'Designation name must be at least 2 characters').max(150).optional(),
  code: z.string().min(2, 'Designation code must be at least 2 characters').max(50).optional(),
  description: z.string().optional(),
});

export const designationIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Designation ID must be a valid number'),
});

export type CreateDesignationInput = z.infer<typeof createDesignationSchema>;
export type UpdateDesignationInput = z.infer<typeof updateDesignationSchema>;
