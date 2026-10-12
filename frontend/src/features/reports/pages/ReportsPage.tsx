import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';

interface ReportMeta {
  key: string;
  title: string;
  group: string;
  columns: Array<{
    key: string;
    header: string;
    width?: number;
    align?: 'left' | 'center' | 'right';
    format?: string;
  }>;
}

interface ReportDataResponse {
  title?: string;
  columns: Array<{
    key: string;
    header: string;
    align?: 'left' | 'center' | 'right';
  }>;
  rows: Record<string, any>[];
  summary?: Record<string, any>;
  totalRows?: number;
}

export const ReportsPage: React.FC = () => {
  const [selectedReportKey, setSelectedReportKey] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [exportingFormat, setExportingFormat] = useState<'xlsx' | 'pdf' | 'csv' | 'json' | null>(null);

  // Fetch available reports
  const {
    data: reports = [],
    isLoading: loadingReports,
    error: reportsError,
    refetch: refetchReports,
  } = useQuery<ReportMeta[]>({
    queryKey: ['reports', 'list'],
    queryFn: async () => {
      const res = await axiosClient.get('/reports');
      const list = res.data?.data || [];
      if (list.length > 0 && !selectedReportKey) {
        setSelectedReportKey(list[0].key);
      }
      return list;
    },
  });

  // Fetch departments for filter
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

  // Fetch report data
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

      const response = await axiosClient.get(`/reports/${selectedReportKey}/export?${params.toString()}`, {
        responseType: format === 'json' ? 'json' : 'blob',
      });

      let blob: Blob;
      if (format === 'json') {
        blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      } else {
        const mimeTypes: Record<string, string> = {
          pdf: 'application/pdf',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          csv: 'text/csv',
        };
        blob = new Blob([response.data], { type: mimeTypes[format] || 'application/octet-stream' });
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedReportKey}_${new Date().toISOString().split('T')[0]}.${format}`);
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

  // Group reports by their group field
  const groupedReports = reports.reduce((acc, rep) => {
    const grp = rep.group || 'General';
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(rep);
    return acc;
  }, {} as Record<string, ReportMeta[]>);

  const selectedReport = reports.find((r) => r.key === selectedReportKey);

  if (loadingReports) {
    return <Loader size="lg" text="Loading available reports..." />;
  }

  if (reportsError) {
    return (
      <ErrorState
        title="Failed to Load Reports"
        message="Could not retrieve available reports from registry."
        onRetry={refetchReports}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Standardized corporate reports registry with instant data preview, XLSX, PDF, and CSV exports.
          </p>
        </div>

        {selectedReport && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              onClick={() => handleExport('xlsx')}
              isLoading={exportingFormat === 'xlsx'}
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Excel</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleExport('csv')}
              isLoading={exportingFormat === 'csv'}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => handleExport('pdf')}
              isLoading={exportingFormat === 'pdf'}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-white" />
              <span>Export PDF</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Grid: Left sidebar report selector + Right preview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Selector Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs space-y-4">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider px-2">
            Available Reports
          </div>

          <div className="space-y-4">
            {Object.entries(groupedReports).map(([groupName, groupItems]) => (
              <div key={groupName} className="space-y-1">
                <div className="text-xs font-extrabold text-[#0F172A] px-2 py-1 bg-[#F8FAFC] rounded-lg">
                  {groupName}
                </div>
                <div className="space-y-0.5">
                  {groupItems.map((r) => {
                    const isSelected = r.key === selectedReportKey;
                    return (
                      <button
                        key={r.key}
                        onClick={() => setSelectedReportKey(r.key)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#EEF2FF] text-[#4F46E5]'
                            : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                        }`}
                      >
                        <span className="truncate">{r.title}</span>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Report Viewer & Filter Panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 shadow-xs flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#64748B]" />
              <span className="text-xs font-bold text-[#0F172A]">Filters:</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-[#64748B]">From:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-[#64748B]">To:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-[#64748B]">Department:</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="text-xs border border-[#E2E8F0] rounded-lg px-2.5 py-1.5 text-[#0F172A] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
              >
                <option value="">All Departments</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {(fromDate || toDate || departmentId) && (
              <button
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setDepartmentId('');
                }}
                className="text-xs text-rose-600 hover:underline font-semibold ml-auto"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Table Preview Container */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="text-sm font-bold text-[#0F172A]">
                  {selectedReport?.title || 'Report Preview'}
                </h3>
              </div>
              {fetchingData && <span className="text-xs text-[#64748B]">Updating data...</span>}
            </div>

            {loadingData ? (
              <div className="p-12">
                <Loader size="md" text="Loading report preview..." />
              </div>
            ) : dataError ? (
              <div className="p-8">
                <ErrorState
                  title="Failed to load preview"
                  message="Could not fetch data for this report with selected filters."
                  onRetry={refetchData}
                />
              </div>
            ) : !reportData || reportData.rows.length === 0 ? (
              <div className="p-12">
                <EmptyState
                  title="No records found"
                  description="No report data matches the current date and department filters."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#0F172A]">
                  <thead className="bg-[#1E293B] text-white uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      {reportData.columns.map((col) => (
                        <th
                          key={col.key}
                          className={`px-4 py-3 ${
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
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {reportData.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`transition hover:bg-[#F8FAFC] ${
                          idx % 2 === 1 ? 'bg-[#F8FAFC]/50' : 'bg-white'
                        }`}
                      >
                        {reportData.columns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-4 py-2.5 ${
                              col.align === 'right'
                                ? 'text-right'
                                : col.align === 'center'
                                ? 'text-center'
                                : 'text-left'
                            }`}
                          >
                            {row[col.key] !== undefined && row[col.key] !== null
                              ? String(row[col.key])
                              : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}

                    {/* Summary row if present */}
                    {reportData.summary && Object.keys(reportData.summary).length > 0 && (
                      <tr className="bg-[#EEF2FF] font-bold text-[#4338CA]">
                        {reportData.columns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-4 py-2.5 ${
                              col.align === 'right'
                                ? 'text-right'
                                : col.align === 'center'
                                ? 'text-center'
                                : 'text-left'
                            }`}
                          >
                            {reportData.summary?.[col.key] !== undefined
                              ? String(reportData.summary[col.key])
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
