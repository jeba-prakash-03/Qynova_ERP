import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Modal } from '../../../shared/components/Modal';
import { FormField } from '../../../shared/components/FormField';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Button } from '../../../shared/components/Button';
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

  // 4. Fetch Employees for allocation dropdown (active, non-relieved only)
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['employees', 'active-allocation'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees?limit=200&status=active');
      const list: any[] = res.data.data || [];
      return list.filter((e) => e.status === 'active' && e.lifecycle_stage !== 'relieved');
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
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
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
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
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
          <h1 className="text-2xl font-bold text-[#26301f] font-display flex items-center gap-2.5">
            <CheckSquare className="w-7 h-7 text-[#14776b]" />
            Leave Approvals & Team Calendar
          </h1>
          <p className="text-sm text-[#6b7663] mt-1">
            Review pending employee leave requests, view department absence schedules, and manage quotas.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-[#dbe2d5] p-1.5 rounded-[18px] text-sm font-medium border border-[rgba(76,91,70,0.18)] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.12)]">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[12px] transition-all ${
              activeTab === 'pending'
                ? 'bg-[#14776b] text-white shadow-[2px_3px_6px_rgba(20,119,107,0.35)] font-semibold'
                : 'text-[#35422d] hover:text-[#26301f] hover:bg-[#d5ded0]/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            Pending Approvals
            {pendingRequests.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs font-bold bg-[#cf9b34] text-[#26301f]">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[12px] transition-all ${
              activeTab === 'calendar'
                ? 'bg-[#14776b] text-white shadow-[2px_3px_6px_rgba(20,119,107,0.35)] font-semibold'
                : 'text-[#35422d] hover:text-[#26301f] hover:bg-[#d5ded0]/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Team Calendar
          </button>
          {isAdminOrHr && (
            <button
              onClick={() => setActiveTab('allocation')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[12px] transition-all ${
                activeTab === 'allocation'
                  ? 'bg-[#14776b] text-white shadow-[2px_3px_6px_rgba(20,119,107,0.35)] font-semibold'
                  : 'text-[#35422d] hover:text-[#26301f] hover:bg-[#d5ded0]/60'
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
        <div className="bg-[#e2e8dc] rounded-[24px] border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] overflow-hidden">
          <div className="p-4 border-b border-[rgba(76,91,70,0.14)] bg-[#dbe2d5]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#6b7663] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee, department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.12)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              />
            </div>
            <div className="text-xs text-[#6b7663] font-medium tabular-nums">
              Showing {filteredPending.length} of {pendingRequests.length} pending request(s)
            </div>
          </div>

          {pendingLoading ? (
            <div className="p-12 text-center text-[#6b7663]">Loading pending requests...</div>
          ) : filteredPending.length === 0 ? (
            <div className="p-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-[#3f8f4a] mx-auto mb-3" />
              <h3 className="text-base font-semibold text-[#26301f] font-display">Inbox Zero!</h3>
              <p className="text-xs text-[#6b7663] mt-1">
                There are no pending leave requests requiring your review at this time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#dbe2d5] text-xs font-semibold text-[#26301f] border-b border-[rgba(76,91,70,0.14)] font-display">
                  <tr>
                    <th className="py-3 px-4 font-display">Employee</th>
                    <th className="py-3 px-4 font-display">Leave Type</th>
                    <th className="py-3 px-4 font-display">Dates</th>
                    <th className="py-3 px-4 text-center font-display">Working Days</th>
                    <th className="py-3 px-4 font-display">Reason</th>
                    <th className="py-3 px-4 font-display">Applied On</th>
                    <th className="py-3 px-4 text-right font-display">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(76,91,70,0.10)] text-[#35422d]">
                  {filteredPending.map((req) => (
                    <tr key={req.id} className="hover:bg-[#dbe2d5]/60 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[#26301f]">
                        <div className="font-display">{req.employee_name}</div>
                        <div className="text-xs text-[#6b7663] font-normal">
                          {req.employee_code} • {req.department_name || 'No Department'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-[#26301f]">
                          <span className="font-display">{req.leave_type_name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[6px] bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.14)]">
                            {req.leave_type_code}
                          </span>
                        </div>
                        {req.is_half_day && (
                          <div className="text-[11px] text-[#cf9b34] font-medium">
                            Half Day ({req.half_day_session || 'first'} half)
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs tabular-nums">
                        {req.from_date === req.to_date
                          ? req.from_date
                          : `${req.from_date} to ${req.to_date}`}
                      </td>
                      <td className="py-3.5 px-4 text-center tabular-nums">
                        <span className="font-semibold text-[#26301f]">{req.days}</span>{' '}
                        <span className="text-xs text-[#6b7663]">day(s)</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-[#35422d]" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#6b7663] tabular-nums">
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => openApproveModal(req)}
                          >
                            Review & Approve
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setRejectTarget(req);
                              setRejectNote('');
                            }}
                          >
                            Reject
                          </Button>
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
        <div className="bg-[#e2e8dc] rounded-[24px] border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[rgba(76,91,70,0.14)]">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#14776b]" />
              <h2 className="font-semibold text-[#26301f] font-display">
                Approved Leaves for {calendarMonth}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-mono text-sm font-semibold px-2 text-[#26301f] tabular-nums">{calendarMonth}</span>
              <Button variant="secondary" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {calendarLoading ? (
            <div className="p-12 text-center text-[#6b7663]">Loading leave schedule...</div>
          ) : calendarLeaves.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-10 h-10 text-[#6b7663] mx-auto mb-2" />
              <p className="text-sm text-[#35422d] font-medium font-display">
                No approved leaves scheduled in {calendarMonth}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {calendarLeaves.map((l) => (
                <div
                  key={l.id}
                  className="p-3.5 rounded-[18px] border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] hover:bg-[#d8e0d1] shadow-[4px_5px_12px_rgba(88,104,84,0.15),-3px_-3px_9px_rgba(255,255,255,0.65)] transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#26301f] font-display">{l.employee_name}</span>
                    <StatusBadge status="leave" label={l.leave_type_code} size="sm" />
                  </div>
                  <div className="text-xs text-[#6b7663]">
                    {l.employee_code} • {l.department_name || 'General'}
                  </div>
                  <div className="text-xs font-mono font-medium text-[#35422d] pt-1 tabular-nums">
                    {l.from_date === l.to_date ? l.from_date : `${l.from_date} → ${l.to_date}`} (
                    {l.days} day)
                  </div>
                  {l.reason && (
                    <div className="text-xs text-[#6b7663] italic truncate" title={l.reason}>
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
        <div className="bg-[#e2e8dc] rounded-[24px] border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] p-6 max-w-2xl space-y-5">
          <div>
            <h2 className="text-lg font-bold text-[#26301f] font-display flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#14776b]" />
              Yearly Leave Quota Allocation
            </h2>
            <p className="text-xs text-[#6b7663] mt-1">
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
                  className="w-full px-3 py-2 border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] rounded-[14px] text-sm shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
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
                  className="w-full px-3 py-2 border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] rounded-[14px] text-sm shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
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
                className="w-full px-3 py-2 border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] rounded-[14px] text-sm shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
                required
              />
            </FormField>

            <div className="p-3 bg-[#dbe2d5]/60 rounded-[16px] border border-[rgba(76,91,70,0.14)] space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-[#26301f]">
                <input
                  type="checkbox"
                  checked={allocationForm.allocate_all}
                  onChange={(e) =>
                    setAllocationForm({ ...allocationForm, allocate_all: e.target.checked })
                  }
                  className="rounded text-[#14776b] focus:ring-[#14776b]"
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
                    className="w-full px-3 py-2 border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] rounded-[14px] text-sm shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
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
              <Button
                type="submit"
                variant="primary"
                isLoading={allocateMutation.isPending}
              >
                Confirm Quota Allocation
              </Button>
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
          <p className="text-sm text-[#35422d]">
            Reviewing request for <strong className="text-[#26301f] font-display">{approveTarget?.employee_name}</strong> for{' '}
            <strong className="text-[#26301f]">{approveTarget?.days} day(s)</strong> of {approveTarget?.leave_type_name} (
            {approveTarget?.from_date} to {approveTarget?.to_date}).
          </p>

          <div className="space-y-2 border border-[rgba(76,91,70,0.18)] rounded-[16px] p-3 bg-[#dbe2d5] max-h-60 overflow-y-auto shadow-[inset_1px_2px_4px_rgba(104,118,100,0.10)]">
            <div className="flex items-center justify-between text-xs font-semibold text-[#26301f] pb-1 border-b border-[rgba(76,91,70,0.14)]">
              <span>Select days to APPROVE (untick to reject day)</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const m: Record<string, boolean> = {};
                    Object.keys(selectedDates).forEach((k) => (m[k] = true));
                    setSelectedDates(m);
                  }}
                  className="text-[#14776b] hover:underline text-[11px] font-bold"
                >
                  Select All
                </button>
                <span className="text-[#6b7663]">|</span>
                <button
                  type="button"
                  onClick={() => {
                    const m: Record<string, boolean> = {};
                    Object.keys(selectedDates).forEach((k) => (m[k] = false));
                    setSelectedDates(m);
                  }}
                  className="text-[#c4643f] hover:underline text-[11px] font-bold"
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
                    className={`p-2.5 rounded-[12px] border text-xs transition-colors ${
                      isChecked
                        ? 'bg-[#3f8f4a]/15 border-[#3f8f4a]/30 text-[#26301f]'
                        : 'bg-[#c4643f]/15 border-[#c4643f]/30 text-[#26301f]'
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
                          className="rounded text-[#14776b] focus:ring-[#14776b]"
                        />
                        <span className="font-mono tabular-nums">{day.date}</span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-[6px] bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.14)]">
                          {day.day_type.replace('_', ' ')}
                        </span>
                        {day.from_time && day.to_time && (
                          <span className="text-[#6b7663] text-[11px] tabular-nums">
                            ({day.from_time} - {day.to_time})
                          </span>
                        )}
                      </label>
                      <StatusBadge status={isChecked ? 'approved' : 'rejected'} size="sm" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-2 text-xs text-[#6b7663]">
                Single day request for date <span className="font-mono font-semibold tabular-nums">{approveTarget?.from_date}</span>
              </div>
            )}
          </div>

          {Object.values(selectedDates).some((v) => !v) && (
            <div className="flex items-center gap-2 p-3 bg-[#cf9b34]/15 border border-[#cf9b34]/30 rounded-[14px] text-[#26301f] text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#cf9b34]" />
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
              className="w-full px-3 py-2 border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] rounded-[14px] text-sm shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              required={Object.values(selectedDates).some((v) => !v)}
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(76,91,70,0.14)]">
            <Button variant="secondary" onClick={() => setApproveTarget(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={approveMutation.isPending}
              disabled={Object.values(selectedDates).some((v) => !v) && !approvalNote.trim()}
            >
              Confirm Decision
            </Button>
          </div>
        </form>
      </Modal>

      {/* REJECT MODAL */}
      <Modal
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title={`Reject Leave Request: ${rejectTarget?.employee_name}`}
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <FormField label="Mandatory Reason for Rejection" required>
            <textarea
              rows={3}
              placeholder="State clear rationale for rejecting this request..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              className="w-full px-3 py-2 border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] rounded-[14px] text-sm shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              required
              minLength={5}
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(76,91,70,0.14)]">
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              isLoading={rejectMutation.isPending}
              disabled={!rejectNote.trim()}
            >
              Reject Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LeaveApprovalsPage;
