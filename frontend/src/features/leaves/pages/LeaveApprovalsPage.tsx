import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Modal } from '../../../shared/components/Modal';
import { FormField } from '../../../shared/components/FormField';
import { useToast } from '../../../shared/context/ToastContext';
import { useAuth } from '../../../shared/context/AuthContext';
import {
  CheckSquare,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Home,
  AlertCircle,
} from 'lucide-react';

interface LeaveRequestDay {
  id: number;
  leave_request_id: number;
  date: string;
  day_type: 'full' | 'first_half' | 'second_half';
  from_time?: string | null;
  to_time?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  decision_note?: string | null;
}

interface LeaveRequest {
  id: number;
  employee_id: number;
  leave_type_id: number;
  from_date: string;
  to_date: string;
  is_half_day: boolean;
  half_day_session?: string | null;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'partially_approved' | 'rejected' | 'cancelled';
  employee_name: string;
  employee_code: string;
  department_name?: string | null;
  leave_type_name: string;
  leave_type_code: string;
  created_at: string;
  day_rows?: LeaveRequestDay[];
}

interface LeaveType {
  id: number;
  name: string;
  code: string;
  yearly_quota: number;
}

interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  department_name?: string | null;
}

export const LeaveApprovalsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error, info } = useToast();
  const { user } = useAuth();
  const isAdminOrHr =
    user?.roles?.includes('admin') ||
    user?.roles?.includes('hr') ||
    user?.permissions?.includes('leave.approve');

  // Tabs: 'pending' | 'calendar' | 'allocation'
  const [activeTab, setActiveTab] = useState<'pending' | 'calendar' | 'allocation'>('pending');

  // Pending search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Calendar State
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Action Modals State
  const [approveTarget, setApproveTarget] = useState<LeaveRequest | null>(null);
  const [selectedDates, setSelectedDates] = useState<Record<string, boolean>>({});
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({});
  const [approvalNote, setApprovalNote] = useState('');

  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  // Allocation Form State (HR/Admin)
  const [allocationForm, setAllocationForm] = useState<{
    year: number;
    leave_type_id: number | '';
    allocated: number;
    allocate_all: boolean;
    employee_id: number | '';
  }>({
    year: new Date().getFullYear(),
    leave_type_id: '',
    allocated: 12,
    allocate_all: true,
    employee_id: '',
  });

  // 1. Fetch Pending Requests
  const { data: pendingRequests = [], isLoading: pendingLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['leave-requests', 'pending'],
    queryFn: async () => {
      const res = await axiosClient.get('/leave-requests/pending');
      return res.data.data;
    },
  });

  // 2. Fetch Team Calendar Leaves
  const { data: calendarLeaves = [], isLoading: calendarLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['leave-requests', 'calendar', calendarMonth],
    queryFn: async () => {
      const res = await axiosClient.get(`/leave-requests/calendar?month=${calendarMonth}`);
      return res.data.data;
    },
    enabled: activeTab === 'calendar',
  });

  // 3. Fetch Leave Types
  const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const res = await axiosClient.get('/leave-types');
      return res.data.data;
    },
  });

  // 4. Fetch Employees for allocation dropdown
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees', 'active-list'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees?limit=200');
      return res.data.data;
    },
    enabled: isAdminOrHr && activeTab === 'allocation',
  });

  // Approve / Partial Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async ({
      id,
      approved_dates,
      rejected_dates,
      day_notes,
      decision_note,
    }: {
      id: number;
      approved_dates?: string[];
      rejected_dates?: string[];
      day_notes?: Record<string, string>;
      decision_note?: string;
    }) => {
      const res = await axiosClient.patch(`/leave-requests/${id}/approve`, {
        approved_dates,
        rejected_dates,
        day_notes,
        decision_note,
      });
      return res.data.data;
    },
    onSuccess: () => {
      success('Leave request decision processed successfully!');
      setApproveTarget(null);
      setApprovalNote('');
      setSelectedDates({});
      setDayNotes({});
      queryClient.invalidateQueries({ queryKey: ['leave-requests', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests', 'calendar'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to approve leave request');
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string }) => {
      const res = await axiosClient.patch(`/leave-requests/${id}/reject`, {
        decision_note: note,
      });
      return res.data.data;
    },
    onSuccess: () => {
      info('Leave request rejected');
      setRejectTarget(null);
      setRejectNote('');
      queryClient.invalidateQueries({ queryKey: ['leave-requests', 'pending'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to reject leave request');
    },
  });

  // Allocate Quota Mutation
  const allocateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await axiosClient.post('/leave-balances/allocate', payload);
      return res.data.data;
    },
    onSuccess: (data: any) => {
      success(`Quota allocated successfully to ${data.affectedEmployees} employee(s)!`);
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to allocate quota');
    },
  });

  const openApproveModal = (req: LeaveRequest) => {
    setApproveTarget(req);
    setApprovalNote('');
    setDayNotes({});
    const initialMap: Record<string, boolean> = {};
    if (req.day_rows && req.day_rows.length > 0) {
      req.day_rows.forEach((d) => {
        initialMap[d.date] = true;
      });
    } else {
      initialMap[req.from_date] = true;
    }
    setSelectedDates(initialMap);
  };

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveTarget) return;

    const dates = Object.keys(selectedDates);
    const approved_dates = dates.filter((d) => selectedDates[d]);
    const rejected_dates = dates.filter((d) => !selectedDates[d]);

    if (rejected_dates.length > 0 && !approvalNote.trim()) {
      error('Decision note is mandatory when unticking/rejecting any requested days.');
      return;
    }

    approveMutation.mutate({
      id: approveTarget.id,
      approved_dates,
      rejected_dates,
      day_notes: dayNotes,
      decision_note: approvalNote,
    });
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    if (!rejectNote.trim()) {
      error('Decision note is mandatory when rejecting a leave request');
      return;
    }
    rejectMutation.mutate({ id: rejectTarget.id, note: rejectNote.trim() });
  };

  const handleAllocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocationForm.leave_type_id) {
      error('Please select a leave type');
      return;
    }
    if (!allocationForm.allocate_all && !allocationForm.employee_id) {
      error('Please select an employee or toggle allocate to all');
      return;
    }

    allocateMutation.mutate({
      year: allocationForm.year,
      leave_type_id: Number(allocationForm.leave_type_id),
      allocated: Number(allocationForm.allocated),
      allocate_all: allocationForm.allocate_all,
      employee_id: allocationForm.allocate_all ? undefined : Number(allocationForm.employee_id),
    });
  };

  const filteredPending = pendingRequests.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.employee_name?.toLowerCase().includes(term) ||
      r.employee_code?.toLowerCase().includes(term) ||
      r.department_name?.toLowerCase().includes(term) ||
      r.leave_type_name?.toLowerCase().includes(term)
    );
  });

  // Month navigation for Calendar
  const handlePrevMonth = () => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    setCalendarMonth(
      `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
    );
  };

  const handleNextMonth = () => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const next = new Date(y, m, 1);
    setCalendarMonth(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <CheckSquare className="w-7 h-7 text-indigo-600" />
            Leave Approvals & Team Calendar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review pending employee leave requests, view department absence schedules, and manage quotas.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-sm font-medium">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'pending'
                ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending Approvals
            {pendingRequests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs font-bold bg-amber-500 text-white">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'calendar'
                ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Team Calendar
          </button>
          {isAdminOrHr && (
            <button
              onClick={() => setActiveTab('allocation')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'allocation'
                  ? 'bg-white text-indigo-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-4 h-4" />
              Quota Allocation
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: PENDING APPROVALS */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee, department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing {filteredPending.length} of {pendingRequests.length} pending request(s)
            </div>
          </div>

          {pendingLoading ? (
            <div className="p-12 text-center text-slate-500">Loading pending requests...</div>
          ) : filteredPending.length === 0 ? (
            <div className="p-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">Inbox Zero!</h3>
              <p className="text-xs text-slate-400 mt-1">
                There are no pending leave requests requiring your review at this time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-xs font-semibold text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Dates</th>
                    <th className="py-3 px-4 text-center">Working Days</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Applied On</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredPending.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div>{req.employee_name}</div>
                        <div className="text-xs text-slate-400 font-normal">
                          {req.employee_code} • {req.department_name || 'No Department'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-900">
                          <span>{req.leave_type_name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {req.leave_type_code}
                          </span>
                        </div>
                        {req.is_half_day && (
                          <div className="text-[11px] text-amber-600 font-medium">
                            Half Day ({req.half_day_session || 'first'} half)
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        {req.from_date === req.to_date
                          ? req.from_date
                          : `${req.from_date} to ${req.to_date}`}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-slate-900">{req.days}</span>{' '}
                        <span className="text-xs text-slate-500">day(s)</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openApproveModal(req)}
                            className="px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                          >
                            Review & Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectTarget(req);
                              setRejectNote('');
                            }}
                            className="px-3 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TEAM LEAVE CALENDAR */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h2 className="font-semibold text-slate-900">
                Approved Leaves for {calendarMonth}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-sm font-semibold px-2">{calendarMonth}</span>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {calendarLoading ? (
            <div className="p-12 text-center text-slate-500">Loading leave schedule...</div>
          ) : calendarLeaves.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-600 font-medium">
                No approved leaves scheduled in {calendarMonth}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {calendarLeaves.map((l) => (
                <div
                  key={l.id}
                  className="p-3.5 rounded-lg border border-slate-200/90 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-900">{l.employee_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {l.leave_type_code}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {l.employee_code} • {l.department_name || 'General'}
                  </div>
                  <div className="text-xs font-mono font-medium text-slate-700 pt-1">
                    {l.from_date === l.to_date ? l.from_date : `${l.from_date} → ${l.to_date}`} (
                    {l.days} day)
                  </div>
                  {l.reason && (
                    <div className="text-xs text-slate-500 italic truncate" title={l.reason}>
                      "{l.reason}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: QUOTA ALLOCATION (ADMIN / HR) */}
      {isAdminOrHr && activeTab === 'allocation' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 max-w-2xl space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              Yearly Leave Quota Allocation
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Allocate or update yearly leave balances for all employees or individually.
            </p>
          </div>

          <form onSubmit={handleAllocationSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Target Year" required>
                <input
                  type="number"
                  min={2020}
                  max={2050}
                  value={allocationForm.year}
                  onChange={(e) =>
                    setAllocationForm({ ...allocationForm, year: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </FormField>

              <FormField label="Leave Type" required>
                <select
                  value={allocationForm.leave_type_id}
                  onChange={(e) =>
                    setAllocationForm({
                      ...allocationForm,
                      leave_type_id: e.target.value ? Number(e.target.value) : '',
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Select Leave Type --</option>
                  {leaveTypes.map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} ({lt.code}) — Default: {lt.yearly_quota}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Yearly Quota (Days)" required>
              <input
                type="number"
                step="0.5"
                min="0"
                value={allocationForm.allocated}
                onChange={(e) =>
                  setAllocationForm({ ...allocationForm, allocated: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </FormField>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={allocationForm.allocate_all}
                  onChange={(e) =>
                    setAllocationForm({ ...allocationForm, allocate_all: e.target.checked })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Allocate to ALL Active Employees
              </label>

              {!allocationForm.allocate_all && (
                <FormField label="Select Specific Employee" required>
                  <select
                    value={allocationForm.employee_id}
                    onChange={(e) =>
                      setAllocationForm({
                        ...allocationForm,
                        employee_id: e.target.value ? Number(e.target.value) : '',
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required={!allocationForm.allocate_all}
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_code})
                      </option>
                    ))}
                  </select>
                </FormField>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={allocateMutation.isPending}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {allocateMutation.isPending ? 'Allocating...' : 'Confirm Quota Allocation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* APPROVE / PARTIAL APPROVAL MODAL */}
      <Modal
        isOpen={Boolean(approveTarget)}
        onClose={() => setApproveTarget(null)}
        title="Review Leave Request (Per-Day Decision)"
      >
        <form onSubmit={handleApproveSubmit} className="space-y-4">
          <p className="text-sm text-slate-600">
            Reviewing request for <strong>{approveTarget?.employee_name}</strong> for{' '}
            <strong>{approveTarget?.days} day(s)</strong> of {approveTarget?.leave_type_name} (
            {approveTarget?.from_date} to {approveTarget?.to_date}).
          </p>

          <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50/50 max-h-60 overflow-y-auto">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 pb-1 border-b border-slate-200">
              <span>Select days to APPROVE (untick to reject day)</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const m: Record<string, boolean> = {};
                    Object.keys(selectedDates).forEach((k) => (m[k] = true));
                    setSelectedDates(m);
                  }}
                  className="text-indigo-600 hover:underline text-[11px]"
                >
                  Select All
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={() => {
                    const m: Record<string, boolean> = {};
                    Object.keys(selectedDates).forEach((k) => (m[k] = false));
                    setSelectedDates(m);
                  }}
                  className="text-rose-600 hover:underline text-[11px]"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {approveTarget?.day_rows && approveTarget.day_rows.length > 0 ? (
              approveTarget.day_rows.map((day) => {
                const isChecked = Boolean(selectedDates[day.date]);
                return (
                  <div
                    key={day.id}
                    className={`p-2.5 rounded-lg border text-xs transition-colors ${
                      isChecked
                        ? 'bg-emerald-50/60 border-emerald-200 text-slate-900'
                        : 'bg-rose-50/60 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setSelectedDates({ ...selectedDates, [day.date]: e.target.checked })
                          }
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-mono">{day.date}</span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white text-slate-600 border">
                          {day.day_type.replace('_', ' ')}
                        </span>
                        {day.from_time && day.to_time && (
                          <span className="text-slate-500 text-[11px]">
                            ({day.from_time} - {day.to_time})
                          </span>
                        )}
                      </label>
                      <span className={`font-semibold ${isChecked ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isChecked ? 'Approved' : 'Rejected'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-2 text-xs text-slate-500">
                Single day request for date <span className="font-mono font-semibold">{approveTarget?.from_date}</span>
              </div>
            )}
          </div>

          {Object.values(selectedDates).some((v) => !v) && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              You are unticking 1 or more days. A decision note explaining the partial rejection is required.
            </div>
          )}

          <FormField
            label={
              Object.values(selectedDates).some((v) => !v)
                ? 'Decision / Rejection Note *'
                : 'Decision Note (Optional)'
            }
            required={Object.values(selectedDates).some((v) => !v)}
          >
            <textarea
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder={
                Object.values(selectedDates).some((v) => !v)
                  ? 'Mandatory reason for unticked/rejected days...'
                  : 'e.g. Approved. Coverage handled by team.'
              }
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required={Object.values(selectedDates).some((v) => !v)}
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setApproveTarget(null)}
              className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                approveMutation.isPending ||
                (Object.values(selectedDates).some((v) => !v) && !approvalNote.trim())
              }
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {approveMutation.isPending ? 'Processing...' : 'Submit Decision'}
            </button>
          </div>
        </form>
      </Modal>

      {/* REJECT MODAL (MANDATORY REASON) */}
      <Modal
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="Reject Leave Request"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            A rejection reason is strictly mandatory so the employee understands why it was declined.
          </div>
          <p className="text-sm text-slate-600">
            Rejecting request from <strong>{rejectTarget?.employee_name}</strong> for{' '}
            {rejectTarget?.days} day(s) ({rejectTarget?.from_date} to {rejectTarget?.to_date}).
          </p>
          <FormField label="Rejection Reason" required>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Provide a mandatory reason for declining this request..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            />
          </FormField>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRejectTarget(null)}
              className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={rejectMutation.isPending || !rejectNote.trim()}
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LeaveApprovalsPage;
