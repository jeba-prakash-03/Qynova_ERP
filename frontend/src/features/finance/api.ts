import axiosClient from '../../shared/api/axiosClient';
import { FinanceOverview, ProjectProfitability } from './types';

export const financeApi = {
  getOverview: async (): Promise<FinanceOverview> => {
    const res = await axiosClient.get('/finance/overview');
    return res.data.data;
  },

  getProjectProfitability: async (
    projectId: number | string
  ): Promise<ProjectProfitability> => {
    const res = await axiosClient.get(`/projects/${projectId}/profitability`);
    return res.data.data;
  },
};
