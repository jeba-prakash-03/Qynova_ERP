import axiosClient from '../../shared/api/axiosClient';
import { LoginResponse, UserAuth } from './types';

export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    const res = await axiosClient.post('/auth/login', credentials);
    return res.data.data;
  },

  logout: async (refreshToken?: string): Promise<void> => {
    await axiosClient.post('/auth/logout', { refreshToken });
  },

  getMe: async (): Promise<UserAuth> => {
    const res = await axiosClient.get('/auth/me');
    return res.data.data;
  },

  changePassword: async (data: { oldPassword: string; newPassword: string }): Promise<void> => {
    await axiosClient.post('/auth/change-password', data);
  },

  forgotPassword: async (email: string): Promise<void> => {
    await axiosClient.post('/auth/forgot-password', { email });
  },
};
