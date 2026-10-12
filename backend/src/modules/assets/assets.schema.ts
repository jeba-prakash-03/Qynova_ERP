import { z } from 'zod';

export const createAssetSchema = z.object({
  asset_tag: z.string().min(2, 'Asset tag must be at least 2 characters').optional(),
  name: z.string().min(2, 'Asset name is required'),
  category: z.string().min(2, 'Category is required'),
  model: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable(),
  purchase_cost: z.number().min(0, 'Purchase cost must be positive').optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateAssetSchema = z.object({
  name: z.string().min(2, 'Asset name is required').optional(),
  category: z.string().min(2, 'Category is required').optional(),
  model: z.string().optional().nullable(),
  serial_number: z.string().optional().nullable(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().nullable(),
  purchase_cost: z.number().min(0, 'Purchase cost must be positive').optional().nullable(),
  status: z.enum(['available', 'assigned', 'maintenance', 'retired']).optional(),
  notes: z.string().optional().nullable(),
});

export const assignAssetSchema = z.object({
  employee_id: z.number().int().positive('Valid employee ID is required'),
  assigned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Assigned date must be YYYY-MM-DD').optional(),
  condition_assigned: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const returnAssetSchema = z.object({
  returned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Returned date must be YYYY-MM-DD').optional(),
  condition_returned: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createMaintenanceSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD').optional().nullable(),
  cost: z.number().min(0).optional(),
  issue_description: z.string().min(3, 'Issue description is required'),
  vendor_name: z.string().optional().nullable(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
});

export const updateMaintenanceSchema = z.object({
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD').optional().nullable(),
  cost: z.number().min(0).optional(),
  resolution_details: z.string().optional().nullable(),
  vendor_name: z.string().optional().nullable(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
});
