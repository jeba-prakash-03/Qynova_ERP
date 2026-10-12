import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  FileText,
  Download,
  Filter,
  Calendar,
  Search,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  FolderKanban,
  CheckSquare,
  DollarSign,
  Users,
  Target,
  RefreshCw,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { reportsApi } from '../api';
import { ReportMetadata, ReportResult, ReportColumn } from '../types';
import { Loader } from '../../../shared/components/Loader';
import { useToast } from '../../../shared/context/ToastContext';
import { Can } from '../../../shared/components/Can';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  projects: <FolderKanban className="h-4 w-4" />,
  tasks: <CheckSquare className="h-4 w-4" />,
  finance: <DollarSign className="h-4 w-4" />,
  sales: <Target className="h-4 w-4" />,
  hr: <Users className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  projects: 'bg-blue-50 text-blue-700 border-blue-200',
  tasks: 'bg-amber-50 text-amber-700 border-amber-200',
  finance: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sales: 'bg-purple-50 text-purple-700 border-purple-200',
  hr: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const ReportsPage: React.FC = () => {
  const { success, error: toastError } = useToast();

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Date filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Fetch available reports
  const {
    data: reports = [],
    isLoading: loadingReports,
    error: reportsError,
  } = useQuery<ReportMetadata[]>({
    queryKey: ['reports', 'list'],
    queryFn: reportsApi.getAvailableReports,
  });

  // Fetch selected report data
  const {
    data: activeReportData,
    isLoading: loadingReportData,
    isFetching: fetchingReportData,
    error: reportDataError,
    refetch: refetchReportData,
  } = useQuery<ReportResult>({
    queryKey: ['reports', 'run', selectedReportId, fromDate, toDate],
    queryFn: () =>
      reportsApi.runReport(selectedReportId!, {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    enabled: Boolean(selectedReportId),
  });

  // Handle Export
  const exportMutation = useMutation({
    mutationFn: async (format: 'csv' | 'json') => {
      if (!selectedReportId) return;
      const blob = await reportsApi.exportReport(selectedReportId, format, {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReportId}_${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: (_, format) => {
      success(`Report exported successfully as ${format.toUpperCase()}`);
    },
    onError: (err: any) => {
      toastError(err.message || 'Failed to export report');
    },
  });

  const formatCurrency = (amt: any) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amt || 0));
  };

  const renderCellValue = (column: ReportColumn, val: any) => {
    if (val === null || val === undefined) return '—';

    switch (column.format) {
      case 'currency':
        return <span className="font-semibold text-slate-800">{formatCurrency(val)}</span>;
      case 'number':
        return <span className="font-medium text-slate-700">{Number(val).toLocaleString()}</span>;
      case 'percentage':
        return <span className="font-semibold text-indigo-700">{val}</span>;
      case 'status':
        return (
          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 capitalize">
            {String(val).replace(/_/g, ' ')}
          </span>
        );
      case 'date':
        return <span className="text-slate-600">{val}</span>;
      default:
        return <span>{String(val)}</span>;
    }
  };

  const filteredReports = reports.filter((r) => {
    if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedReportMeta = reports.find((r) => r.id === selectedReportId);

  // Quick Date presets
  const handleQuickPreset = (preset: 'this_month' | 'last_30' | 'clear') => {
    if (preset === 'clear') {
      setFromDate('');
      setToDate('');
      return;
    }
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      setFromDate(firstDay);
      setToDate(todayStr);
    } else if (preset === 'last_30') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setFromDate(past.toISOString().split('T')[0]);
      setToDate(todayStr);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Analytics & Reports Registry
          </h1>
          <p className="text-sm text-slate-500">
            Comprehensive business reports with custom date filters and CSV/JSON exports.
          </p>
        </div>

        {selectedReportId && (
          <button
            onClick={() => setSelectedReportId(null)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to All Reports
          </button>
        )}
      </div>

      {/* VIEW 1: REPORTS LISTING */}
      {!selectedReportId && (
        <div className="space-y-6">
          {/* Categories & Search */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            {/* Category pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {['all', 'projects', 'tasks', 'finance', 'sales', 'hr'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports..."
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Loading state */}
          {loadingReports && (
            <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
              <Loader text="Loading reports catalog..." />
            </div>
          )}

          {/* Error state */}
          {reportsError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
              <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
              <h3 className="mt-2 font-semibold">Failed to load reports</h3>
              <p className="mt-1 text-xs">{(reportsError as any)?.message || 'Network error'}</p>
            </div>
          )}

          {/* Reports Grid */}
          {!loadingReports && !reportsError && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredReports.map((report) => {
                const colorClass = CATEGORY_COLORS[report.category] || 'bg-slate-50 text-slate-700 border-slate-200';
                const icon = CATEGORY_ICONS[report.category] || <FileText className="h-4 w-4" />;

                return (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReportId(report.id)}
                    className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-indigo-400 hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${colorClass}`}
                        >
                          {icon}
                          {report.category}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition" />
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        {report.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-slate-500 line-clamp-3 leading-relaxed">
                        {report.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Permission: {report.permission}</span>
                      <span className="font-semibold text-indigo-600 group-hover:underline">
                        Run Report →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ACTIVE REPORT VIEWER */}
      {selectedReportId && selectedReportMeta && (
        <div className="space-y-6">
          {/* Header Card with Meta & Filters */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      CATEGORY_COLORS[selectedReportMeta.category]
                    }`}
                  >
                    {CATEGORY_ICONS[selectedReportMeta.category]}
                    {selectedReportMeta.category}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedReportMeta.title}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedReportMeta.description}
                </p>
              </div>

              {/* Export actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportMutation.mutate('csv')}
                  disabled={exportMutation.isPending || !activeReportData?.rows?.length}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Export CSV
                </button>
                <button
                  onClick={() => exportMutation.mutate('json')}
                  disabled={exportMutation.isPending || !activeReportData?.rows?.length}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  <Download className="h-4 w-4 text-indigo-600" />
                  Export JSON
                </button>
              </div>
            </div>

            {/* Date Filters Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">From Date:</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">To Date:</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickPreset('this_month')}
                  className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('last_30')}
                  className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
                >
                  Last 30 Days
                </button>
                {(fromDate || toDate) && (
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('clear')}
                    className="rounded text-[11px] font-medium text-indigo-600 hover:underline px-1"
                  >
                    Reset
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => refetchReportData()}
                disabled={fetchingReportData}
                className="ml-auto inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                <RefreshCw className={`h-3 w-3 ${fetchingReportData ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Report Data Table */}
          {loadingReportData && (
            <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
              <Loader text="Generating report data..." />
            </div>
          )}

          {reportDataError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
              <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
              <h3 className="mt-2 font-semibold">Error Generating Report</h3>
              <p className="mt-1 text-xs">{(reportDataError as any)?.message || 'Failed to fetch report rows'}</p>
            </div>
          )}

          {!loadingReportData && !reportDataError && activeReportData && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {activeReportData.rows.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <FileText className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-2 text-sm font-medium">No records found for the selected date criteria</p>
                  <p className="text-xs text-slate-400">Try broadening your date filter range.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        {activeReportData.columns.map((col) => (
                          <th
                            key={col.key}
                            className={`px-4 py-3 ${
                              col.format === 'currency' || col.format === 'number'
                                ? 'text-right'
                                : 'text-left'
                            }`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeReportData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          {activeReportData.columns.map((col) => (
                            <td
                              key={col.key}
                              className={`px-4 py-3 ${
                                col.format === 'currency' || col.format === 'number'
                                  ? 'text-right'
                                  : 'text-left'
                              }`}
                            >
                              {renderCellValue(col, row[col.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 text-xs font-semibold text-slate-700 border-t border-slate-200">
                      <tr>
                        <td
                          colSpan={activeReportData.columns.length}
                          className="px-4 py-2.5 text-right text-slate-500"
                        >
                          Total Records: {activeReportData.totalRows}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
