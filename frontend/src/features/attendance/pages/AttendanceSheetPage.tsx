import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Modal } from '../../../shared/components/Modal';
import { FormField } from '../../../shared/components/FormField';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Button } from '../../../shared/components/Button';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { useToast } from '../../../shared/context/ToastContext';
import { useAuth } from '../../../shared/context/AuthContext';
import {
  CalendarDays,
  Search,
  Plus,
  Edit2,
  Trash2,
  FileSpreadsheet,
  X,
  AlertTriangle,
  Building2,
  Clock,
  User,
} from 'lucide-react';
import ErrorBoundary from '../../../shared/components/ErrorBoundary';

const safeFormatTime = (timeStr?: string | null, format: '12h' | '24h' = '12h'): string => {
  if (!timeStr) return '--:--';
  try {
    const normalized = timeStr.includes(' ') && !timeStr.includes('T')
      ? timeStr.replace(' ', 'T')
      : timeStr;
    const d = new Date(normalized);
    if (isNaN(d.getTime())) {
      const match = timeStr.match(/(\d{2}:\d{2})/);
      return match ? match[1] : '--:--';
    }
    return format === '24h'
      ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
};

const QUICK_REASONS = [
  'Biometric reader sync issue',
  'Manual entry approved by Admin/HR',
  'On duty / client visit offsite',
  'Employee forgot to punch',
  'Work From Home shift adjustment',
];

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

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<DailySheetItem | null>(null);
  const [editForm, setEditForm] = useState<{
    status: string;
    work_type: 'office' | 'wfh';
    check_in_time: string;
    check_out_time: string;
    reason: string;
  }>({
    status: 'present',
    work_type: 'office',
    check_in_time: '09:30',
    check_out_time: '18:30',
    reason: '',
  });

  // Add Attendance Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState<{
    employee_id: string;
    date: string;
    status: string;
    work_type: 'office' | 'wfh';
    check_in_time: string;
    check_out_time: string;
    reason: string;
  }>({
    employee_id: '',
    date: selectedDate,
    status: 'present',
    work_type: 'office',
    check_in_time: '09:30',
    check_out_time: '18:30',
    reason: '',
  });

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { user } = useAuth();
  const canEdit = Boolean(
    user?.permissions?.includes('attendance.edit') ||
    user?.roles?.includes('Admin') ||
    user?.roles?.includes('HR')
  );

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: async () => {
      const res = await axiosClient.get('/departments');
      return res.data.data;
    },
  });

  // Fetch active employees for Add Modal dropdown
  const { data: activeEmployees = [] } = useQuery({
    queryKey: ['employees', 'active_list'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees?limit=200&status=active');
      return res.data?.data || [];
    },
    enabled: canEdit,
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

  // Add Attendance Mutation
  const addMutation = useMutation({
    mutationFn: async () => {
      if (!addForm.employee_id) throw new Error('Please select an employee');
      if (!addForm.date) throw new Error('Please select a date');
      if (addForm.reason.trim().length < 5) throw new Error('Reason must be at least 5 characters');

      const isAbsentOrLeave = ['absent', 'leave', 'holiday', 'weekend'].includes(addForm.status);
      const checkInFull = !isAbsentOrLeave && addForm.check_in_time
        ? `${addForm.date} ${addForm.check_in_time}:00`
        : undefined;
      const checkOutFull = !isAbsentOrLeave && addForm.check_out_time
        ? `${addForm.date} ${addForm.check_out_time}:00`
        : undefined;

      const res = await axiosClient.post('/attendance', {
        employee_id: Number(addForm.employee_id),
        date: addForm.date,
        status: addForm.status,
        work_type: addForm.work_type,
        check_in: checkInFull,
        check_out: checkOutFull,
        reason: addForm.reason,
      });
      return res.data;
    },
    onSuccess: () => {
      success('Attendance record created successfully.');
      setIsAddModalOpen(false);
      setAddForm({
        employee_id: '',
        date: selectedDate,
        status: 'present',
        work_type: 'office',
        check_in_time: '09:30',
        check_out_time: '18:30',
        reason: '',
      });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || err.message || 'Failed to add attendance');
    },
  });

  // Edit / Update Mutation
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem) return;

      const datePart = editingItem.date;
      const isAbsentOrLeave = ['absent', 'leave', 'holiday', 'weekend'].includes(editForm.status);
      const checkInFull = !isAbsentOrLeave && editForm.check_in_time
        ? `${datePart} ${editForm.check_in_time}:00`
        : undefined;
      const checkOutFull = !isAbsentOrLeave && editForm.check_out_time
        ? `${datePart} ${editForm.check_out_time}:00`
        : undefined;

      if (editingItem.attendance_id) {
        // Update existing record
        const res = await axiosClient.put(`/attendance/${editingItem.attendance_id}`, {
          status: editForm.status,
          work_type: editForm.work_type,
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
          work_type: editForm.work_type,
          check_in: checkInFull,
          check_out: checkOutFull,
          reason: editForm.reason,
        });
        return res.data;
      }
    },
    onSuccess: () => {
      success('Attendance updated successfully.');
      setEditingItem(null);
      setDetailItem(null);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to update attendance');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await axiosClient.delete(`/attendance/${id}`);
      return res.data;
    },
    onSuccess: () => {
      success('Attendance record deleted successfully.');
      setDeletingId(null);
      setDetailItem(null);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to delete attendance record');
    },
  });

  const handleOpenEdit = (item: DailySheetItem) => {
    setEditingItem(item);
    const inTime = safeFormatTime(item.check_in, '24h');
    const outTime = safeFormatTime(item.check_out, '24h');

    setEditForm({
      status: item.status,
      work_type: item.work_type || 'office',
      check_in_time: inTime !== '--:--' ? inTime : (['absent', 'leave'].includes(item.status) ? '' : '09:30'),
      check_out_time: outTime !== '--:--' ? outTime : (['absent', 'leave'].includes(item.status) ? '' : '18:30'),
      reason: '',
    });
  };

  const handleOpenMonthlyDayEdit = (emp: any, date: string, dayInfo?: any) => {
    setEditingItem({
      employee_id: emp.employee_id,
      employee_code: emp.employee_code,
      first_name: emp.first_name,
      last_name: emp.last_name,
      department_name: emp.department_name,
      designation_title: '',
      attendance_id: dayInfo?.attendance_id || null,
      date,
      check_in: dayInfo?.check_in || null,
      check_out: dayInfo?.check_out || null,
      status: dayInfo?.status || 'present',
      work_type: dayInfo?.work_type || 'office',
      working_minutes: dayInfo?.working_minutes || 0,
      break_minutes: 0,
      overtime_minutes: 0,
      is_late: Boolean(dayInfo?.is_late),
      is_early_checkout: false,
      remarks: null,
    });
    setEditForm({
      status: dayInfo?.status || 'present',
      work_type: dayInfo?.work_type || 'office',
      check_in_time: dayInfo?.status === 'absent' ? '' : '09:30',
      check_out_time: dayInfo?.status === 'absent' ? '' : '18:30',
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

  return (
    <ErrorBoundary>
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2.5">
              <CalendarDays className="w-7 h-7 text-[#4F46E5]" />
              Attendance Management
            </h1>
            <p className="text-[#64748B] text-sm mt-1">
              Review company attendance sheets, record manual attendance punches, and edit employee records.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Mode Tabs */}
            <div className="bg-[#F1F5F9] p-1 rounded-xl flex text-sm font-medium border border-[#E2E8F0]">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  viewMode === 'daily'
                    ? 'bg-white text-[#4F46E5] shadow-sm font-bold'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                Daily Sheet
              </button>
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-3.5 py-1.5 rounded-lg transition-all ${
                  viewMode === 'monthly'
                    ? 'bg-white text-[#4F46E5] shadow-sm font-bold'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                Monthly Grid
              </button>
            </div>

            {/* Export Excel Button */}
            <Button
              variant="secondary"
              size="md"
              leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
              onClick={() => handleExport('xlsx')}
            >
              Export Excel
            </Button>

            {/* Add Attendance Button (Admin / HR) */}
            {canEdit && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setAddForm({
                    employee_id: '',
                    date: selectedDate,
                    status: 'present',
                    work_type: 'office',
                    check_in_time: '09:30',
                    check_out_time: '18:30',
                    reason: '',
                  });
                  setIsAddModalOpen(true);
                }}
              >
                Add Attendance
              </Button>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {viewMode === 'daily' ? (
              <div className="flex items-center gap-2 text-sm font-medium text-[#475569]">
                <label>Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-medium text-[#475569]">
                <label>Month:</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                />
              </div>
            )}

            <div className="flex items-center gap-2 text-sm font-medium text-[#475569]">
              <label>Department:</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
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
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-[#E2E8F0] rounded-lg text-sm w-48 sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              />
            </div>
          </div>
        </div>

        {/* COMPACT DAILY SHEET TABLE */}
        {viewMode === 'daily' ? (
          <div className="flex gap-6 flex-col lg:flex-row">
            <div className="flex-1 bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F8FAFC] text-xs font-semibold text-[#64748B] border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Work Type</th>
                      <th className="py-3 px-4">Check In</th>
                      <th className="py-3 px-4">Check Out</th>
                      <th className="py-3 px-4">Hours</th>
                      {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-[#475569]">
                    {isLoadingDaily ? (
                      <tr>
                        <td colSpan={canEdit ? 7 : 6} className="text-center py-12 text-[#64748B]">
                          Loading daily attendance sheet...
                        </td>
                      </tr>
                    ) : dailyData?.items?.length === 0 ? (
                      <tr>
                        <td colSpan={canEdit ? 7 : 6} className="text-center py-12 text-[#64748B]">
                          No employee records found for this date.
                        </td>
                      </tr>
                    ) : (
                      dailyData?.items?.map((item: DailySheetItem) => (
                        <tr
                          key={item.employee_id}
                          onClick={() => setDetailItem(item)}
                          className={`hover:bg-[#F8FAFC] cursor-pointer transition-colors ${
                            detailItem?.employee_id === item.employee_id ? 'bg-[#EEF2FF]' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[#0F172A]">
                              {item.first_name} {item.last_name}
                            </div>
                            <div className="text-xs text-[#64748B] font-mono">
                              {item.employee_code} • {item.department_name}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <StatusBadge status={item.status} size="sm" />
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-xs font-medium uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {item.work_type || 'office'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs">
                            {safeFormatTime(item.check_in)}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs">
                            {safeFormatTime(item.check_out)}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                            {item.working_minutes > 0
                              ? `${(item.working_minutes / 60).toFixed(1)} hrs`
                              : '--'}
                          </td>
                          {canEdit && (
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                                  onClick={() => handleOpenEdit(item)}
                                >
                                  Edit
                                </Button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SIDE PANEL DETAILS FOR ROW CLICK */}
            {detailItem && (
              <div className="w-full lg:w-80 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-4 shrink-0 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                    <div>
                      <h3 className="font-bold text-[#0F172A]">
                        {detailItem.first_name} {detailItem.last_name}
                      </h3>
                      <p className="text-xs text-[#64748B] font-mono">
                        {detailItem.employee_code} • {detailItem.department_name}
                      </p>
                    </div>
                    <button
                      onClick={() => setDetailItem(null)}
                      className="p-1 rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs text-[#475569]">
                    <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                      <span>Date:</span>
                      <span className="font-semibold text-[#0F172A]">{detailItem.date}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#F1F5F9] items-center">
                      <span>Status:</span>
                      <StatusBadge status={detailItem.status} size="sm" />
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                      <span>Work Type:</span>
                      <span className="font-semibold uppercase">{detailItem.work_type}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                      <span>Check In:</span>
                      <span className="font-mono font-semibold">
                        {safeFormatTime(detailItem.check_in)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                      <span>Check Out:</span>
                      <span className="font-mono font-semibold">
                        {safeFormatTime(detailItem.check_out)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                      <span>Working Minutes:</span>
                      <span className="font-semibold">{detailItem.working_minutes} mins</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                      <span>Break Minutes:</span>
                      <span className="font-semibold">{detailItem.break_minutes} mins</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                      <span>Overtime Minutes:</span>
                      <span className="font-semibold">{detailItem.overtime_minutes} mins</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
                      <span>Late Arrival:</span>
                      <span className={`font-bold ${detailItem.is_late ? 'text-[#D97706]' : 'text-[#64748B]'}`}>
                        {detailItem.is_late ? 'YES' : 'NO'}
                      </span>
                    </div>
                    {detailItem.remarks && (
                      <div className="py-1">
                        <span className="block text-[#64748B] mb-0.5">Remarks / Reason:</span>
                        <p className="p-2 bg-[#F8FAFC] rounded border text-[#475569]">{detailItem.remarks}</p>
                      </div>
                    )}
                  </div>
                </div>

                {canEdit && (
                  <div className="space-y-2 pt-3 border-t border-[#E2E8F0]">
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenEdit(detailItem)}
                    >
                      Edit Attendance
                    </Button>
                    {detailItem.attendance_id && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
                        leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                        onClick={() => setDeletingId(detailItem.attendance_id)}
                      >
                        Delete Record
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* MONTHLY GRID VIEW */
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-[#475569] bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0]">
              <div className="flex flex-wrap items-center gap-3">
                <span>Legend:</span>
                <StatusBadge status="present" label="P (Present)" size="sm" />
                <StatusBadge status="absent" label="A (Absent)" size="sm" />
                <StatusBadge status="half_day" label="HD (Half Day)" size="sm" />
                <StatusBadge status="leave" label="L (Leave)" size="sm" />
                <StatusBadge status="holiday" label="H (Holiday)" size="sm" />
                <StatusBadge status="weekend" label="W (Weekend)" size="sm" />
              </div>
              {canEdit && (
                <div className="text-indigo-600 font-normal">
                  * Click any day cell in the grid to edit or record attendance.
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#F8FAFC] font-semibold text-[#64748B] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Department</th>
                    {Array.from({ length: monthlyData?.totalDays || 30 }, (_, i) => i + 1).map((d) => (
                      <th key={d} className="py-2 px-1 text-center font-mono">
                        {d}
                      </th>
                    ))}
                    <th className="py-2.5 px-2 text-center bg-[#DCFCE7] text-[#15803D]">P</th>
                    <th className="py-2.5 px-2 text-center bg-[#FEE2E2] text-[#B91C1C]">A</th>
                    <th className="py-2.5 px-2 text-center bg-[#FEF3C7] text-[#B45309]">HD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[#475569]">
                  {isLoadingMonthly ? (
                    <tr>
                      <td colSpan={35} className="text-center py-12 text-[#64748B]">
                        Loading monthly attendance grid...
                      </td>
                    </tr>
                  ) : (
                    monthlyData?.employees?.map((emp: any) => (
                      <tr key={emp.employee_id} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3 font-medium text-[#0F172A] truncate max-w-[140px]">
                          {emp.first_name} {emp.last_name}
                        </td>
                        <td className="py-2.5 px-3 text-[#64748B] truncate max-w-[100px]">
                          {emp.department_name}
                        </td>

                        {Array.from({ length: monthlyData?.totalDays || 30 }, (_, i) => {
                          const dayNum = (i + 1).toString().padStart(2, '0');
                          const dateKey = `${selectedMonth}-${dayNum}`;
                          const dayInfo = emp.days?.[dateKey];
                          const code = dayInfo?.statusCode || '-';

                          return (
                            <td
                              key={dayNum}
                              onClick={() => {
                                if (canEdit) {
                                  handleOpenMonthlyDayEdit(emp, dateKey, dayInfo);
                                }
                              }}
                              className={`text-center p-0.5 ${
                                canEdit ? 'cursor-pointer hover:bg-indigo-50 transition-colors' : ''
                              }`}
                              title={canEdit ? `Click to add/edit attendance for ${emp.first_name} on ${dateKey}` : undefined}
                            >
                              <span className="inline-block">
                                <StatusBadge status={code} label={code} size="sm" showDot={false} />
                              </span>
                            </td>
                          );
                        })}

                        <td className="text-center font-bold text-[#15803D] bg-[#DCFCE7]/40">
                          {emp.totals?.present || 0}
                        </td>
                        <td className="text-center font-bold text-[#B91C1C] bg-[#FEE2E2]/40">
                          {emp.totals?.absent || 0}
                        </td>
                        <td className="text-center font-bold text-[#B45309] bg-[#FEF3C7]/40">
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

        {/* ADD ATTENDANCE MODAL */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Add Employee Attendance"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="p-3 bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg text-xs text-[#3730A3]">
              Administrators and HR managers can manually record daily attendance, shifts, and overrides.
            </div>

            <FormField label="Select Employee" required>
              <select
                value={addForm.employee_id}
                onChange={(e) => setAddForm({ ...addForm, employee_id: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                required
              >
                <option value="">-- Choose Employee --</option>
                {activeEmployees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_code} - {emp.department_name || 'General'})
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Date" required>
                <input
                  type="date"
                  value={addForm.date}
                  onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  required
                />
              </FormField>

              <FormField label="Work Type" required>
                <select
                  value={addForm.work_type}
                  onChange={(e) => setAddForm({ ...addForm, work_type: e.target.value as 'office' | 'wfh' })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                >
                  <option value="office">Office (On-site)</option>
                  <option value="wfh">Work From Home (WFH)</option>
                </select>
              </FormField>
            </div>

            <FormField label="Status" required>
              <select
                value={addForm.status}
                onChange={(e) => {
                  const newStatus = e.target.value;
                  const isOff = ['absent', 'leave', 'holiday', 'weekend'].includes(newStatus);
                  setAddForm({
                    ...addForm,
                    status: newStatus,
                    check_in_time: isOff ? '' : (addForm.check_in_time || '09:30'),
                    check_out_time: isOff ? '' : (addForm.check_out_time || '18:30'),
                  });
                }}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
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

            {!['absent', 'leave', 'holiday', 'weekend'].includes(addForm.status) && (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Check In Time (HH:mm)">
                  <input
                    type="time"
                    value={addForm.check_in_time}
                    onChange={(e) => setAddForm({ ...addForm, check_in_time: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </FormField>

                <FormField label="Check Out Time (HH:mm)">
                  <input
                    type="time"
                    value={addForm.check_out_time}
                    onChange={(e) => setAddForm({ ...addForm, check_out_time: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </FormField>
              </div>
            )}

            <FormField label="Reason for Entry" required>
              <textarea
                rows={2}
                placeholder="e.g. Manual entry authorized by administrator"
                value={addForm.reason}
                onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                required
                minLength={5}
              />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {QUICK_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAddForm({ ...addForm, reason: preset })}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded transition"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </FormField>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={addMutation.isPending}
                disabled={!addForm.employee_id || addForm.reason.trim().length < 5}
              >
                Save Attendance
              </Button>
            </div>
          </form>
        </Modal>

        {/* EDIT ATTENDANCE MODAL */}
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
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs space-y-1 text-[#475569]">
              <div>
                Date: <strong className="text-[#0F172A]">{editingItem?.date}</strong>
              </div>
              <div>
                Employee Code: <strong className="text-[#0F172A]">{editingItem?.employee_code}</strong>
              </div>
              <div className="text-[#4F46E5] font-medium">
                * System will automatically recalculate total working minutes and late/early flags.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Status" required>
                <select
                  value={editForm.status}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    const isOff = ['absent', 'leave', 'holiday', 'weekend'].includes(newStatus);
                    setEditForm({
                      ...editForm,
                      status: newStatus,
                      check_in_time: isOff ? '' : (editForm.check_in_time || '09:30'),
                      check_out_time: isOff ? '' : (editForm.check_out_time || '18:30'),
                    });
                  }}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
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

              <FormField label="Work Type" required>
                <select
                  value={editForm.work_type}
                  onChange={(e) => setEditForm({ ...editForm, work_type: e.target.value as 'office' | 'wfh' })}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                >
                  <option value="office">Office (On-site)</option>
                  <option value="wfh">Work From Home (WFH)</option>
                </select>
              </FormField>
            </div>

            {!['absent', 'leave', 'holiday', 'weekend'].includes(editForm.status) && (
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Check In Time (HH:mm)">
                  <input
                    type="time"
                    value={editForm.check_in_time}
                    onChange={(e) => setEditForm({ ...editForm, check_in_time: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </FormField>

                <FormField label="Check Out Time (HH:mm)">
                  <input
                    type="time"
                    value={editForm.check_out_time}
                    onChange={(e) => setEditForm({ ...editForm, check_out_time: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                  />
                </FormField>
              </div>
            )}

            <FormField label="Required Reason for Adjustment" required>
              <textarea
                rows={3}
                placeholder="e.g. Biometric reader sync failure, verified by supervisor."
                value={editForm.reason}
                onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                required
                minLength={5}
              />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {QUICK_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, reason: preset })}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded transition"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </FormField>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
              <Button variant="secondary" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={editMutation.isPending}
                disabled={editForm.reason.trim().length < 5}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>

        {/* DELETE CONFIRMATION DIALOG */}
        <ConfirmDialog
          isOpen={Boolean(deletingId)}
          onClose={() => setDeletingId(null)}
          onConfirm={() => {
            if (deletingId) {
              deleteMutation.mutate(deletingId);
            }
          }}
          title="Delete Attendance Record"
          message="Are you sure you want to delete this attendance record? This will remove the punches and recalculate the day status as absent/unmarked."
          confirmText="Delete Record"
          variant="danger"
          isLoading={deleteMutation.isPending}
        />
      </div>
    </ErrorBoundary>
  );
};

export default AttendanceSheetPage;
