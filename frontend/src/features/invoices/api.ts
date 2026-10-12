import axiosClient from '../../shared/api/axiosClient';
import {
  Invoice,
  CreateInvoicePayload,
  RecordPaymentPayload,
  Payment,
  InvoiceStatus,
} from './types';

export const invoicesApi = {
  getAll: async (params?: Record<string, any>): Promise<{ data: Invoice[]; meta: any }> => {
    const res = await axiosClient.get('/invoices', { params });
    return { data: res.data.data, meta: res.data.meta };
  },

  getById: async (id: number | string): Promise<Invoice> => {
    const res = await axiosClient.get(`/invoices/${id}`);
    return res.data.data;
  },

  create: async (payload: CreateInvoicePayload): Promise<Invoice> => {
    const res = await axiosClient.post('/invoices', payload);
    return res.data.data;
  },

  createFromMilestone: async (milestoneId: number | string): Promise<Invoice> => {
    const res = await axiosClient.post(`/invoices/from-milestone/${milestoneId}`);
    return res.data.data;
  },

  updateStatus: async (id: number | string, status: InvoiceStatus): Promise<Invoice> => {
    const res = await axiosClient.patch(`/invoices/${id}/status`, { status });
    return res.data.data;
  },

  recordPayment: async (
    id: number | string,
    payload: RecordPaymentPayload
  ): Promise<{ payment: Payment; invoice: Invoice }> => {
    const res = await axiosClient.post(`/invoices/${id}/payments`, payload);
    return res.data.data;
  },

  getPayments: async (id: number | string): Promise<Payment[]> => {
    const res = await axiosClient.get(`/invoices/${id}/payments`);
    return res.data.data;
  },

  downloadPdf: async (id: number | string, invoiceNumber: string): Promise<void> => {
    const res = await axiosClient.get(`/invoices/${id}/pdf`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Invoice_${invoiceNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};
