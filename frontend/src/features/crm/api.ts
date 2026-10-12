import axiosClient from '../../shared/api/axiosClient';
import {
  Lead,
  LeadStage,
  LeadActivity,
  PipelineOverview,
  CreateLeadPayload,
  UpdateLeadPayload,
  ConvertLeadPayload,
} from './types';

export const crmApi = {
  getPipeline: async (): Promise<PipelineOverview> => {
    const res = await axiosClient.get('/crm/pipeline');
    return res.data.data;
  },

  getLeads: async (params?: Record<string, any>): Promise<{ data: Lead[]; meta: any }> => {
    const res = await axiosClient.get('/crm/leads', { params });
    return { data: res.data.data, meta: res.data.meta };
  },

  getLeadById: async (id: number | string): Promise<Lead> => {
    const res = await axiosClient.get(`/crm/leads/${id}`);
    return res.data.data;
  },

  createLead: async (payload: CreateLeadPayload): Promise<Lead> => {
    const res = await axiosClient.post('/crm/leads', payload);
    return res.data.data;
  },

  updateLead: async (id: number | string, payload: UpdateLeadPayload): Promise<Lead> => {
    const res = await axiosClient.put(`/crm/leads/${id}`, payload);
    return res.data.data;
  },

  updateStage: async (
    id: number | string,
    stage: LeadStage,
    lostReason?: string
  ): Promise<Lead> => {
    const res = await axiosClient.patch(`/crm/leads/${id}/stage`, {
      stage,
      lost_reason: lostReason,
    });
    return res.data.data;
  },

  convertLead: async (
    id: number | string,
    payload: ConvertLeadPayload
  ): Promise<{ client: any; project: any; lead: Lead }> => {
    const res = await axiosClient.post(`/crm/leads/${id}/convert`, payload);
    return res.data.data;
  },

  deleteLead: async (id: number | string): Promise<void> => {
    await axiosClient.delete(`/crm/leads/${id}`);
  },

  addActivity: async (
    id: number | string,
    payload: { type: string; title: string; description?: string; activity_date?: string }
  ): Promise<LeadActivity[]> => {
    const res = await axiosClient.post(`/crm/leads/${id}/activities`, payload);
    return res.data.data;
  },

  getActivities: async (id: number | string): Promise<LeadActivity[]> => {
    const res = await axiosClient.get(`/crm/leads/${id}/activities`);
    return res.data.data;
  },
};
