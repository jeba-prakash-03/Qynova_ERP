import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Modal } from '../../../shared/components/Modal';
import { FormField } from '../../../shared/components/FormField';
import { useToast } from '../../../shared/context/ToastContext';
import { useAuth } from '../../../shared/context/AuthContext';
import {
  CalendarDays,
  Search,
  Download,
  Edit2,
  Clock,
  FileSpreadsheet,
  X,
  AlertTriangle,
  Coffee,
  Info,
} from 'lucide-react';

interface DailySheetItem {
  employee_id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  department_name: string;
  designation_title: string;
  attendance_id: number | null;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  work_type: 'office' | 'wfh';
  working_minutes: number;
  break_minutes: number;
  overtime_minutes: number;
  is_late: boolean;
  is_early_checkout: boolean;
  remarks: string | null;
  breaks?: { id: number; break_start: string; break_end: string | null }[];
  leave_times?: string;
}

export const AttendanceSheetPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7);
  });
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Side Panel Detail State
  const [detailItem, setDetailItem] = useState<DailySheetItem | null>(null);

  // Edit / Manual Entry Modal State (ONLY Status, Check In, Check Out, Reason)
  const [editingItem, setEditingItem] = useState<DailySheetItem | null>(null);
  const [editForm, setEditForm] = useState<{
    status: string;
    check_in_time: string;
    check_out_time: string;
    reason: string;
  }>({
    status: 'present',
    check_in_time: '09:30',
    check_out_time: '18:30',
    reason: '',
  });

  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { user } = useAuth();
  const canEdit = user?.permissions.includes('attendance.edit') || user?.roles.includes('Admin') || user?.roles.includes('HR');

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: async () => {
      const res = await axiosClient.get('/departments');
      return res.data.data;
    },
  });

  // Fetch Daily Sheet
  const { data: dailyData, isLoading: isLoadingDaily } = useQuery({
    queryKey: ['attendance', 'sheet', selectedDate, selectedDepartment, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('date', selectedDate);
      if (selectedDepartment) params.append('department_id', selectedDepartment);
      if (search) params.append('search', search);

      const res = await axiosClient.get(`/attendance/sheet?${params.toString()}`);
      return res.data.data;
    },
    enabled: viewMode === 'daily',
  });

  // Fetch Monthly Matrix Sheet
  const { data: monthlyData, isLoading: isLoadingMonthly } = useQuery({
    queryKey: ['attendance', 'monthly-sheet', selectedMonth, selectedDepartment, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('month', selectedMonth);
      if (selectedDepartment) params.append('department_id', selectedDepartment);
      if (search) params.append('search', search);

      const res = await axiosClient.get(`/attendance/monthly-sheet?${params.toString()}`);
      return res.data.data;
    },
    enabled: viewMode === 'monthly',
  });

  // Edit / Manual Entry Mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;

      const datePart = editingItem.date;
      const checkInFull = editForm.check_in_time
        ? `${datePart} ${editForm.check_in_time}:00`
        : undefined;
      const checkOutFull = editForm.check_out_time
        ? `${datePart} ${editForm.check_out_time}:00`
        : undefined;

      if (editingItem.attendance_id) {
        // Update existing record
        const res = await axiosClient.put(`/attendance/${editingItem.attendance_id}`, {
          status: editForm.status,
          check_in: checkInFull,
          check_out: checkOutFull,
          reason: editForm.reason,
        });
        return res.data;
      } else {
        // Manual insertion for missing day
        const res = await axiosClient.post('/attendance', {
          employee_id: editingItem.employee_id,
          date: datePart,
          status: editForm.status,
          check_in: checkInFull,
          check_out: checkOutFull,
          reason: editForm.reason,
        });
        return res.data;
      }
    },
    onSuccess: () => {
      success('Attendance updated and audit log recorded.');
      setEditingItem(null);
      setDetailItem(null);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update attendance');
    },
  });

  const handleOpenEdit = (item: DailySheetItem) => {
    setEditingItem(item);
    const inTime = item.check_in
      ? new Date(item.check_in).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : '09:30';
    const outTime = item.check_out
      ? new Date(item.check_out).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : '18:30';

    setEditForm({
      status: item.status,
      check_in_time: inTime,
      check_out_time: outTime,
      reason: '',
    });
  };

  const handleExport = (format: 'xlsx' | 'csv') => {
    const params = new URLSearchParams();
    params.append('type', viewMode);
    if (viewMode === 'daily') params.append('date', selectedDate);
    else params.append('month', selectedMonth);
    params.append('format', format);

    const exportUrl = `${axiosClient.defaults.baseURL}/attendance/export?${params.toString()}`;
    window.open(exportUrl, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">P (Present)</span>;
      case 'wfh':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-800">WFH</span>;
      case 'half_day':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">HD (Half Day)</span>;
      case 'absent':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800">A (Absent)</span>;
      case 'holiday':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">H (Holiday)</span>;
      case 'weekend':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">W (Weekend)</span>;
      case 'leave':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">L (Leave)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">{status.toUpperCase()}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-indigo-600" />
            Attendance Sheet
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Review organization daily sheet, inspect punches in side panel, and export records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex text-sm font-medium">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'daily'
                  ? 'bg-white text-indigo-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Sheet
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                viewMode === 'monthly'
                  ? 'bg-white text-indigo-700 shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Grid
            </button>
          </div>

          {/* Export Dropdown */}
          <button
            onClick={() => handleExport('xlsx')}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'daily' ? (
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <label>Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <label>Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <label>Department:</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Departments</option>
              {departments.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm w-48 sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* COMPACT DAILY SHEET TABLE */}
      {viewMode === 'daily' ? (
        <div className="flex gap-6">
          <div className="flex-1 bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Check In</th>
                    <th className="py-3 px-4">Check Out</th>
                    <th className="py-3 px-4">Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoadingDaily ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">
                        Loading daily attendance sheet...
                      </td>
                    </tr>
                  ) : dailyData?.items?.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-slate-400">
                        No employee records found for this date.
                      </td>
                    </tr>
                  ) : (
                    dailyData?.items?.map((item: DailySheetItem) => (
                      <tr
                        key={item.employee_id}
                        onClick={() => setDetailItem(item)}
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                          detailItem?.employee_id === item.employee_id ? 'bg-indigo-50/50' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {item.first_name} {item.last_name}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {item.employee_code} • {item.department_name}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>
                        <td className="py-3.5 px-4 font-mono text-xs">
                          {item.check_in
                            ? new Date(item.check_in).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '--:--'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs">
                          {item.check_out
                            ? new Date(item.check_out).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '--:--'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {item.working_minutes > 0
                            ? `${(item.working_minutes / 60).toFixed(1)} hrs`
                            : '--'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SIDE PANEL DETAILS FOR ROW CLICK */}
          {detailItem && (
            <div className="w-80 bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4 shrink-0 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {detailItem.first_name} {detailItem.last_name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      {detailItem.employee_code} • {detailItem.department_name}
                    </p>
                  </div>
                  <button
                    onClick={() => setDetailItem(null)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span>Date:</span>
                    <span className="font-semibold text-slate-800">{detailItem.date}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span>Status:</span>
                    <span>{getStatusBadge(detailItem.status)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span>Work Type:</span>
                    <span className="font-semibold uppercase">{detailItem.work_type}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span>Check In:</span>
                    <span className="font-mono font-semibold">
                      {detailItem.check_in
                        ? new Date(detailItem.check_in).toLocaleTimeString('en-IN')
                        : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span>Check Out:</span>
                    <span className="font-mono font-semibold">
                      {detailItem.check_out
                        ? new Date(detailItem.check_out).toLocaleTimeString('en-IN')
                        : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span>Working Minutes:</span>
                    <span className="font-semibold">{detailItem.working_minutes} mins</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span>Break Minutes:</span>
                    <span className="font-semibold">{detailItem.break_minutes} mins</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span>Overtime Minutes:</span>
                    <span className="font-semibold">{detailItem.overtime_minutes} mins</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span>Late Arrival:</span>
                    <span className={`font-bold ${detailItem.is_late ? 'text-amber-600' : 'text-slate-400'}`}>
                      {detailItem.is_late ? 'YES' : 'NO'}
                    </span>
                  </div>
                  {detailItem.remarks && (
                    <div className="py-1">
                      <span className="block text-slate-400 mb-0.5">Remarks:</span>
                      <p className="p-2 bg-slate-50 rounded border text-slate-700">{detailItem.remarks}</p>
                    </div>
                  )}
                </div>
              </div>

              {canEdit && (
                <button
                  onClick={() => handleOpenEdit(detailItem)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Attendance
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* MONTHLY GRID VIEW (P / A / L / H / W / HD with legend) */
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span>Legend:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">P = Present</span>
            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800">A = Absent</span>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">HD = Half Day</span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">L = Leave</span>
            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800">H = Holiday</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">W = Weekend</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Department</th>
                  {Array.from({ length: monthlyData?.totalDays || 30 }, (_, i) => i + 1).map((d) => (
                    <th key={d} className="py-2 px-1 text-center font-mono">
                      {d}
                    </th>
                  ))}
                  <th className="py-2.5 px-2 text-center bg-emerald-50 text-emerald-800">P</th>
                  <th className="py-2.5 px-2 text-center bg-rose-50 text-rose-800">A</th>
                  <th className="py-2.5 px-2 text-center bg-amber-50 text-amber-800">HD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {isLoadingMonthly ? (
                  <tr>
                    <td colSpan={35} className="text-center py-12 text-slate-400">
                      Loading monthly attendance grid...
                    </td>
                  </tr>
                ) : (
                  monthlyData?.employees?.map((emp: any) => (
                    <tr key={emp.employee_id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-medium text-slate-900 truncate max-w-[140px]">
                        {emp.first_name} {emp.last_name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-[100px]">
                        {emp.department_name}
                      </td>

                      {Array.from({ length: monthlyData.totalDays }, (_, i) => {
                        const dayNum = (i + 1).toString().padStart(2, '0');
                        const dateKey = `${selectedMonth}-${dayNum}`;
                        const dayInfo = emp.days[dateKey];
                        const code = dayInfo?.statusCode || '-';

                        let colorClass = 'text-slate-300';
                        if (code === 'P') colorClass = 'bg-emerald-100 text-emerald-800 font-bold';
                        else if (code === 'WFH') colorClass = 'bg-teal-100 text-teal-800 font-bold';
                        else if (code === 'HD') colorClass = 'bg-amber-100 text-amber-800 font-bold';
                        else if (code === 'A') colorClass = 'bg-rose-100 text-rose-800 font-bold';
                        else if (code === 'L') colorClass = 'bg-blue-100 text-blue-800 font-bold';
                        else if (code === 'H') colorClass = 'bg-purple-100 text-purple-800 font-bold';
                        else if (code === 'W') colorClass = 'bg-slate-100 text-slate-600';

                        return (
                          <td key={dayNum} className="text-center p-0.5">
                            <span className={`inline-block w-6 py-0.5 rounded text-[10px] ${colorClass}`}>
                              {code}
                            </span>
                          </td>
                        );
                      })}

                      <td className="text-center font-bold text-emerald-700 bg-emerald-50/50">
                        {emp.totals?.present || 0}
                      </td>
                      <td className="text-center font-bold text-rose-700 bg-rose-50/50">
                        {emp.totals?.absent || 0}
                      </td>
                      <td className="text-center font-bold text-amber-700 bg-amber-50/50">
                        {emp.totals?.half_day || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT ATTENDANCE MODAL (ONLY Status, Check In, Check Out, Reason) */}
      <Modal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title={`Edit Attendance: ${editingItem?.first_name} ${editingItem?.last_name}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            editMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-600">
            <div>
              Date: <strong className="text-slate-900">{editingItem?.date}</strong>
            </div>
            <div>
              Employee Code: <strong className="text-slate-900">{editingItem?.employee_code}</strong>
            </div>
            <div className="text-indigo-600 font-medium">
              * The server recalculates working hours, flags, and writes an audit log.
            </div>
          </div>

          <FormField label="Status" required>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="present">Present</option>
              <option value="wfh">Work From Home</option>
              <option value="half_day">Half Day</option>
              <option value="absent">Absent</option>
              <option value="leave">Leave</option>
              <option value="holiday">Holiday</option>
              <option value="weekend">Weekend</option>
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Check In Time (HH:mm)">
              <input
                type="time"
                value={editForm.check_in_time}
                onChange={(e) => setEditForm({ ...editForm, check_in_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </FormField>

            <FormField label="Check Out Time (HH:mm)">
              <input
                type="time"
                value={editForm.check_out_time}
                onChange={(e) => setEditForm({ ...editForm, check_out_time: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </FormField>
          </div>

          <FormField label="Required Reason for Adjustment" required>
            <textarea
              rows={3}
              placeholder="e.g. Biometric reader sync failure, verified by department head."
              value={editForm.reason}
              onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
              minLength={5}
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editMutation.isPending || editForm.reason.trim().length < 5}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {editMutation.isPending ? 'Saving...' : 'Save & Record Audit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendanceSheetPage;
