import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  ArrowLeft,
  Download,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Send,
  Eye,
  XCircle,
} from 'lucide-react';
import { invoicesApi } from '../api';
import { InvoiceStatus, INVOICE_STATUS_CONFIG } from '../types';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { Can } from '../../../shared/components/Can';
import { Loader } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { useToast } from '../../../shared/context/ToastContext';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const {
    data: invoice,
    isLoading,
    isError,
    error: fetchError,
    refetch,
  } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getById(id!),
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: InvoiceStatus) =>
      invoicesApi.updateStatus(id!, newStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      success('Invoice status updated successfully');
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update invoice status');
    },
  });

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      setIsDownloading(true);
      await invoicesApi.downloadPdf(invoice.id, invoice.invoice_number);
      success('Invoice PDF downloaded successfully');
    } catch (err: any) {
      error(err.response?.data?.message || 'Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatCurrency = (amt: number | string | undefined) => {
    const num = Number(amt) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader size="lg" text="Loading invoice details..." />
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="p-8">
        <ErrorState
          title="Invoice not found"
          message={
            (fetchError as any)?.response?.data?.message ||
            'Unable to load invoice details. It may have been deleted.'
          }
          onRetry={refetch}
        />
      </div>
    );
  }

  const statusConfig = INVOICE_STATUS_CONFIG[invoice.status] || {
    label: invoice.status,
    bg: 'bg-slate-100',
    color: 'text-slate-700',
    border: 'border-slate-200',
  };

  const balanceDue = Number(invoice.balance_due) || 0;
  const isPaid = invoice.status === 'paid' || balanceDue <= 0;
  const isCancelled = invoice.status === 'cancelled';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header / Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/invoices"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                {invoice.invoice_number}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
              >
                {statusConfig.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Created on {new Date(invoice.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Actions */}
          {invoice.status === 'draft' && (
            <Can permission="invoices.edit">
              <button
                onClick={() => updateStatusMutation.mutate('sent')}
                disabled={updateStatusMutation.isPending}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Send className="h-4 w-4 text-sky-600" />
                <span>Mark Sent</span>
              </button>
            </Can>
          )}

          {invoice.status === 'sent' && (
            <Can permission="invoices.edit">
              <button
                onClick={() => updateStatusMutation.mutate('viewed')}
                disabled={updateStatusMutation.isPending}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Eye className="h-4 w-4 text-indigo-600" />
                <span>Mark Viewed</span>
              </button>
            </Can>
          )}

          {!isPaid && !isCancelled && (
            <Can permission="invoices.edit">
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel this invoice?')) {
                    updateStatusMutation.mutate('cancelled');
                  }
                }}
                disabled={updateStatusMutation.isPending}
                className="inline-flex items-center space-x-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4 text-rose-500" />
                <span>Cancel Invoice</span>
              </button>
            </Can>
          )}

          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="inline-flex items-center space-x-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
          </button>

          {!isPaid && !isCancelled && (
            <Can permission="payments.create">
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center space-x-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
              >
                <CreditCard className="h-4 w-4" />
                <span>Record Payment</span>
              </button>
            </Can>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bill To & Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Client & Project Details
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <span className="text-xs text-slate-400">Bill To</span>
              <div className="mt-1 flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-slate-400" />
                <Link
                  to={`/clients/${invoice.client_id}`}
                  className="font-medium text-slate-900 hover:text-indigo-600"
                >
                  {invoice.client_company || invoice.client_name || `Client #${invoice.client_id}`}
                </Link>
              </div>
              {invoice.client_gstin && (
                <p className="mt-1 text-xs text-slate-500">GSTIN: {invoice.client_gstin}</p>
              )}
            </div>

            {invoice.project_id && (
              <div className="border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-400">Associated Project</span>
                <div className="mt-1 flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <Link
                    to={`/projects/${invoice.project_id}`}
                    className="font-medium text-slate-900 hover:text-indigo-600"
                  >
                    {invoice.project_name || `Project #${invoice.project_id}`}
                  </Link>
                  {invoice.project_code && (
                    <span className="font-mono text-xs text-slate-500">
                      ({invoice.project_code})
                    </span>
                  )}
                </div>
              </div>
            )}

            {invoice.milestone_title && (
              <div className="border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-400">Milestone</span>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {invoice.milestone_title}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dates & Timeline */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Timeline & Terms
          </h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm text-slate-500 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" /> Issue Date:
              </span>
              <span className="text-sm font-medium text-slate-900">
                {new Date(invoice.issue_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm text-slate-500 flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-400" /> Due Date:
              </span>
              <span
                className={`text-sm font-medium ${
                  invoice.status === 'overdue' ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {new Date(invoice.due_date).toLocaleDateString()}
              </span>
            </div>
            {invoice.terms && (
              <div>
                <span className="text-xs text-slate-400">Terms:</span>
                <p className="mt-1 text-xs text-slate-600 italic">{invoice.terms}</p>
              </div>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Financial Balance
          </h2>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-900">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>GST ({invoice.tax_percent}%):</span>
              <span className="font-medium text-slate-900">{formatCurrency(invoice.tax_amount)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
              <span>Total:</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-sm text-emerald-700">
              <span>Amount Paid:</span>
              <span className="font-semibold">{formatCurrency(invoice.amount_paid)}</span>
            </div>
            <div
              className={`flex justify-between rounded-lg p-2.5 text-sm font-bold ${
                balanceDue > 0
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              <span>Balance Due:</span>
              <span>{formatCurrency(balanceDue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Line Items */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-100/75 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="py-3 pl-6 pr-4">#</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="py-3 pl-4 pr-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50">
                    <td className="py-3.5 pl-6 pr-4 font-mono text-xs text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-900">
                      {item.description}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono">{item.quantity}</td>
                    <td className="px-4 py-3.5 text-right font-mono">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-3.5 pl-4 pr-6 text-right font-mono font-medium text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No line items listed on this invoice.
                  </td>
                </tr>
              )}
            </tbody>
            {invoice.items && invoice.items.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-medium text-slate-900">
                <tr>
                  <td colSpan={4} className="py-3 text-right">
                    Subtotal:
                  </td>
                  <td className="py-3 pr-6 text-right font-mono">
                    {formatCurrency(invoice.subtotal)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="py-2 text-right text-slate-600">
                    Tax / GST ({invoice.tax_percent}%):
                  </td>
                  <td className="py-2 pr-6 text-right font-mono text-slate-600">
                    {formatCurrency(invoice.tax_amount)}
                  </td>
                </tr>
                <tr className="border-t border-slate-200 font-bold">
                  <td colSpan={4} className="py-3 text-right text-base">
                    Total Amount:
                  </td>
                  <td className="py-3 pr-6 text-right font-mono text-base text-indigo-700">
                    {formatCurrency(invoice.total)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Payment History */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-slate-600" />
            <h2 className="text-base font-semibold text-slate-900">Payment Transactions</h2>
          </div>
          {!isPaid && !isCancelled && (
            <Can permission="payments.create">
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center space-x-1.5 rounded-md bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                <span>+ Add Payment</span>
              </button>
            </Can>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-100/75 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="py-3 pl-6 pr-4">Payment #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Reference / UTR</th>
                <th className="px-4 py-3">Recorded By</th>
                <th className="py-3 pl-4 pr-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.payments && invoice.payments.length > 0 ? (
                invoice.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 pl-6 pr-4 font-mono text-xs font-medium text-slate-900">
                      {p.payment_number}
                    </td>
                    <td className="px-4 py-3.5">
                      {new Date(p.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 capitalize">
                      {p.method.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                      {p.reference || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {p.recorded_by_name || 'System'}
                    </td>
                    <td className="py-3.5 pl-4 pr-6 text-right font-mono font-semibold text-emerald-700">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No payments have been recorded for this invoice yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {isPaymentModalOpen && (
        <RecordPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          invoice={invoice}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['invoice', id] });
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            refetch();
          }}
        />
      )}
    </div>
  );
};
