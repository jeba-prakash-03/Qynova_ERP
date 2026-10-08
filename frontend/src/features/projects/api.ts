import axiosClient from '../../shared/api/axiosClient';
import { Project, ProjectWithDetails, ProjectMember, ProjectMilestone } from './types';

export const projectsApi = {
  getAll: async (params?: Record<string, any>): Promise<{ data: Project[]; meta: any }> => {
    const res = await axiosClient.get('/projects', { params });
    return { data: res.data.data, meta: res.data.meta };
  },

  getMyAssignments: async (): Promise<any[]> => {
    const res = await axiosClient.get('/projects/my-assignments');
    return res.data.data;
  },

  getById: async (id: number | string): Promise<ProjectWithDetails> => {
    const res = await axiosClient.get(`/projects/${id}`);
    return res.data.data;
  },

  create: async (payload: any): Promise<ProjectWithDetails> => {
    const res = await axiosClient.post('/projects', payload);
    return res.data.data;
  },

  update: async (id: number | string, payload: any): Promise<ProjectWithDetails> => {
    const res = await axiosClient.put(`/projects/${id}`, payload);
    return res.data.data;
  },

  updateStatus: async (id: number | string, status: string, reason?: string): Promise<ProjectWithDetails> => {
    const res = await axiosClient.patch(`/projects/${id}/status`, { status, reason });
    return res.data.data;
  },

  delete: async (id: number | string): Promise<void> => {
    await axiosClient.delete(`/projects/${id}`);
  },

  // Members
  addMember: async (projectId: number | string, payload: any): Promise<ProjectMember> => {
    const res = await axiosClient.post(`/projects/${projectId}/members`, payload);
    return res.data.data;
  },

  removeMember: async (projectId: number | string, employeeId: number | string): Promise<void> => {
    await axiosClient.delete(`/projects/${projectId}/members/${employeeId}`);
  },

  // Milestones
  addMilestone: async (projectId: number | string, payload: any): Promise<ProjectMilestone> => {
    const res = await axiosClient.post(`/projects/${projectId}/milestones`, payload);
    return res.data.data;
  },

  updateMilestone: async (
    projectId: number | string,
    milestoneId: number | string,
    payload: any
  ): Promise<ProjectMilestone> => {
    const res = await axiosClient.put(`/projects/${projectId}/milestones/${milestoneId}`, payload);
    return res.data.data;
  },

  deleteMilestone: async (projectId: number | string, milestoneId: number | string): Promise<void> => {
    await axiosClient.delete(`/projects/${projectId}/milestones/${milestoneId}`);
  },
};
