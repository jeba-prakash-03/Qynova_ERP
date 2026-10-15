import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import axiosClient from '../../../shared/api/axiosClient';
import { Button } from '../../../shared/components/Button';
import { Loader } from '../../../shared/components/Loader';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  Building2,
  Table as TableIcon,
  Search,
  RefreshCw,
  BarChart3,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Users,
  CheckCircle2,
  Clock,
  Briefcase,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

interface ReportMeta {
  key: string;
  title: string;
  group: string;
  columns?: Array<{
    key: string;
    header: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
    format?: string;
  }>;
}

interface ReportColumn {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  format?: string;
  width?: number;
}

interface ReportDataResponse {
  title?: string;
  columns: ReportColumn[];
  rows: Record<string, any>[];
  summary?: Record<string, any>;
  totalRows?: number;
}

// Category icons mapping
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  HR: <Users className="w-3.5 h-3.5" />,
  Attendance: <Clock className="w-3.5 h-3.5" />,
  Leaves: <Calendar className="w-3.5 h-3.5" />,
  Payroll: <DollarSign className="w-3.5 h-3.5" />,
  Projects: <Briefcase className="w-3.5 h-3.5" />,
  Finance: <DollarSign className="w-3.5 h-3.5" />,
  General: <Layers className="w-3.5 h-3.5" />,
};

export const ReportsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlReportKey = searchParams.get('report') || '';

  const [selectedReportKey, setSelectedReportKey] = useState<string>(urlReportKey);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [exportingFormat, setExportingFormat] = useState<'xlsx' | 'pdf' | 'csv' | 'json' | null>(null);
  const [isMobileDirectoryExpanded, setIsMobileDirectoryExpanded] = useState<boolean>(false);

  const reportContainerRef = useRef<HTMLDivElement>(null);

  // 1. Fetch available reports list
  const {
    data: reports = [],
    isLoading: loadingReports,
    error: reportsError,
    refetch: refetchReports,
  } = useQuery<ReportMeta[]>({
    queryKey: ['reports', 'list'],
    queryFn: async () => {
      const res = await axiosClient.get('/reports');
      return res.data?.data || [];
    },
  });

  // 2. Synchronize selectedReportKey with URL and defaults
  useEffect(() => {
    if (reports.length > 0) {
      if (urlReportKey && reports.some((r) => r.key === urlReportKey)) {
        if (selectedReportKey !== urlReportKey) {
          setSelectedReportKey(urlReportKey);
        }
      } else if (!selectedReportKey) {
        const initialKey = reports[0].key;
        setSelectedReportKey(initialKey);
        setSearchParams({ report: initialKey }, { replace: true });
      }
    }
  }, [reports, urlReportKey]);

  // 3. Reset vertical scroll position to top when switching reports
  useEffect(() => {
    if (selectedReportKey) {
      const mainEl = document.querySelector('main');
      if (mainEl && mainEl.scrollTop > 60) {
        mainEl.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [selectedReportKey]);

  // 4. Fetch departments for filter
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', 'for-reports'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/departments');
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  // 5. Fetch report data
  const {
    data: reportData,
    isLoading: loadingData,
    isFetching: fetchingData,
    error: dataError,
    refetch: refetchData,
  } = useQuery<ReportDataResponse>({
    queryKey: ['reports', 'data', selectedReportKey, fromDate, toDate, departmentId],
    queryFn: async () => {
      if (!selectedReportKey) return { columns: [], rows: [] };
      const params = new URLSearchParams();
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (departmentId) params.append('department', departmentId);

      const res = await axiosClient.get(`/reports/${selectedReportKey}?${params.toString()}`);
      return res.data?.data || { columns: [], rows: [] };
    },
    enabled: Boolean(selectedReportKey),
  });

  // Handle report selection
  const handleSelectReport = (key: string) => {
    setSelectedReportKey(key);
    setSearchParams({ report: key }, { replace: false });
    setIsMobileDirectoryExpanded(false);
  };

  // Handle Export
  const handleExport = async (format: 'xlsx' | 'pdf' | 'csv' | 'json') => {
    if (!selectedReportKey) return;
    try {
      setExportingFormat(format);
      const params = new URLSearchParams();
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (departmentId) params.append('department', departmentId);
      params.append('format', format);

      const response = await axiosClient.get(
        `/reports/${selectedReportKey}/export?${params.toString()}`,
        {
          responseType: format === 'json' ? 'json' : 'blob',
        }
      );

      let blob: Blob;
      if (format === 'json') {
        blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: 'application/json',
        });
      } else {
        const mimeTypes: Record<string, string> = {
          pdf: 'application/pdf',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          csv: 'text/csv',
        };
        blob = new Blob([response.data], {
          type: mimeTypes[format] || 'application/octet-stream',
        });
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `${selectedReportKey}_${new Date().toISOString().split('T')[0]}.${format}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Failed to export report. Please try again.');
    } finally {
      setExportingFormat(null);
    }
  };

  // Group reports by their group field & apply search query
  const groupedReports = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = reports.filter((rep) => {
      if (selectedCategory !== 'all' && (rep.group || 'General') !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        rep.title.toLowerCase().includes(q) ||
        (rep.group && rep.group.toLowerCase().includes(q)) ||
        rep.key.toLowerCase().includes(q)
      );
    });

    return filtered.reduce((acc, rep) => {
      const grp = rep.group || 'General';
      if (!acc[grp]) acc[grp] = [];
      acc[grp].push(rep);
      return acc;
    }, {} as Record<string, ReportMeta[]>);
  }, [reports, searchQuery, selectedCategory]);

  // Categories list with counts
  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      const grp = r.group || 'General';
      counts[grp] = (counts[grp] || 0) + 1;
    });
    return [
      { name: 'all', label: 'All', count: reports.length },
      ...Object.keys(counts).map((grp) => ({
        name: grp,
        label: grp,
        count: counts[grp],
      })),
    ];
  }, [reports]);

  const selectedReport = reports.find((r) => r.key === selectedReportKey);

  // Formats cell values cleanly
  const formatCellValue = (val: any, col: ReportColumn) => {
    if (val === undefined || val === null || val === '') return '—';

    // Currency
    if (
      col.format === 'currency' ||
      /budget|salary|amount|pay|cost|revenue|value/i.test(col.key)
    ) {
      const num = Number(val);
      if (!isNaN(num)) {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(num);
      }
    }

    // Status Pill
    if (col.format === 'status' || /status/i.test(col.key)) {
      const s = String(val).toLowerCase();
      let colorClass = 'bg-[#c5d0be]/40 text-[#26301f] border-[#c5d0be]';
      if (['active', 'completed', 'present', 'approved', 'won'].includes(s)) {
        colorClass = 'bg-emerald-100/70 text-emerald-800 border-emerald-300/50';
      } else if (['onboarding', 'pending', 'in_progress', 'draft'].includes(s)) {
        colorClass = 'bg-[#cf9b34]/15 text-[#916515] border-[#cf9b34]/30';
      } else if (['rejected', 'absent', 'cancelled', 'lost', 'relieved'].includes(s)) {
        colorClass = 'bg-[#c4643f]/15 text-[#9e3a1b] border-[#c4643f]/30';
      }
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border capitalize ${colorClass}`}
        >
          {String(val).replace(/_/g, ' ')}
        </span>
      );
    }

    return String(val);
  };

  // Derive Summary KPI entries if present
  const summaryCards = useMemo(() => {
    if (!reportData?.summary) return [];
    return Object.entries(reportData.summary)
      .filter(([k, v]) => v !== undefined && v !== null && v !== '-' && k !== 'department' && k !== 'designation')
      .map(([key, val]) => {
        const matchingCol = reportData.columns.find((c) => c.key === key);
        const header = matchingCol?.header || key.replace(/_/g, ' ').toUpperCase();
        return {
          key,
          label: header,
          value: formatCellValue(val, matchingCol || { key, header }),
        };
      });
  }, [reportData]);

  if (loadingReports) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader size="lg" text="Loading enterprise reports registry..." />
      </div>
    );
  }

  if (reportsError) {
    return (
      <div className="p-4 sm:p-6">
        <ErrorState
          title="Failed to Load Reports Registry"
          message="Could not retrieve available reports from the reporting service."
          onRetry={refetchReports}
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5" ref={reportContainerRef}>
      {/* Page Title & Global Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-baloo tracking-tight text-[#26301f]">
            Reports & Business Intelligence
          </h1>
          <p className="text-sm text-[#6b7663]">
            Standardized corporate reports registry with instant data preview, XLSX, PDF, and CSV exports.
          </p>
        </div>

        {selectedReport && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('xlsx')}
              isLoading={exportingFormat === 'xlsx'}
              className="flex items-center gap-1.5 bg-[#e2e8dc] hover:bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.18)]"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#14776b]" />
              <span>Export Excel</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('csv')}
              isLoading={exportingFormat === 'csv'}
              className="flex items-center gap-1.5 bg-[#e2e8dc] hover:bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.18)]"
            >
              <Download className="w-4 h-4 text-[#22304a]" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleExport('pdf')}
              isLoading={exportingFormat === 'pdf'}
              className="flex items-center gap-1.5 bg-[#14776b] hover:bg-[#11655b] text-white shadow-xs"
            >
              <FileText className="w-4 h-4 text-white" />
              <span>Export PDF</span>
            </Button>
          </div>
        )}
      </div>

      {/* Mobile & Tablet Quick Switcher Header (Visible only on screens < lg) */}
      <div className="lg:hidden clay-card bg-[#dbe2d5]/85 border border-[rgba(76,91,70,0.18)] rounded-2xl p-3.5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-[#14776b]/15 text-[#14776b]">
              <BarChart3 className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#6b7663]">
              Active Report
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileDirectoryExpanded(!isMobileDirectoryExpanded)}
            className="flex items-center gap-1 text-xs font-semibold text-[#14776b] hover:text-[#106258] transition-colors"
          >
            <span>{isMobileDirectoryExpanded ? 'Hide Directory' : `Browse All (${reports.length})`}</span>
            {isMobileDirectoryExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Dropdown selector for instant 1-tap switching on mobile */}
        <select
          value={selectedReportKey}
          onChange={(e) => handleSelectReport(e.target.value)}
          className="w-full px-3 py-2 text-xs font-semibold clay-inset bg-[#e2e8dc] border border-[#c5d0be]/60 rounded-xl text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
        >
          {Object.entries(
            reports.reduce((acc, r) => {
              const grp = r.group || 'General';
              if (!acc[grp]) acc[grp] = [];
              acc[grp].push(r);
              return acc;
            }, {} as Record<string, ReportMeta[]>)
          ).map(([groupName, groupItems]) => (
            <optgroup key={groupName} label={groupName}>
              {groupItems.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Main Layout Grid: Left Directory Panel + Right Report Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0">
        {/* Left Directory Panel (Sticky on desktop, Collapsible on mobile) */}
        <div
          className={`lg:col-span-4 xl:col-span-3.5 lg:sticky lg:top-4 self-start flex flex-col lg:max-h-[calc(100vh-140px)] min-w-0 ${
            isMobileDirectoryExpanded ? 'block' : 'hidden lg:flex'
          }`}
        >
          <div className="clay-card bg-[#dbe2d5]/85 border border-[rgba(76,91,70,0.18)] rounded-2xl p-4 shadow-[4px_6px_16px_rgba(88,104,84,0.12),-3px_-3px_10px_rgba(255,255,255,0.6)] flex flex-col min-h-0">
            {/* Header & Total Count */}
            <div className="flex items-center justify-between pb-3 border-b border-[#c5d0be]/40">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#14776b]/15 text-[#14776b]">
                  <Layers className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#26301f]">
                  Report Registry
                </span>
              </div>
              <span className="clay-inset px-2 py-0.5 rounded-full text-[11px] font-bold text-[#6b7663]">
                {reports.length} Reports
              </span>
            </div>

            {/* Instant Search Bar */}
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6b7663]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports by name..."
                className="w-full pl-8 pr-7 py-1.5 text-xs clay-inset bg-[#e2e8dc]/60 border border-[#c5d0be]/50 rounded-xl text-[#26301f] placeholder-[#6b7663] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-[#6b7663] hover:text-[#26301f]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar min-w-0">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-all ${
                    selectedCategory === cat.name
                      ? 'bg-[#14776b] text-white shadow-2xs'
                      : 'clay-inset text-[#6b7663] hover:text-[#26301f]'
                  }`}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>

            {/* Categorized Report List with Smooth Internal Scrolling */}
            <div className="mt-3 flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1 min-h-[220px] max-h-[calc(100vh-320px)]">
              {Object.keys(groupedReports).length === 0 ? (
                <div className="py-8 text-center text-[#6b7663]">
                  <p className="text-xs font-semibold">No reports match your search</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="mt-1 text-xs text-[#14776b] hover:underline font-bold"
                  >
                    Clear search filter
                  </button>
                </div>
              ) : (
                Object.entries(groupedReports).map(([groupName, groupItems]) => (
                  <div key={groupName} className="space-y-1.5">
                    {/* Category Header */}
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#c5d0be]/30 text-[#26301f] text-[11px] font-bold uppercase tracking-wider">
                      <span className="text-[#14776b]">
                        {CATEGORY_ICONS[groupName] || <Layers className="w-3.5 h-3.5" />}
                      </span>
                      <span>{groupName}</span>
                      <span className="ml-auto text-[10px] text-[#6b7663] font-mono">
                        ({groupItems.length})
                      </span>
                    </div>

                    {/* Report Buttons */}
                    <div className="space-y-1">
                      {groupItems.map((r) => {
                        const isSelected = r.key === selectedReportKey;
                        return (
                          <button
                            key={r.key}
                            type="button"
                            onClick={() => handleSelectReport(r.key)}
                            title={r.title}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center justify-between group ${
                              isSelected
                                ? 'bg-[#14776b] text-white shadow-xs font-bold'
                                : 'text-[#35422d] hover:bg-[#e2e8dc] hover:text-[#26301f]'
                            }`}
                          >
                            <span className="truncate pr-2">{r.title}</span>
                            {isSelected ? (
                              <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#14776b] opacity-0 group-hover:opacity-40 shrink-0 transition-opacity" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Report Viewer & Data Panel */}
        <div className="lg:col-span-8 xl:col-span-8.5 min-w-0 space-y-4">
          {/* Active Report Title & Description Card */}
          <div className="clay-card bg-[#dbe2d5]/80 border border-[rgba(76,91,70,0.18)] p-4 sm:p-5 rounded-2xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#14776b]/15 text-[#14776b] border border-[#14776b]/20">
                    {selectedReport?.group || 'General'}
                  </span>
                  {reportData?.rows && (
                    <span className="text-xs font-mono font-medium text-[#6b7663]">
                      {reportData.rows.length} {reportData.rows.length === 1 ? 'record' : 'records'}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-bold font-baloo text-[#26301f] tracking-tight truncate">
                  {selectedReport?.title || 'Report Preview'}
                </h2>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => refetchData()}
                  disabled={fetchingData}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#14776b] hover:bg-[#c5d0be]/50 transition-colors clay-inset"
                  title="Refresh report data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${fetchingData ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filters Bar Card */}
          <div className="clay-card bg-[#dbe2d5]/65 border border-[rgba(76,91,70,0.18)] p-4 rounded-2xl shadow-xs flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#26301f]">
              <Filter className="w-3.5 h-3.5 text-[#14776b]" />
              <span>Filters:</span>
            </div>

            {/* From Date */}
            <div className="flex items-center gap-1.5 min-w-0">
              <label className="text-xs font-medium text-[#6b7663]">From:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs clay-inset bg-[#e2e8dc] border border-[#c5d0be]/60 rounded-xl px-2.5 py-1.5 text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              />
            </div>

            {/* To Date */}
            <div className="flex items-center gap-1.5 min-w-0">
              <label className="text-xs font-medium text-[#6b7663]">To:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs clay-inset bg-[#e2e8dc] border border-[#c5d0be]/60 rounded-xl px-2.5 py-1.5 text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              />
            </div>

            {/* Department Filter */}
            <div className="flex items-center gap-1.5 min-w-0">
              <label className="text-xs font-medium text-[#6b7663]">Department:</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="text-xs clay-inset bg-[#e2e8dc] border border-[#c5d0be]/60 rounded-xl px-2.5 py-1.5 text-[#26301f] focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
              >
                <option value="">All Departments</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            {(fromDate || toDate || departmentId) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setDepartmentId('');
                }}
                className="text-xs text-[#c4643f] hover:text-[#9e3a1b] font-bold ml-auto flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Summary KPI Cards (If summary data is provided by report) */}
          {summaryCards.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {summaryCards.map((card) => (
                <div
                  key={card.key}
                  className="clay-card bg-[#e2e8dc] border border-[rgba(76,91,70,0.18)] p-3 rounded-xl shadow-2xs min-w-0"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b7663] truncate block" title={card.label}>
                    {card.label}
                  </span>
                  <div className="mt-1 text-lg font-bold font-mono text-[#26301f] truncate" title={String(card.value)}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Report Data Table Preview Container */}
          <div className="clay-card rounded-2xl border border-[rgba(76,91,70,0.18)] bg-[#e2e8dc] shadow-sm overflow-hidden">
            {/* Table Header Bar */}
            <div className="p-3.5 sm:p-4 border-b border-[#c5d0be]/50 bg-[#dbe2d5]/60 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <TableIcon className="w-4 h-4 text-[#14776b] shrink-0" />
                <h3 className="text-sm font-bold text-[#26301f] truncate">
                  {reportData?.title || selectedReport?.title || 'Data Records'}
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {fetchingData && (
                  <span className="text-xs font-medium text-[#14776b] flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span className="hidden sm:inline">Syncing...</span>
                  </span>
                )}
                {reportData?.rows && (
                  <span className="text-[11px] font-mono font-bold clay-inset px-2 py-0.5 rounded-full text-[#6b7663]">
                    {reportData.rows.length} rows
                  </span>
                )}
              </div>
            </div>

            {/* Table Content States */}
            {loadingData ? (
              <div className="p-16 flex items-center justify-center">
                <Loader size="md" text="Loading report data..." />
              </div>
            ) : dataError ? (
              <div className="p-8">
                <ErrorState
                  title="Failed to Load Report Data"
                  message="Could not fetch data for this report with the selected filters."
                  onRetry={refetchData}
                />
              </div>
            ) : !reportData || reportData.rows.length === 0 ? (
              <div className="p-12 text-center">
                <EmptyState
                  title="No records found"
                  description="No report data matches the current date range or department filter criteria."
                />
                {(fromDate || toDate || departmentId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFromDate('');
                      setToDate('');
                      setDepartmentId('');
                    }}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#14776b] hover:underline"
                  >
                    Clear filters to view all records
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto min-w-0 no-scrollbar">
                <table className="w-full text-left text-xs text-[#26301f] whitespace-nowrap">
                  {/* Sticky Table Head */}
                  <thead className="bg-[#26301f] text-white uppercase text-[10px] tracking-wider font-bold select-none">
                    <tr>
                      {reportData.columns.map((col) => (
                        <th
                          key={col.key}
                          className={`px-4 py-3.5 ${
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-[#c5d0be]/40">
                    {reportData.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`transition-colors hover:bg-[#dbe2d5]/60 ${
                          idx % 2 === 1 ? 'bg-[#dbe2d5]/25' : 'bg-[#e2e8dc]'
                        }`}
                      >
                        {reportData.columns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-4 py-3 text-xs ${
                              col.align === 'right'
                                ? 'text-right font-mono'
                                : col.align === 'center'
                                ? 'text-center'
                                : 'text-left'
                            }`}
                          >
                            {formatCellValue(row[col.key], col)}
                          </td>
                        ))}
                      </tr>
                    ))}

                    {/* Summary row if present */}
                    {reportData.summary && Object.keys(reportData.summary).length > 0 && (
                      <tr className="bg-[#14776b]/15 font-bold text-[#14776b] border-t-2 border-[#14776b]/30">
                        {reportData.columns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-4 py-3 text-xs ${
                              col.align === 'right'
                                ? 'text-right font-mono'
                                : col.align === 'center'
                                ? 'text-center'
                                : 'text-left'
                            }`}
                          >
                            {reportData.summary?.[col.key] !== undefined
                              ? formatCellValue(reportData.summary[col.key], col)
                              : ''}
                          </td>
                        ))}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
