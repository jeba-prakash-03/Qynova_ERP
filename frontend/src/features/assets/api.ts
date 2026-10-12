import axiosClient from '../../shared/api/axiosClient';

export interface AssetRecord {
  id: number;
  asset_tag: string;
  name: string;
  category: string;
  model?: string | null;
  serial_number?: string | null;
  purchase_date?: string | null;
  purchase_cost?: number | null;
  status: 'available' | 'assigned' | 'maintenance' | 'retired';
  notes?: string | null;
  created_at: string;
  assigned_to_employee_id?: number | null;
  assigned_to_employee_name?: string | null;
  assigned_to_employee_code?: string | null;
  assigned_date?: string | null;
}

export const assetsApi = {
  getAssets: async (params?: { search?: string; category?: string; status?: string; page?: number; limit?: number }) => {
    const res = await axiosClient.get('/assets', { params });
    return res.data;
  },

  getAssetById: async (id: number) => {
    const res = await axiosClient.get(`/assets/${id}`);
    return res.data.data;
  },

  createAsset: async (data: any) => {
    const res = await axiosClient.post('/assets', data);
    return res.data.data;
  },

  updateAsset: async (id: number, data: any) => {
    const res = await axiosClient.put(`/assets/${id}`, data);
    return res.data.data;
  },

  deleteAsset: async (id: number) => {
    const res = await axiosClient.delete(`/assets/${id}`);
    return res.data.data;
  },

  assignAsset: async (id: number, data: { employee_id: number; assigned_date?: string; condition_assigned?: string; notes?: string }) => {
    const res = await axiosClient.post(`/assets/${id}/assign`, data);
    return res.data.data;
  },

  returnAsset: async (id: number, data?: { returned_date?: string; condition_returned?: string; notes?: string }) => {
    const res = await axiosClient.post(`/assets/${id}/return`, data || {});
    return res.data.data;
  },

  createMaintenance: async (id: number, data: { start_date: string; end_date?: string; cost?: number; issue_description: string; vendor_name?: string }) => {
    const res = await axiosClient.post(`/assets/${id}/maintenance`, data);
    return res.data.data;
  },

  updateMaintenance: async (maintenanceId: number, data: any) => {
    const res = await axiosClient.patch(`/assets/maintenance/${maintenanceId}`, data);
    return res.data.data;
  },

  getMyAssets: async () => {
    const res = await axiosClient.get('/assets/my');
    return res.data.data;
  },
};
