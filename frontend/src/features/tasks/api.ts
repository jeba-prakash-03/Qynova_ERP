import axiosClient from '../../shared/api/axiosClient';
import {
  Task,
  TaskWithDetails,
  TaskComment,
  ProjectModule,
  CreateTaskPayload,
  UpdateTaskPayload,
  TaskQueryParams,
  TaskStatus,
} from './types';

export const tasksApi = {
  getAll: async (params?: TaskQueryParams): Promise<{ data: Task[]; meta: any }> => {
    const res = await axiosClient.get('/tasks', { params });
    return { data: res.data.data, meta: res.data.meta };
  },

  getMyTasks: async (params?: TaskQueryParams): Promise<{ data: Task[]; meta: any }> => {
    const res = await axiosClient.get('/tasks/my', { params });
    return { data: res.data.data, meta: res.data.meta };
  },

  getById: async (id: number | string): Promise<TaskWithDetails> => {
    const res = await axiosClient.get(`/tasks/${id}`);
    return res.data.data;
  },

  create: async (payload: CreateTaskPayload): Promise<Task> => {
    const res = await axiosClient.post('/tasks', payload);
    return res.data.data;
  },

  update: async (id: number | string, payload: UpdateTaskPayload): Promise<Task> => {
    const res = await axiosClient.put(`/tasks/${id}`, payload);
    return res.data.data;
  },

  updateStatus: async (
    id: number | string,
    status: TaskStatus,
    comment?: string
  ): Promise<Task> => {
    const res = await axiosClient.patch(`/tasks/${id}/status`, { status, comment });
    return res.data.data;
  },

  delete: async (id: number | string): Promise<void> => {
    await axiosClient.delete(`/tasks/${id}`);
  },

  addComment: async (taskId: number | string, comment: string): Promise<TaskComment> => {
    const res = await axiosClient.post(`/tasks/${taskId}/comments`, { comment });
    return res.data.data;
  },

  getModules: async (projectId: number | string): Promise<ProjectModule[]> => {
    const res = await axiosClient.get(`/tasks/modules/${projectId}`);
    return res.data.data;
  },

  createModule: async (payload: {
    project_id: number;
    name: string;
    description?: string;
  }): Promise<ProjectModule> => {
    const res = await axiosClient.post('/tasks/modules', payload);
    return res.data.data;
  },
};
