import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { invoicesApi } from '../api';
import { Invoice, InvoiceStatus, INVOICE_STATUS_CONFIG } from '../types';
import { InvoiceFormModal } from '../components/InvoiceFormModal';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { Can } from '../../../shared/components/Can';
import { SkeletonCard, SkeletonTable } from '../../../shared/components/Loader';
import {
  FileText,
  Plus,
  Search,
  Download,
  DollarSign,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/format.util';

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
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#14776b]/15 text-[#14776b] rounded-xl clay-card">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-baloo text-[#26301f] tracking-tight">
              Client Invoicing & Billing
            </h1>
            <p className="text-sm text-[#6b7663]">
              Create tax invoices from project deliverables, record customer payments, and download PDFs.
            </p>
          </div>
        </div>

        <Can permission="invoices.create">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#14776b] hover:bg-[#11655b] active:scale-[0.98] text-white rounded-xl text-xs font-semibold transition-all duration-180 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Invoice
          </button>
        </Can>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="clay-card-interactive bg-[#e2e8dc] p-5 rounded-2xl border border-[#c5d0be]/50">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7663]">
            Total Billed
          </span>
          <div className="text-2xl font-bold font-mono text-[#26301f] mt-1.5">
            {formatCurrency(totalBilled, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="clay-card-interactive bg-[#e2e8dc] p-5 rounded-2xl border border-[#c5d0be]/50">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7663]">
            Total Collected
          </span>
          <div className="text-2xl font-bold font-mono text-[#14776b] mt-1.5">
            {formatCurrency(totalCollected, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="clay-card-interactive bg-[#e2e8dc] p-5 rounded-2xl border border-[#c5d0be]/50">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7663]">
            Pending Receivables
          </span>
          <div className="text-2xl font-bold font-mono text-[#c4643f] mt-1.5">
            {formatCurrency(totalReceivables, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="clay-card p-4 rounded-2xl border border-[#c5d0be]/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-[#6b7663] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice #, client, project..."
              className="w-full pl-9 pr-3 py-2 text-xs clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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

        <span className="text-xs font-medium text-[#6b7663]">
          Showing <strong>{invoices.length}</strong> invoices
        </span>
      </div>

      {/* Main Invoices Table */}
      {isLoading ? (
        <SkeletonTable rows={6} cols={7} />
      ) : isError ? (
        <div className="clay-card p-8 text-center rounded-2xl border border-[#c4643f]/30 bg-[#c4643f]/10 text-[#9e3a1b]">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[#c4643f]" />
          <p className="font-bold font-baloo text-sm">Failed to load invoices</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="clay-card p-12 text-center rounded-2xl border border-[#c5d0be]/50">
          <FileText className="w-10 h-10 text-[#6b7663]/60 mx-auto mb-3" />
          <h3 className="text-base font-bold font-baloo text-[#26301f]">No invoices generated yet</h3>
          <p className="text-xs text-[#6b7663] max-w-sm mx-auto mt-1">
            Create an invoice from deliverables or directly bill clients with customizable line items.
          </p>
          <Can permission="invoices.create">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#14776b] hover:bg-[#11655b] text-white rounded-xl text-xs font-semibold transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Create First Invoice
            </button>
          </Can>
        </div>
      ) : (
        <div className="clay-card rounded-2xl border border-[#c5d0be]/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[768px]">
              <thead className="bg-[#dbe2d5]/40 border-b border-[#c5d0be]/40 text-[#6b7663] font-semibold uppercase tracking-wider text-[11px]">
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
              <tbody className="divide-y divide-[#c5d0be]/30">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#dbe2d5]/30 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-[#14776b]">
                      {inv.invoice_number}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-[#26301f]">{inv.client_name || inv.client_company}</div>
                      {inv.project_name && (
                        <div className="text-[11px] text-[#6b7663] mt-0.5">
                          {inv.project_code} - {inv.project_name}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[#6b7663]">
                      <div>Issued: {inv.issue_date}</div>
                      <div className="text-[11px] text-[#6b7663]/70 mt-0.5">Due: {inv.due_date}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-[#26301f]">
                      {formatCurrency(inv.total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <div className="text-[#14776b] font-semibold">
                        {formatCurrency(inv.amount_paid, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-[11px] text-[#c4643f] mt-0.5 font-semibold">
                        Due: {formatCurrency(inv.balance_due, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${
                          INVOICE_STATUS_CONFIG[inv.status]?.bg || 'bg-[#dbe2d5]'
                        } ${INVOICE_STATUS_CONFIG[inv.status]?.color || 'text-[#26301f]'} ${
                          INVOICE_STATUS_CONFIG[inv.status]?.border || 'border-[#c5d0be]'
                        }`}
                      >
                        {INVOICE_STATUS_CONFIG[inv.status]?.label || inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => invoicesApi.downloadPdf(inv.id, inv.invoice_number)}
                          className="p-1.5 text-[#6b7663] hover:text-[#14776b] hover:bg-[#dbe2d5]/60 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {inv.balance_due > 0 && inv.status !== 'cancelled' && (
                          <Can permission="payments.create">
                            <button
                              onClick={() => setPaymentInvoice(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100/70 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition-all duration-180"
                              title="Record payment"
                            >
                              <DollarSign className="w-3.5 h-3.5" /> Pay
                            </button>
                          </Can>
                        )}

                        <button
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          className="p-1.5 text-[#6b7663] hover:text-[#26301f] hover:bg-[#dbe2d5]/60 rounded-lg transition-colors"
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
