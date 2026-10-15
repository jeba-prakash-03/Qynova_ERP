import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '../api';
import { Expense, EXPENSE_STATUS_CONFIG } from '../types';
import { ExpenseFormModal } from '../components/ExpenseFormModal';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import { Can } from '../../../shared/components/Can';
import { Modal } from '../../../shared/components/Modal';
import { SkeletonCard, SkeletonTable } from '../../../shared/components/Loader';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '../../../shared/utils/format.util';

export const ExpensesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Reject modal state
  const [rejectExpenseId, setRejectExpenseId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: categories = [] } = useQuery({
    queryKey: ['expenses', 'categories'],
    queryFn: expensesApi.getCategories,
  });

  const {
    data: expensesRes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      'expenses',
      {
        status: activeTab === 'pending' ? 'pending_approval' : undefined,
        category: selectedCategory || undefined,
        search: search || undefined,
      },
    ],
    queryFn: () =>
      expensesApi.getAll({
        status: activeTab === 'pending' ? 'pending_approval' : undefined,
        category: selectedCategory || undefined,
        search: search || undefined,
        limit: 100,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      reason,
    }: {
      id: number;
      status: 'approved' | 'rejected' | 'paid';
      reason?: string;
    }) => expensesApi.updateStatus(id, status, reason),
    onSuccess: (updated) => {
      success(`Expense ${updated.expense_code} ${updated.status}`);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setRejectExpenseId(null);
      setRejectReason('');
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to update expense status');
    },
  });

  const expenses = expensesRes?.data || [];

  // Summary Metrics
  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const pendingAmount = expenses
    .filter((e) => e.status === 'pending_approval')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const approvedPaidAmount = expenses
    .filter((e) => e.status === 'approved' || e.status === 'paid')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#14776b]/15 text-[#14776b] rounded-xl clay-card">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-baloo text-[#26301f] tracking-tight">
              Company & Project Expenses
            </h1>
            <p className="text-sm text-[#6b7663]">
              Submit expense claims, approve team operational bills, and track project direct costs.
            </p>
          </div>
        </div>

        <Can permission="expenses.create">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#14776b] hover:bg-[#11655b] active:scale-[0.98] text-white rounded-xl text-xs font-semibold transition-all duration-180 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Claim Expense
          </button>
        </Can>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="clay-card-interactive bg-[#e2e8dc] p-5 rounded-2xl border border-[#c5d0be]/50">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7663]">
            Total Claimed
          </span>
          <div className="text-2xl font-bold font-mono text-[#26301f] mt-1.5">
            {formatCurrency(totalAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="clay-card-interactive bg-[#e2e8dc] p-5 rounded-2xl border border-[#c5d0be]/50">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7663]">
            Pending Approval
          </span>
          <div className="text-2xl font-bold font-mono text-[#916515] mt-1.5">
            {formatCurrency(pendingAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="clay-card-interactive bg-[#e2e8dc] p-5 rounded-2xl border border-[#c5d0be]/50">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7663]">
            Approved / Reimbursed
          </span>
          <div className="text-2xl font-bold font-mono text-[#14776b] mt-1.5">
            {formatCurrency(approvedPaidAmount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="clay-card p-4 rounded-2xl border border-[#c5d0be]/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Quick tab switcher */}
          <div className="flex items-center clay-inset p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-180 ${
                activeTab === 'all'
                  ? 'bg-[#e2e8dc] text-[#14776b] shadow-xs'
                  : 'text-[#6b7663] hover:text-[#26301f]'
              }`}
            >
              All Expenses
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-180 ${
                activeTab === 'pending'
                  ? 'bg-[#e2e8dc] text-[#14776b] shadow-xs'
                  : 'text-[#6b7663] hover:text-[#26301f]'
              }`}
            >
              Pending Approval
            </button>
          </div>

          {/* Category filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs px-3 py-2 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#6b7663] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, vendor..."
              className="w-full pl-9 pr-3 py-2 text-xs clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </div>
        </div>

        <div className="text-xs text-[#6b7663] font-medium">
          Showing <strong>{expenses.length}</strong> items
        </div>
      </div>

      {/* Main Expenses Table */}
      {isLoading ? (
        <SkeletonTable rows={6} cols={8} />
      ) : isError ? (
        <div className="clay-card p-8 text-center rounded-2xl border border-[#c4643f]/30 bg-[#c4643f]/10 text-[#9e3a1b]">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[#c4643f]" />
          <p className="font-bold font-baloo text-sm">Failed to load expense records</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="clay-card p-12 text-center rounded-2xl border border-[#c5d0be]/50">
          <Receipt className="w-10 h-10 text-[#6b7663]/60 mx-auto mb-3" />
          <h3 className="text-base font-bold font-baloo text-[#26301f]">No expenses found</h3>
          <p className="text-xs text-[#6b7663] max-w-sm mx-auto mt-1">
            Submit expense claims for travel, cloud services, software, or office needs.
          </p>
          <Can permission="expenses.create">
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#14776b] hover:bg-[#11655b] text-white rounded-xl text-xs font-semibold transition shadow-sm"
            >
              <Plus className="w-4 h-4" /> Claim Expense
            </button>
          </Can>
        </div>
      ) : (
        <div className="clay-card rounded-2xl border border-[#c5d0be]/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[768px]">
              <thead className="bg-[#dbe2d5]/40 border-b border-[#c5d0be]/40 text-[#6b7663] font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Project / Vendor</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5d0be]/30">
                {expenses.map((exp) => {
                  const isSelf = user?.employee?.id === exp.employee_id;
                  const canApprove = exp.status === 'pending_approval' && !isSelf;

                  return (
                    <tr key={exp.id} className="hover:bg-[#dbe2d5]/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-[#14776b]">
                        {exp.expense_code}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-[#26301f]">{exp.category}</span>
                      </td>
                      <td className="px-5 py-3.5 text-[#26301f] font-medium">
                        {exp.employee_name || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {exp.project_name ? (
                          <span className="block font-semibold text-[#26301f]">
                            {exp.project_code} - {exp.project_name}
                          </span>
                        ) : (
                          <span className="block text-[#6b7663] italic">General Company</span>
                        )}
                        {exp.vendor && (
                          <span className="block text-[11px] text-[#6b7663] mt-0.5">
                            Vendor: {exp.vendor}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-[#26301f]">
                        {formatCurrency(exp.amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-[#6b7663] font-medium">
                        {exp.date ? exp.date.split('T')[0] : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${
                            EXPENSE_STATUS_CONFIG[exp.status]?.bg || 'bg-[#dbe2d5]'
                          } ${EXPENSE_STATUS_CONFIG[exp.status]?.color || 'text-[#26301f]'} ${
                            EXPENSE_STATUS_CONFIG[exp.status]?.border || 'border-[#c5d0be]'
                          }`}
                        >
                          {EXPENSE_STATUS_CONFIG[exp.status]?.label || exp.status}
                        </span>
                        {exp.rejection_reason && (
                          <span className="block text-[10px] text-[#c4643f] mt-0.5 max-w-xs truncate" title={exp.rejection_reason}>
                            Reason: {exp.rejection_reason}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canApprove && (
                            <Can permission="expenses.approve">
                              <button
                                disabled={updateStatusMutation.isPending}
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: exp.id,
                                    status: 'approved',
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100/70 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition"
                                title="Approve expense"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                disabled={updateStatusMutation.isPending}
                                onClick={() => {
                                  setRejectExpenseId(exp.id);
                                  setRejectReason('');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#c4643f]/15 hover:bg-[#c4643f]/25 text-[#9e3a1b] border border-[#c4643f]/30 rounded-lg text-xs font-semibold transition"
                                title="Reject expense"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </Can>
                          )}

                          {isSelf && exp.status === 'pending_approval' && (
                            <span className="text-[11px] text-[#6b7663] italic">
                              Awaiting Manager Sign-Off
                            </span>
                          )}

                          {exp.status === 'approved' && (
                            <Can permission="expenses.approve">
                              <button
                                disabled={updateStatusMutation.isPending}
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    id: exp.id,
                                    status: 'paid',
                                  })
                                }
                                className="px-2.5 py-1 bg-[#14776b]/15 hover:bg-[#14776b]/25 text-[#14776b] border border-[#14776b]/30 rounded-lg text-xs font-semibold transition"
                              >
                                Mark Paid
                              </button>
                            </Can>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      <Modal
        isOpen={Boolean(rejectExpenseId)}
        onClose={() => setRejectExpenseId(null)}
        title="Reject Expense Claim"
        maxWidth="md"
        footer={
          <>
            <button
              type="button"
              onClick={() => setRejectExpenseId(null)}
              className="px-4 py-2 border border-[#c5d0be] rounded-xl text-xs font-semibold text-[#26301f] bg-[#e2e8dc] hover:bg-[#dbe2d5] transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!rejectReason.trim() || updateStatusMutation.isPending}
              onClick={() => {
                if (rejectExpenseId) {
                  updateStatusMutation.mutate({
                    id: rejectExpenseId,
                    status: 'rejected',
                    reason: rejectReason.trim(),
                  });
                }
              }}
              className="px-4 py-2 bg-[#c4643f] hover:bg-[#a84422] text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition shadow-xs active:scale-95"
            >
              {updateStatusMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-[#6b7663]">
            Please provide a business reason or instruction for why this expense is rejected.
          </p>
          <textarea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Receipt missing GST details, or not pre-approved..."
            className="w-full text-xs p-3 clay-inset bg-[#dbe2d5]/50 border border-[#c5d0be]/40 rounded-xl text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#c4643f]/30"
          />
        </div>
      </Modal>

      {/* Expense Claim Modal */}
      <ExpenseFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
