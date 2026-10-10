import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Modal } from '../../../shared/components/Modal';
import { FormField } from '../../../shared/components/FormField';
import { Can } from '../../../shared/components/Can';
import { useToast } from '../../../shared/context/ToastContext';
import { useAuth } from '../../../shared/context/AuthContext';
import {
  CalendarDays,
  Search,
  Filter,
  Download,
  Edit2,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  FileSpreadsheet,
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

  // Edit / Manual Entry Modal State
  const [editingItem, setEditingItem] = useState<DailySheetItem | null>(null);
  const [editForm, setEditForm] = useState<{
    status: string;
    check_in_time: string;
    check_out_time: string;
    work_type: 'office' | 'wfh';
    reason: string;
  }>({
    status: 'present',
    check_in_time: '09:30',
    check_out_time: '18:30',
    work_type: 'office',
    reason: '',
  });

  const queryClient = useQueryClient();
  const { success, error } = useToast();
  const { user } = useAuth();
  const canEdit = user?.permissions.includes('attendance.edit') || user?.roles.includes('Admin');

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
          work_type: editForm.work_type,
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
          work_type: editForm.work_type,
          reason: editForm.reason,
        });
        return res.data;
      }
    },
    onSuccess: () => {
      success('Attendance updated and audit log recorded.');
      setEditingItem(null);
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
      work_type: item.work_type || 'office',
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
        return <span className="badge badge-success">PRESENT</span>;
      case 'wfh':
        return <span className="badge badge-info">WFH</span>;
      case 'half_day':
        return <span className="badge badge-warning">HALF DAY</span>;
      case 'absent':
        return <span className="badge badge-danger">ABSENT</span>;
      case 'holiday':
        return <span className="badge bg-purple-100 text-purple-800 border-purple-200">HOLIDAY</span>;
      case 'weekend':
        return <span className="badge bg-gray-100 text-gray-700 border-gray-200">WEEKEND</span>;
      case 'leave':
        return <span className="badge bg-cyan-100 text-cyan-800 border-cyan-200">LEAVE</span>;
      default:
        return <span className="badge badge-gray">{status.toUpperCase()}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-indigo-600" />
            Attendance Management Sheet
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Review organizational attendance, inspect biometric punches, and generate reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Tabs */}
          <div className="bg-gray-100 p-1 rounded-lg flex text-sm font-medium">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'daily'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Daily Sheet
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Monthly Matrix
            </button>
          </div>

          {/* Export Dropdown */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleExport('xlsx')}
              className="btn btn-secondary text-sm flex items-center gap-1.5"
              title="Export Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="btn btn-secondary text-sm flex items-center gap-1.5"
              title="Export CSV"
            >
              <Download className="w-4 h-4 text-gray-600" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'daily' ? (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input py-1.5 text-sm"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="input py-1.5 text-sm"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Department:</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="input py-1.5 text-sm"
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
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 py-1.5 text-sm w-48 sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Badges for Daily Mode */}
      {viewMode === 'daily' && dailyData?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="card p-3 text-center border-l-4 border-l-gray-400">
            <span className="text-xs text-gray-500 block">Total Headcount</span>
            <span className="text-xl font-bold text-gray-900">{dailyData.summary.total}</span>
          </div>
          <div className="card p-3 text-center border-l-4 border-l-emerald-500">
            <span className="text-xs text-gray-500 block">Present</span>
            <span className="text-xl font-bold text-emerald-600">{dailyData.summary.present}</span>
          </div>
          <div className="card p-3 text-center border-l-4 border-l-blue-500">
            <span className="text-xs text-gray-500 block">WFH</span>
            <span className="text-xl font-bold text-blue-600">{dailyData.summary.wfh}</span>
          </div>
          <div className="card p-3 text-center border-l-4 border-l-amber-500">
            <span className="text-xs text-gray-500 block">Half Day</span>
            <span className="text-xl font-bold text-amber-600">{dailyData.summary.half_day}</span>
          </div>
          <div className="card p-3 text-center border-l-4 border-l-rose-500">
            <span className="text-xs text-gray-500 block">Absent</span>
            <span className="text-xl font-bold text-rose-600">{dailyData.summary.absent}</span>
          </div>
          <div className="card p-3 text-center border-l-4 border-l-purple-500">
            <span className="text-xs text-gray-500 block">Holiday</span>
            <span className="text-xl font-bold text-purple-600">{dailyData.summary.holiday}</span>
          </div>
          <div className="card p-3 text-center border-l-4 border-l-gray-300">
            <span className="text-xs text-gray-500 block">Weekend</span>
            <span className="text-xl font-bold text-gray-600">{dailyData.summary.weekend}</span>
          </div>
        </div>
      )}

      {/* Main Content Table */}
      {viewMode === 'daily' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department & Role</th>
                  <th>Status</th>
                  <th>Work Type</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Working Hours</th>
                  <th>Flags</th>
                  {canEdit && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {isLoadingDaily ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">
                      Loading daily sheet...
                    </td>
                  </tr>
                ) : dailyData?.items?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">
                      No employee records found for this date.
                    </td>
                  </tr>
                ) : (
                  dailyData?.items?.map((item: DailySheetItem) => (
                    <tr key={item.employee_id}>
                      <td>
                        <div className="font-medium text-gray-900">
                          {item.first_name} {item.last_name}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">{item.employee_code}</div>
                      </td>
                      <td>
                        <div className="text-sm text-gray-800">{item.department_name}</div>
                        <div className="text-xs text-gray-400">{item.designation_title}</div>
                      </td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td>
                        <span className="text-xs font-semibold uppercase text-gray-600">
                          {item.work_type}
                        </span>
                      </td>
                      <td>
                        {item.check_in ? (
                          <span className="text-sm font-mono text-gray-800">
                            {new Date(item.check_in).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">--</span>
                        )}
                      </td>
                      <td>
                        {item.check_out ? (
                          <span className="text-sm font-mono text-gray-800">
                            {new Date(item.check_out).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">--</span>
                        )}
                      </td>
                      <td>
                        {item.working_minutes > 0 ? (
                          <div className="text-sm font-medium text-gray-900">
                            {(item.working_minutes / 60).toFixed(1)} hrs
                            {item.overtime_minutes > 0 && (
                              <span className="text-xs text-blue-600 font-semibold ml-1">
                                (+{(item.overtime_minutes / 60).toFixed(1)} OT)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">--</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          {item.is_late && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                              title="Late Arrival"
                            >
                              LATE
                            </span>
                          )}
                          {item.is_early_checkout && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200"
                              title="Early Departure"
                            >
                              EARLY
                            </span>
                          )}
                          {!item.is_late && !item.is_early_checkout && (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      {canEdit && (
                        <td className="text-right">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Edit Attendance"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Monthly Matrix View */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-gray-50 z-10">Employee</th>
                  <th className="sticky left-36 bg-gray-50 z-10">Dept</th>
                  {Array.from({ length: monthlyData?.totalDays || 30 }, (_, i) => i + 1).map((d) => (
                    <th key={d} className="text-center px-1 font-mono min-w-[28px]">
                      {d}
                    </th>
                  ))}
                  <th className="text-center bg-emerald-50 text-emerald-800">P</th>
                  <th className="text-center bg-rose-50 text-rose-800">A</th>
                  <th className="text-center bg-amber-50 text-amber-800">HD</th>
                  <th className="text-center bg-indigo-50 text-indigo-800">Hrs</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingMonthly ? (
                  <tr>
                    <td colSpan={36} className="text-center py-12 text-gray-400">
                      Loading monthly matrix...
                    </td>
                  </tr>
                ) : (
                  monthlyData?.employees?.map((emp: any) => (
                    <tr key={emp.employee_id} className="hover:bg-gray-50">
                      <td className="sticky left-0 bg-white font-medium text-gray-900 truncate max-w-[140px] z-10">
                        {emp.first_name} {emp.last_name}
                      </td>
                      <td className="sticky left-36 bg-white text-gray-500 truncate max-w-[100px] z-10">
                        {emp.department_name}
                      </td>

                      {Array.from({ length: monthlyData.totalDays }, (_, i) => {
                        const dayNum = (i + 1).toString().padStart(2, '0');
                        const dateKey = `${selectedMonth}-${dayNum}`;
                        const dayInfo = emp.days[dateKey];
                        const code = dayInfo?.statusCode || '-';

                        let colorClass = 'text-gray-300';
                        if (code === 'P') colorClass = 'bg-emerald-100 text-emerald-800 font-bold';
                        else if (code === 'WFH') colorClass = 'bg-blue-100 text-blue-800 font-bold';
                        else if (code === 'HD') colorClass = 'bg-amber-100 text-amber-800 font-bold';
                        else if (code === 'A') colorClass = 'bg-rose-100 text-rose-800 font-bold';
                        else if (code === 'H') colorClass = 'bg-purple-100 text-purple-800';
                        else if (code === 'W') colorClass = 'bg-gray-100 text-gray-500';

                        return (
                          <td key={dayNum} className="text-center p-0.5">
                            <span className={`inline-block w-6 py-0.5 rounded text-[10px] ${colorClass}`}>
                              {code}
                            </span>
                          </td>
                        );
                      })}

                      <td className="text-center font-bold text-emerald-700 bg-emerald-50/50">
                        {emp.totals.present}
                      </td>
                      <td className="text-center font-bold text-rose-700 bg-rose-50/50">
                        {emp.totals.absent}
                      </td>
                      <td className="text-center font-bold text-amber-700 bg-amber-50/50">
                        {emp.totals.half_day}
                      </td>
                      <td className="text-center font-bold text-indigo-700 bg-indigo-50/50">
                        {(emp.totals.total_working_minutes / 60).toFixed(1)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit / Manual Attendance Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title={`Adjust Attendance: ${editingItem?.first_name} ${editingItem?.last_name}`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            editMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1 text-gray-600">
            <div>
              Date: <strong className="text-gray-900">{editingItem?.date}</strong>
            </div>
            <div>
              Employee Code:{' '}
              <strong className="text-gray-900">{editingItem?.employee_code}</strong>
            </div>
            <div className="text-indigo-600">
              * Any change will recalculate working hours, late status, and write an immutable audit log.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Status" required>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="input"
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

            <FormField label="Work Type">
              <select
                value={editForm.work_type}
                onChange={(e) =>
                  setEditForm({ ...editForm, work_type: e.target.value as 'office' | 'wfh' })
                }
                className="input"
              >
                <option value="office">Office</option>
                <option value="wfh">Work From Home</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Check In Time (HH:mm)">
              <input
                type="time"
                value={editForm.check_in_time}
                onChange={(e) => setEditForm({ ...editForm, check_in_time: e.target.value })}
                className="input"
              />
            </FormField>

            <FormField label="Check Out Time (HH:mm)">
              <input
                type="time"
                value={editForm.check_out_time}
                onChange={(e) => setEditForm({ ...editForm, check_out_time: e.target.value })}
                className="input"
              />
            </FormField>
          </div>

          <FormField label="Mandatory Reason for Adjustment" required>
            <textarea
              rows={3}
              placeholder="e.g. Biometric reader was offline, employee worked full day from office verified by manager."
              value={editForm.reason}
              onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
              className="input"
              required
              minLength={5}
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editMutation.isPending || editForm.reason.length < 5}
              className="btn btn-primary"
            >
              {editMutation.isPending ? 'Saving...' : 'Save & Record Audit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
