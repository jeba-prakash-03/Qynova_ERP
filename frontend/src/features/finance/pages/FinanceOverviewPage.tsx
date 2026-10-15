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
import { formatCurrency } from '../../../shared/utils/format.util';

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
    <div className="space-y-6 pb-12 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-baloo tracking-tight text-[#26301f]">
            Finance & Cash Flow Overview
          </h1>
          <p className="mt-1 text-sm text-[#6b7663]">
            Organization-wide income, expenses, pending receivables, and monthly financial performance.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/invoices"
            className="inline-flex items-center space-x-1.5 rounded-xl border border-[#c5d0be]/60 bg-[#e2e8dc] hover:bg-[#dbe2d5] px-3.5 py-2 text-sm font-semibold text-[#26301f] shadow-xs transition"
          >
            <FileText className="h-4 w-4 text-[#14776b]" />
            <span>Manage Invoices</span>
          </Link>
          <Link
            to="/expenses"
            className="inline-flex items-center space-x-1.5 rounded-xl border border-[#c5d0be]/60 bg-[#e2e8dc] hover:bg-[#dbe2d5] px-3.5 py-2 text-sm font-semibold text-[#26301f] shadow-xs transition"
          >
            <CreditCard className="h-4 w-4 text-[#c4643f]" />
            <span>Manage Expenses</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="clay-card-interactive bg-[#e2e8dc] p-5 rounded-2xl border border-[#c5d0be]/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7663]">Total Revenue</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#14776b]/15 text-[#14776b] shadow-inner">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-[#14776b] font-mono">
              {formatCurrency(overview.total_revenue)}
            </p>
            <p className="mt-1 text-xs text-[#6b7663]">Realized client payments to date</p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="clay-card-interactive bg-[#e2e8dc] p-5 rounded-2xl border border-[#c5d0be]/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7663]">Total Expenses</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c4643f]/15 text-[#9e3a1b] shadow-inner">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-[#9e3a1b] font-mono">
              {formatCurrency(overview.total_expenses)}
            </p>
            <p className="mt-1 text-xs text-[#6b7663]">Approved operational claims</p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="clay-card-interactive bg-[#e2e8dc] p-5 rounded-2xl border border-[#c5d0be]/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7663]">Net Profit</span>
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl shadow-inner ${
                isNetProfitPositive
                  ? 'bg-[#14776b]/15 text-[#14776b]'
                  : 'bg-[#c4643f]/15 text-[#9e3a1b]'
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
                isNetProfitPositive ? 'text-[#14776b]' : 'text-[#9e3a1b]'
              }`}
            >
              {formatCurrency(overview.net_profit)}
            </p>
            <p className="mt-1 text-xs text-[#6b7663] font-medium">
              Margin: {overallMargin}% of total revenue
            </p>
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="clay-card-interactive bg-[#e2e8dc] p-5 rounded-2xl border border-[#c5d0be]/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6b7663]">Pending Receivables</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#22304a]/10 text-[#22304a] shadow-inner">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold tracking-tight text-[#22304a] font-mono">
              {formatCurrency(overview.pending_invoices_amount)}
            </p>
            <p className="mt-1 text-xs text-[#6b7663]">Unpaid balance on issued invoices</p>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Section */}
      <div className="clay-card rounded-2xl border border-[#c5d0be]/50 bg-[#e2e8dc] overflow-hidden shadow-xs">
        <div className="border-b border-[#c5d0be]/40 bg-[#dbe2d5]/60 px-6 py-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-[#14776b]" />
            <h2 className="text-base font-bold font-baloo text-[#26301f]">
              Monthly Income vs Expenses Trend
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-[#6b7663]">
            Cash-flow receipts vs approved claims aggregated per calendar month
          </p>
        </div>

        {overview.monthly_trend && overview.monthly_trend.length > 0 ? (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-left text-sm text-[#26301f] min-w-[600px]">
              <thead className="border-b border-[#c5d0be]/40 bg-[#dbe2d5]/40 text-xs font-semibold uppercase tracking-wider text-[#6b7663]">
                <tr>
                  <th className="py-3.5 pl-6 pr-4">Month</th>
                  <th className="px-4 py-3.5 text-right">Income (Received)</th>
                  <th className="px-4 py-3.5 text-right">Expenses (Approved)</th>
                  <th className="px-4 py-3.5 text-right">Net Profit</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Profit Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5d0be]/30">
                {overview.monthly_trend.map((item) => {
                  const itemMargin =
                    item.income > 0
                      ? ((item.net_profit / item.income) * 100).toFixed(1)
                      : '0.0';
                  const isPositive = item.net_profit >= 0;

                  return (
                    <tr key={item.month} className="hover:bg-[#dbe2d5]/30 transition-colors">
                      <td className="py-4 pl-6 pr-4 font-mono font-medium text-[#26301f]">
                        {item.month}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-medium text-[#14776b]">
                        {formatCurrency(item.income)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-medium text-[#9e3a1b]">
                        {formatCurrency(item.expenses)}
                      </td>
                      <td
                        className={`px-4 py-4 text-right font-mono font-bold ${
                          isPositive ? 'text-[#14776b]' : 'text-[#9e3a1b]'
                        }`}
                      >
                        {formatCurrency(item.net_profit)}
                      </td>
                      <td className="py-4 pl-4 pr-6 text-right font-mono">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                            isPositive
                              ? 'bg-emerald-100/70 text-emerald-800 border-emerald-200'
                              : 'bg-[#c4643f]/15 text-[#9e3a1b] border-[#c4643f]/30'
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
