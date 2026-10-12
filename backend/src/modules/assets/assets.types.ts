export type AssetStatus = 'available' | 'assigned' | 'maintenance' | 'retired';

export interface Asset {
  id: number;
  asset_tag: string;
  name: string;
  category: string;
  model?: string | null;
  serial_number?: string | null;
  purchase_date?: string | null;
  purchase_cost?: number | null;
  status: AssetStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;

  // Joined fields for display
  assigned_to_employee_id?: number | null;
  assigned_to_employee_name?: string | null;
  assigned_to_employee_code?: string | null;
  assigned_date?: string | null;
}

export interface AssetAssignment {
  id: number;
  asset_id: number;
  employee_id: number;
  assigned_date: string;
  returned_date?: string | null;
  condition_assigned?: string | null;
  condition_returned?: string | null;
  assigned_by?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;

  // Joined
  employee_name?: string;
  employee_code?: string;
  asset_tag?: string;
  asset_name?: string;
}

export interface AssetMaintenance {
  id: number;
  asset_id: number;
  start_date: string;
  end_date?: string | null;
  cost: number;
  issue_description: string;
  resolution_details?: string | null;
  vendor_name?: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CreateAssetDto {
  asset_tag?: string;
  name: string;
  category: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_cost?: number;
  notes?: string;
}

export interface UpdateAssetDto {
  name?: string;
  category?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_cost?: number;
  status?: AssetStatus;
  notes?: string;
}

export interface AssignAssetDto {
  employee_id: number;
  assigned_date?: string;
  condition_assigned?: string;
  notes?: string;
}

export interface ReturnAssetDto {
  returned_date?: string;
  condition_returned?: string;
  notes?: string;
}

export interface CreateMaintenanceDto {
  start_date: string;
  end_date?: string;
  cost?: number;
  issue_description: string;
  vendor_name?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface UpdateMaintenanceDto {
  end_date?: string;
  cost?: number;
  resolution_details?: string;
  vendor_name?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}
