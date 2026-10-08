import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').max(100, 'Role name must not exceed 100 characters'),
  description: z.string().max(255).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters').max(100).optional(),
  description: z.string().max(255).optional(),
});

export const updateRolePermissionsSchema = z.object({
  permissionIds: z.array(z.number().int().positive('Permission ID must be a positive integer')),
});

export const roleIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Role ID must be a valid number'),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdateRolePermissionsInput = z.infer<typeof updateRolePermissionsSchema>;
