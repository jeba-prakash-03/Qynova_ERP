import axiosClient from '../../shared/api/axiosClient';
import { Expense, ExpenseCategory, CreateExpensePayload } from './types';

export const expensesApi = {
  getCategories: async (): Promise<ExpenseCategory[]> => {
    const res = await axiosClient.get('/expenses/categories');
    return res.data.data;
  },

  getAll: async (params?: Record<string, any>): Promise<{ data: Expense[]; meta: any }> => {
    const res = await axiosClient.get('/expenses', { params });
    return { data: res.data.data, meta: res.data.meta };
  },

  getById: async (id: number | string): Promise<Expense> => {
    const res = await axiosClient.get(`/expenses/${id}`);
    return res.data.data;
  },

  create: async (payload: CreateExpensePayload): Promise<Expense> => {
    const res = await axiosClient.post('/expenses', payload);
    return res.data.data;
  },

  update: async (id: number | string, payload: Partial<CreateExpensePayload>): Promise<Expense> => {
    const res = await axiosClient.put(`/expenses/${id}`, payload);
    return res.data.data;
  },

  updateStatus: async (
    id: number | string,
    status: 'approved' | 'rejected' | 'paid',
    rejection_reason?: string
  ): Promise<Expense> => {
    const res = await axiosClient.patch(`/expenses/${id}/status`, { status, rejection_reason });
    return res.data.data;
  },

  delete: async (id: number | string): Promise<void> => {
    await axiosClient.delete(`/expenses/${id}`);
  },
};
