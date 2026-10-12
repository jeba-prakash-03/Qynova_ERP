import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { invoicesApi } from '../api';
import { Invoice, InvoiceStatus, INVOICE_STATUS_CONFIG } from '../types';
import { InvoiceFormModal } from '../components/InvoiceFormModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { Can } from '../../../shared/components/Can';
import {
  FileText,
  Plus,
  Search,
  Download,
  DollarSign,
  AlertCircle,
  Eye,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const InvoiceListPage: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);

  const {
    data: invoicesRes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['invoices', { status: statusFilter || undefined, search: search || undefined }],
    queryFn: () =>
      invoicesApi.getAll({
        status: (statusFilter as InvoiceStatus) || undefined,
        search: search || undefined,
        limit: 100,
      }),
  });

  const invoices = invoicesRes?.data || [];

  // Totals
  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0);
  const totalReceivables = invoices.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-indigo-600" />
            Client Invoicing & Billing
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create tax invoices from project deliverables, record customer payments, and download PDFs.
          </p>
        </div>

        <Can permission="invoices.create">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Invoice
          </button>
        </Can>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Billed
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Collected
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Pending Receivables
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            ₹{totalReceivables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice #, client, project..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Fully Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <span className="text-xs font-medium text-slate-500">
          Showing <strong>{invoices.length}</strong> invoices
        </span>
      </div>

      {/* Main Invoices Table */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center bg-white rounded-2xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : isError ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-rose-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-semibold text-sm">Failed to load invoices</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No invoices generated yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Create an invoice from deliverables or directly bill clients with customizable line items.
          </p>
          <Can permission="invoices.create">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" /> Create First Invoice
            </button>
          </Can>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Invoice #</th>
                  <th className="px-5 py-3.5">Client & Project</th>
                  <th className="px-5 py-3.5">Issue / Due Date</th>
                  <th className="px-5 py-3.5">Total Amount</th>
                  <th className="px-5 py-3.5">Paid / Balance</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-indigo-600">
                      {inv.invoice_number}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{inv.client_name || inv.client_company}</div>
                      {inv.project_name && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {inv.project_code} - {inv.project_name}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      <div>Issued: {inv.issue_date}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Due: {inv.due_date}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      ₹{Number(inv.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <div className="text-emerald-600 font-semibold">
                        ₹{Number(inv.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-rose-600 mt-0.5">
                        Due: ₹{Number(inv.balance_due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${
                          INVOICE_STATUS_CONFIG[inv.status]?.bg || 'bg-slate-100'
                        } ${INVOICE_STATUS_CONFIG[inv.status]?.color || 'text-slate-700'} ${
                          INVOICE_STATUS_CONFIG[inv.status]?.border || 'border-slate-200'
                        }`}
                      >
                        {INVOICE_STATUS_CONFIG[inv.status]?.label || inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => invoicesApi.downloadPdf(inv.id, inv.invoice_number)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {inv.balance_due > 0 && inv.status !== 'cancelled' && (
                          <Can permission="payments.create">
                            <button
                              onClick={() => setPaymentInvoice(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition"
                              title="Record payment"
                            >
                              <DollarSign className="w-3.5 h-3.5" /> Pay
                            </button>
                          </Can>
                        )}

                        <button
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          title="View invoice details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <InvoiceFormModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={Boolean(paymentInvoice)}
        onClose={() => setPaymentInvoice(null)}
        invoice={paymentInvoice}
      />
    </div>
  );
};
