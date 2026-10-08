import axiosClient from '../../shared/api/axiosClient';
import { Client, ClientWithDetails } from './types';

export const clientsApi = {
  getAll: async (params?: Record<string, any>): Promise<{ data: Client[]; meta: any }> => {
    const res = await axiosClient.get('/clients', { params });
    return { data: res.data.data, meta: res.data.meta };
  },

  getById: async (id: number | string): Promise<ClientWithDetails> => {
    const res = await axiosClient.get(`/clients/${id}`);
    return res.data.data;
  },

  create: async (payload: any): Promise<ClientWithDetails> => {
    const res = await axiosClient.post('/clients', payload);
    return res.data.data;
  },

  update: async (id: number | string, payload: any): Promise<Client> => {
    const res = await axiosClient.put(`/clients/${id}`, payload);
    return res.data.data;
  },

  delete: async (id: number | string): Promise<void> => {
    await axiosClient.delete(`/clients/${id}`);
  },

  // Contacts
  addContact: async (clientId: number | string, payload: any) => {
    const res = await axiosClient.post(`/clients/${clientId}/contacts`, payload);
    return res.data.data;
  },

  updateContact: async (clientId: number | string, contactId: number | string, payload: any) => {
    const res = await axiosClient.put(`/clients/${clientId}/contacts/${contactId}`, payload);
    return res.data.data;
  },

  deleteContact: async (clientId: number | string, contactId: number | string) => {
    await axiosClient.delete(`/clients/${clientId}/contacts/${contactId}`);
  },

  // Addresses
  addAddress: async (clientId: number | string, payload: any) => {
    const res = await axiosClient.post(`/clients/${clientId}/addresses`, payload);
    return res.data.data;
  },

  updateAddress: async (clientId: number | string, addressId: number | string, payload: any) => {
    const res = await axiosClient.put(`/clients/${clientId}/addresses/${addressId}`, payload);
    return res.data.data;
  },

  deleteAddress: async (clientId: number | string, addressId: number | string) => {
    await axiosClient.delete(`/clients/${clientId}/addresses/${addressId}`);
  },

  // Communications
  addCommunication: async (clientId: number | string, payload: any) => {
    const res = await axiosClient.post(`/clients/${clientId}/communications`, payload);
    return res.data.data;
  },

  deleteCommunication: async (clientId: number | string, commId: number | string) => {
    await axiosClient.delete(`/clients/${clientId}/communications/${commId}`);
  },
};
