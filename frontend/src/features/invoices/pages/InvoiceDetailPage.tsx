import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  Clock,
  Send,
  Eye,
  XCircle,
} from 'lucide-react';
import { invoicesApi } from '../api';
import { InvoiceStatus, INVOICE_STATUS_CONFIG } from '../types';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { Can } from '../../../shared/components/Can';
import { SkeletonCard, SkeletonTable } from '../../../shared/components/Loader';
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
      <div className="space-y-6">
        <SkeletonCard lines={5} />
        <SkeletonCard lines={4} />
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
    bg: 'bg-[#dbe2d5]',
    color: 'text-[#26301f]',
    border: 'border-[#c5d0be]',
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
            className="flex h-10 w-10 items-center justify-center rounded-xl clay-card text-[#6b7663] transition hover:text-[#14776b]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#26301f] font-mono">
                {invoice.invoice_number}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}
              >
                {statusConfig.label}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#6b7663]">
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
                className="inline-flex items-center space-x-1.5 rounded-xl border border-[#c5d0be] bg-[#e2e8dc] px-3.5 py-2 text-xs font-semibold text-[#26301f] shadow-xs transition hover:bg-[#dbe2d5] disabled:opacity-50"
              >
                <Send className="h-4 w-4 text-[#14776b]" />
                <span>Mark Sent</span>
              </button>
            </Can>
          )}

          {invoice.status === 'sent' && (
            <Can permission="invoices.edit">
              <button
                onClick={() => updateStatusMutation.mutate('viewed')}
                disabled={updateStatusMutation.isPending}
                className="inline-flex items-center space-x-1.5 rounded-xl border border-[#c5d0be] bg-[#e2e8dc] px-3.5 py-2 text-xs font-semibold text-[#26301f] shadow-xs transition hover:bg-[#dbe2d5] disabled:opacity-50"
              >
                <Eye className="h-4 w-4 text-[#14776b]" />
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
                className="inline-flex items-center space-x-1.5 rounded-xl border border-[#c4643f]/30 bg-[#c4643f]/10 px-3.5 py-2 text-xs font-semibold text-[#9e3a1b] shadow-xs transition hover:bg-[#c4643f]/20 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4 text-[#c4643f]" />
                <span>Cancel Invoice</span>
              </button>
            </Can>
          )}

          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="inline-flex items-center space-x-2 rounded-xl border border-[#c5d0be] bg-[#e2e8dc] px-3.5 py-2 text-xs font-semibold text-[#26301f] shadow-xs transition hover:bg-[#dbe2d5] disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-[#6b7663]" />
            <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
          </button>

          {!isPaid && !isCancelled && (
            <Can permission="payments.create">
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center space-x-2 rounded-xl bg-[#14776b] hover:bg-[#11655b] px-4 py-2 text-xs font-semibold text-white shadow-sm transition active:scale-[0.98]"
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
        <div className="clay-card rounded-2xl border border-[#c5d0be]/50 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6b7663]">
            Client & Project Details
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <span className="text-xs text-[#6b7663]">Bill To</span>
              <div className="mt-1 flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-[#6b7663]/70" />
                <Link
                  to={`/clients/${invoice.client_id}`}
                  className="font-semibold text-[#26301f] hover:text-[#14776b] transition-colors"
                >
                  {invoice.client_company || invoice.client_name || `Client #${invoice.client_id}`}
                </Link>
              </div>
              {invoice.client_gstin && (
                <p className="mt-1 text-xs text-[#6b7663]">GSTIN: {invoice.client_gstin}</p>
              )}
            </div>

            {invoice.project_id && (
              <div className="border-t border-[#c5d0be]/40 pt-3">
                <span className="text-xs text-[#6b7663]">Associated Project</span>
                <div className="mt-1 flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-[#6b7663]/70" />
                  <Link
                    to={`/projects/${invoice.project_id}`}
                    className="font-semibold text-[#26301f] hover:text-[#14776b] transition-colors"
                  >
                    {invoice.project_name || `Project #${invoice.project_id}`}
                  </Link>
                  {invoice.project_code && (
                    <span className="font-mono text-xs text-[#6b7663]">
                      ({invoice.project_code})
                    </span>
                  )}
                </div>
              </div>
            )}

            {invoice.milestone_title && (
              <div className="border-t border-[#c5d0be]/40 pt-3">
                <span className="text-xs text-[#6b7663]">Milestone</span>
                <p className="mt-1 text-sm font-semibold text-[#26301f]">
                  {invoice.milestone_title}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Dates & Timeline */}
        <div className="clay-card rounded-2xl border border-[#c5d0be]/50 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6b7663]">
            Timeline & Terms
          </h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#c5d0be]/40 pb-3">
              <span className="text-sm text-[#6b7663] flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#6b7663]/70" /> Issue Date:
              </span>
              <span className="text-sm font-semibold font-mono text-[#26301f]">
                {new Date(invoice.issue_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-[#c5d0be]/40 pb-3">
              <span className="text-sm text-[#6b7663] flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#6b7663]/70" /> Due Date:
              </span>
              <span
                className={`text-sm font-semibold font-mono ${
                  invoice.status === 'overdue' ? 'text-[#c4643f]' : 'text-[#26301f]'
                }`}
              >
                {new Date(invoice.due_date).toLocaleDateString()}
              </span>
            </div>
            {invoice.terms && (
              <div>
                <span className="text-xs text-[#6b7663]">Terms:</span>
                <p className="mt-1 text-xs text-[#26301f]/80 italic">{invoice.terms}</p>
              </div>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="clay-card rounded-2xl border border-[#c5d0be]/50 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6b7663]">
            Financial Balance
          </h2>
          <div className="mt-4 space-y-3">
            <div className="flex justify-between text-sm text-[#6b7663]">
              <span>Subtotal:</span>
              <span className="font-semibold font-mono text-[#26301f]">{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-[#6b7663]">
              <span>GST ({invoice.tax_percent}%):</span>
              <span className="font-semibold font-mono text-[#26301f]">{formatCurrency(invoice.tax_amount)}</span>
            </div>
            <div className="flex justify-between border-t border-[#c5d0be]/40 pt-3 text-base font-bold text-[#26301f]">
              <span>Total:</span>
              <span className="font-mono">{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-sm text-[#14776b]">
              <span className="font-medium">Amount Paid:</span>
              <span className="font-bold font-mono">{formatCurrency(invoice.amount_paid)}</span>
            </div>
            <div
              className={`flex justify-between rounded-xl p-3 text-sm font-bold font-mono clay-inset ${
                balanceDue > 0
                  ? 'text-[#c4643f] border border-[#c4643f]/30'
                  : 'text-[#14776b] border border-[#14776b]/30'
              }`}
            >
              <span>Balance Due:</span>
              <span>{formatCurrency(balanceDue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Line Items */}
      <div className="clay-card rounded-2xl border border-[#c5d0be]/50 overflow-hidden">
        <div className="border-b border-[#c5d0be]/40 bg-[#dbe2d5]/40 px-6 py-4">
          <h2 className="text-base font-bold font-baloo text-[#26301f]">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[640px]">
            <thead className="border-b border-[#c5d0be]/40 bg-[#dbe2d5]/30 text-xs font-semibold uppercase tracking-wider text-[#6b7663]">
              <tr>
                <th className="py-3 pl-6 pr-4">#</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="py-3 pl-4 pr-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c5d0be]/30">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-[#dbe2d5]/30 transition-colors">
                    <td className="py-3.5 pl-6 pr-4 font-mono text-xs text-[#6b7663]">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-[#26301f]">
                      {item.description}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-[#26301f]">{item.quantity}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-[#26301f]">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="py-3.5 pl-4 pr-6 text-right font-mono font-semibold text-[#26301f]">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#6b7663]">
                    No line items listed on this invoice.
                  </td>
                </tr>
              )}
            </tbody>
            {invoice.items && invoice.items.length > 0 && (
              <tfoot className="border-t border-[#c5d0be]/40 bg-[#dbe2d5]/40 font-medium text-[#26301f]">
                <tr>
                  <td colSpan={4} className="py-3 text-right">
                    Subtotal:
                  </td>
                  <td className="py-3 pr-6 text-right font-mono font-semibold">
                    {formatCurrency(invoice.subtotal)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="py-2 text-right text-[#6b7663]">
                    Tax / GST ({invoice.tax_percent}%):
                  </td>
                  <td className="py-2 pr-6 text-right font-mono text-[#6b7663]">
                    {formatCurrency(invoice.tax_amount)}
                  </td>
                </tr>
                <tr className="border-t border-[#c5d0be]/40 font-bold">
                  <td colSpan={4} className="py-3 text-right text-base">
                    Total Amount:
                  </td>
                  <td className="py-3 pr-6 text-right font-mono text-base text-[#14776b]">
                    {formatCurrency(invoice.total)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Payment History */}
      <div className="clay-card rounded-2xl border border-[#c5d0be]/50 overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#c5d0be]/40 bg-[#dbe2d5]/40 px-6 py-4">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-[#14776b]" />
            <h2 className="text-base font-bold font-baloo text-[#26301f]">Payment Transactions</h2>
          </div>
          {!isPaid && !isCancelled && (
            <Can permission="payments.create">
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center space-x-1.5 rounded-xl bg-[#14776b] hover:bg-[#11655b] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition"
              >
                <span>+ Add Payment</span>
              </button>
            </Can>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[640px]">
            <thead className="border-b border-[#c5d0be]/40 bg-[#dbe2d5]/30 text-xs font-semibold uppercase tracking-wider text-[#6b7663]">
              <tr>
                <th className="py-3 pl-6 pr-4">Payment #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Reference / UTR</th>
                <th className="px-4 py-3">Recorded By</th>
                <th className="py-3 pl-4 pr-6 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c5d0be]/30">
              {invoice.payments && invoice.payments.length > 0 ? (
                invoice.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#dbe2d5]/30 transition-colors">
                    <td className="py-3.5 pl-6 pr-4 font-mono text-xs font-semibold text-[#14776b]">
                      {p.payment_number}
                    </td>
                    <td className="px-4 py-3.5 text-[#26301f]">
                      {new Date(p.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3.5 capitalize text-[#26301f]">
                      {p.method.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-[#6b7663]">
                      {p.reference || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-[#26301f]">
                      {p.recorded_by_name || 'System'}
                    </td>
                    <td className="py-3.5 pl-4 pr-6 text-right font-mono font-bold text-[#14776b]">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#6b7663]">
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
