import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Receipt,
  DollarSign,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  FileText,
  CreditCard,
  Building2,
} from 'lucide-react';
import { financeApi } from '../api';
import { Loader } from '../../../shared/components/Loader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { EmptyState } from '../../../shared/components/EmptyState';

export const FinanceOverviewPage: React.FC = () => {
  const {
    data: overview,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['finance-overview'],
    queryFn: financeApi.getOverview,
  });

  const formatCurrency = (amt: number | undefined) => {
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
        <Loader size="lg" text="Loading financial overview..." />
      </div>
    );
  }

  if (isError || !overview) {
    return (
      <div className="p-8">
        <ErrorState
          title="Failed to load finance overview"
          message={
            (error as any)?.response?.data?.message ||
            'Unable to fetch organization financial metrics.'
          }
          onRetry={refetch}
        />
      </div>
    );
  }

  const isNetProfitPositive = overview.net_profit >= 0;
  const overallMargin =
    overview.total_revenue > 0
      ? ((overview.net_profit / overview.total_revenue) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Finance & Cash Flow Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Organization-wide income, expenses, pending receivables, and monthly financial performance.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/invoices"
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <FileText className="h-4 w-4 text-slate-500" />
            <span>Manage Invoices</span>
          </Link>
          <Link
            to="/expenses"
            className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <CreditCard className="h-4 w-4 text-slate-500" />
            <span>Manage Expenses</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {formatCurrency(overview.total_revenue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Realized client payments to date</p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Total Expenses</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
              {formatCurrency(overview.total_expenses)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Approved operational and project claims</p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Net Profit</span>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                isNetProfitPositive
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              {isNetProfitPositive ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <ArrowDownRight className="h-5 w-5" />
              )}
            </div>
          </div>
          <div className="mt-3">
            <p
              className={`text-2xl font-bold tracking-tight font-mono ${
                isNetProfitPositive ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatCurrency(overview.net_profit)}
            </p>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Margin: {overallMargin}% of total revenue
            </p>
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">Pending Receivables</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-sky-700 font-mono">
              {formatCurrency(overview.pending_invoices_amount)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Unpaid balance on issued invoices</p>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Section */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-900">
              Monthly Income vs Expenses Trend
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Cash-flow receipts vs approved claims aggregated per calendar month
          </p>
        </div>

        {overview.monthly_trend && overview.monthly_trend.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-100/75 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3.5 pl-6 pr-4">Month</th>
                  <th className="px-4 py-3.5 text-right">Income (Received)</th>
                  <th className="px-4 py-3.5 text-right">Expenses (Approved)</th>
                  <th className="px-4 py-3.5 text-right">Net Profit</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Profit Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {overview.monthly_trend.map((item) => {
                  const itemMargin =
                    item.income > 0
                      ? ((item.net_profit / item.income) * 100).toFixed(1)
                      : '0.0';
                  const isPositive = item.net_profit >= 0;

                  return (
                    <tr key={item.month} className="hover:bg-slate-50/50">
                      <td className="py-4 pl-6 pr-4 font-mono font-medium text-slate-900">
                        {item.month}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-medium text-emerald-700">
                        {formatCurrency(item.income)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-medium text-amber-700">
                        {formatCurrency(item.expenses)}
                      </td>
                      <td
                        className={`px-4 py-4 text-right font-mono font-bold ${
                          isPositive ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {formatCurrency(item.net_profit)}
                      </td>
                      <td className="py-4 pl-4 pr-6 text-right font-mono">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {itemMargin}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12">
            <EmptyState
              title="No Monthly History"
              description="No recorded payments or approved expenses found in the system yet."
            />
          </div>
        )}
      </div>
    </div>
  );
};
