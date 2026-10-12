import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesApi } from '../api';
import { Expense, ExpenseStatus, EXPENSE_STATUS_CONFIG } from '../types';
import { ExpenseFormModal } from '../components/ExpenseFormModal';
import { useAuth } from '../../../shared/context/AuthContext';
import { useToast } from '../../../shared/context/ToastContext';
import { Can } from '../../../shared/components/Can';
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Building,
  User,
  Calendar,
  DollarSign,
} from 'lucide-react';

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
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-indigo-600" />
            Company & Project Expenses
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Submit expense claims, approve team operational bills, and track project direct costs.
          </p>
        </div>

        <Can permission="expenses.create">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Claim Expense
          </button>
        </Can>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Claimed
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Pending Approval
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            ₹{pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Approved / Reimbursed
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            ₹{approvedPaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Quick tab switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'all'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Expenses
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'pending'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
              className="text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
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
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, vendor..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{expenses.length}</strong> items
        </div>
      </div>

      {/* Main Expenses Table */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center bg-white rounded-2xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : isError ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-rose-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-semibold text-sm">Failed to load expense records</p>
        </div>
      ) : expenses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No expenses found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Submit expense claims for travel, cloud services, software, or office needs.
          </p>
          <Can permission="expenses.create">
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" /> Claim Expense
            </button>
          </Can>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
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
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => {
                  const isSelf = user?.employee?.id === exp.employee_id;
                  const canApprove = exp.status === 'pending_approval' && !isSelf;

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-indigo-600">
                        {exp.expense_code}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-800">{exp.category}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 font-medium">
                        {exp.employee_name || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        {exp.project_name ? (
                          <span className="block font-medium text-slate-700">
                            {exp.project_code} - {exp.project_name}
                          </span>
                        ) : (
                          <span className="block text-slate-400 italic">General Company</span>
                        )}
                        {exp.vendor && (
                          <span className="block text-[11px] text-slate-400 mt-0.5">
                            Vendor: {exp.vendor}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                        ₹{Number(exp.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-medium">
                        {exp.date ? exp.date.split('T')[0] : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${
                            EXPENSE_STATUS_CONFIG[exp.status]?.bg || 'bg-slate-100'
                          } ${EXPENSE_STATUS_CONFIG[exp.status]?.color || 'text-slate-700'} ${
                            EXPENSE_STATUS_CONFIG[exp.status]?.border || 'border-slate-200'
                          }`}
                        >
                          {EXPENSE_STATUS_CONFIG[exp.status]?.label || exp.status}
                        </span>
                        {exp.rejection_reason && (
                          <span className="block text-[10px] text-rose-600 mt-0.5 max-w-xs truncate" title={exp.rejection_reason}>
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
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition"
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
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
                                title="Reject expense"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            </Can>
                          )}

                          {isSelf && exp.status === 'pending_approval' && (
                            <span className="text-[11px] text-slate-400 italic">
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
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition"
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
      {rejectExpenseId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Expense Claim</h3>
            <p className="text-xs text-slate-500">
              Please provide a business reason or instruction for why this expense is rejected.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Receipt missing GST details, or not pre-approved..."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectExpenseId(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={!rejectReason.trim() || updateStatusMutation.isPending}
                onClick={() =>
                  updateStatusMutation.mutate({
                    id: rejectExpenseId,
                    status: 'rejected',
                    reason: rejectReason.trim(),
                  })
                }
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Claim Modal */}
      <ExpenseFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
