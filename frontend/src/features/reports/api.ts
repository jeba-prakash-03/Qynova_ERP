import axiosClient from '../../shared/api/axiosClient';
import { ReportMetadata, ReportResult } from './types';

export const reportsApi = {
  getAvailableReports: async (): Promise<ReportMetadata[]> => {
    const res = await axiosClient.get('/reports');
    return res.data.data;
  },

  runReport: async (
    id: string,
    filters?: { fromDate?: string; toDate?: string; [key: string]: any }
  ): Promise<ReportResult> => {
    const res = await axiosClient.get(`/reports/${id}`, { params: filters });
    return res.data.data;
  },

  exportReport: async (
    id: string,
    format: 'csv' | 'json',
    filters?: { fromDate?: string; toDate?: string; [key: string]: any }
  ): Promise<Blob> => {
    const res = await axiosClient.get(`/reports/${id}/export`, {
      params: { ...filters, format },
      responseType: 'blob',
    });
    return res.data;
  },
};
