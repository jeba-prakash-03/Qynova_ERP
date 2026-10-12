import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { Modal } from '../../../shared/components/Modal';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { FormField } from '../../../shared/components/FormField';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Button } from '../../../shared/components/Button';
import { useToast } from '../../../shared/context/ToastContext';
import { useAuth } from '../../../shared/context/AuthContext';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  X,
  Info,
  Home,
  CheckSquare,
} from 'lucide-react';

interface LeaveType {
  id: number;
  name: string;
  code: string;
  yearly_quota: number;
  is_paid: boolean;
  carry_forward: boolean;
  requires_approval: boolean;
  allow_half_day: boolean;
}

interface LeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  year: number;
  allocated: number;
  used: number;
  pending: number;
  remaining: number;
  leave_type_name: string;
  leave_type_code: string;
  is_paid?: boolean;
}

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
  half_day_session?: 'first' | 'second' | null;
  from_time?: string | null;
  to_time?: string | null;
  days: number;
  approved_days?: number;
  rejected_days?: number;
  reason: string;
  status: 'pending' | 'approved' | 'partially_approved' | 'rejected' | 'cancelled';
  approver_name?: string | null;
  decision_note?: string | null;
  created_at: string;
  leave_type_name: string;
  leave_type_code: string;
  days_breakdown?: LeaveRequestDay[];
}

interface CalculateDaysResponse {
  days: number;
  workingDates: string[];
  holidayDates: string[];
  weekendDates: string[];
}

export const MyLeavesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error, info } = useToast();
  const currentYear = new Date().getFullYear();

  // Modals & action states
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);

  // Apply Form State
  const [formData, setFormData] = useState<{
    leave_type_id: number | '';
    from_date: string;
    to_date: string;
    is_half_day: boolean;
    half_day_session: 'first' | 'second';
    from_time: string;
    to_time: string;
    reason: string;
  }>({
    leave_type_id: '',
    from_date: '',
    to_date: '',
    is_half_day: false,
    half_day_session: 'first',
    from_time: '09:30',
    to_time: '14:00',
    reason: '',
  });

  const [calcPreview, setCalcPreview] = useState<CalculateDaysResponse | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // 1. Fetch Leave Types
  const { data: leaveTypes = [] } = useQuery<LeaveType[]>({
    queryKey: ['leave-types'],
    queryFn: async () => {
      const res = await axiosClient.get('/leave-types');
      return res.data.data;
    },
  });

  // 2. Fetch My Leave Balances
  const { data: myBalances = [], isLoading: balancesLoading } = useQuery<LeaveBalance[]>({
    queryKey: ['leave-balances', 'me', currentYear],
    queryFn: async () => {
      const res = await axiosClient.get(`/leave-balances/me?year=${currentYear}`);
      return res.data.data;
    },
  });

  // 3. Fetch My Leave Requests
  const { data: myRequests = [], isLoading: requestsLoading } = useQuery<LeaveRequest[]>({
    queryKey: ['leave-requests', 'me'],
    queryFn: async () => {
      const res = await axiosClient.get('/leave-requests/me');
      return res.data.data;
    },
  });

  const selectedTypeObj = leaveTypes.find((t) => t.id === Number(formData.leave_type_id));
  const isPermission = selectedTypeObj?.code === 'PERM';

  // Live Working Days Calculation
  useEffect(() => {
    if (!formData.from_date || !formData.to_date) {
      setCalcPreview(null);
      setCalcError(null);
      return;
    }

    if (formData.from_date > formData.to_date) {
      setCalcError('To date cannot be earlier than From date');
      setCalcPreview(null);
      return;
    }

    let isMounted = true;
    setIsCalculating(true);
    setCalcError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await axiosClient.post('/leave-requests/calculate-days', {
          from_date: formData.from_date,
          to_date: formData.to_date,
          is_half_day: formData.is_half_day,
        });
        if (isMounted) {
          setCalcPreview(res.data.data);
          if (res.data.data.days === 0 && !isPermission) {
            setCalcError('Selected date range contains 0 working days (weekends or public holidays).');
          } else {
            setCalcError(null);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setCalcError(err.response?.data?.message || 'Error calculating working days');
          setCalcPreview(null);
        }
      } finally {
        if (isMounted) setIsCalculating(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formData.from_date, formData.to_date, formData.is_half_day, isPermission]);

  // Apply Leave Mutation
  const applyMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await axiosClient.post('/leave-requests', payload);
      return res.data.data;
    },
    onSuccess: () => {
      success('Leave request submitted successfully!');
      setIsApplyModalOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['leave-requests', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances', 'me'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to submit leave request');
    },
  });

  // Cancel Leave Mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await axiosClient.patch(`/leave-requests/${id}/cancel`);
      return res.data.data;
    },
    onSuccess: () => {
      info('Leave request cancelled successfully');
      setCancelTarget(null);
      queryClient.invalidateQueries({ queryKey: ['leave-requests', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances', 'me'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to cancel leave request');
    },
  });

  const resetForm = () => {
    setFormData({
      leave_type_id: '',
      from_date: '',
      to_date: '',
      is_half_day: false,
      half_day_session: 'first',
      from_time: '09:30',
      to_time: '14:00',
      reason: '',
    });
    setCalcPreview(null);
    setCalcError(null);
  };

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.leave_type_id || !formData.from_date || !formData.to_date) {
      error('Please select leave type and date range');
      return;
    }

    if (!isPermission && (calcError || !calcPreview || calcPreview.days <= 0)) {
      error(calcError || 'Invalid working days range');
      return;
    }

    applyMutation.mutate({
      leave_type_id: Number(formData.leave_type_id),
      from_date: formData.from_date,
      to_date: formData.to_date,
      is_half_day: formData.is_half_day,
      half_day_session: formData.is_half_day ? formData.half_day_session : null,
      from_time: formData.is_half_day || isPermission ? formData.from_time : null,
      to_time: formData.is_half_day || isPermission ? formData.to_time : null,
      reason: formData.reason,
    });
  };

  const { user } = useAuth();

  if (!user?.employee) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl border border-[#E2E8F0] shadow-sm max-w-md w-full">
          <div className="w-12 h-12 bg-[#FEF3C7] text-[#D97706] rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#0F172A] mb-1">Employee Profile Required</h2>
          <p className="text-sm text-[#64748B] mb-5">
            Apply Leave & My Leaves module is reserved for users with an active employee record.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-[#4F46E5]" />
            My Leaves & Time Off
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Apply for leave, track quota balances for {currentYear}, and monitor partial approval day status.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            resetForm();
            setIsApplyModalOpen(true);
          }}
        >
          Apply for Leave
        </Button>
      </div>

      {/* Leave Balance Cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[#0F172A]">Available Quotas ({currentYear})</h2>
          <span className="text-xs text-[#64748B] font-medium">Updated in real-time</span>
        </div>

        {balancesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-[#F8FAFC] animate-pulse rounded-xl border border-[#E2E8F0]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {myBalances.map((bal) => {
              const isLop = bal.leave_type_code === 'LOP';
              const remaining = isLop ? '∞' : bal.remaining;

              return (
                <div
                  key={bal.id}
                  className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-4 hover:shadow-md transition-shadow relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#0F172A] text-sm">{bal.leave_type_name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                          {bal.leave_type_code}
                        </span>
                      </div>
                      <span className="text-xs text-[#64748B] mt-0.5 block">
                        {bal.is_paid ? 'Paid Time Off' : 'Unpaid Leave'}
                      </span>
                    </div>
                    <Calendar className="w-5 h-5 text-[#64748B]" />
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <span className="text-3xl font-extrabold text-[#0F172A]">{remaining}</span>
                      <span className="text-xs text-[#64748B] font-medium ml-1.5">
                        {isLop ? 'Unlimited' : 'remaining'}
                      </span>
                    </div>
                    <div className="text-right text-xs text-[#64748B] space-y-0.5">
                      <div>Available: <strong className="text-[#0F172A]">{bal.allocated}</strong></div>
                      <div>Used: <strong className="text-[#0F172A]">{bal.used}</strong></div>
                      <div>Pending: <strong className="text-[#D97706]">{bal.pending}</strong></div>
                      <div>Remaining: <strong className="text-[#16A34A]">{remaining}</strong></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* My Leave Requests Table */}
      <section className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#0F172A]">My Leave Applications</h2>
          <span className="text-xs text-[#64748B]">{myRequests.length} record(s)</span>
        </div>

        {requestsLoading ? (
          <div className="p-8 text-center text-[#64748B]">Loading your leave requests...</div>
        ) : myRequests.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-[#475569]">No leave requests found</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-xs font-semibold text-[#64748B] border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Dates & Breakdown</th>
                  <th className="py-3 px-4 text-center">Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Overall Status</th>
                  <th className="py-3 px-4">Decision / Note</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[#475569]">
                {myRequests.map((req) => {
                  const canCancel =
                    req.status === 'pending' ||
                    (req.status === 'approved' && req.from_date >= new Date().toISOString().split('T')[0]);

                  return (
                    <tr key={req.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[#0F172A]">
                        <div className="flex items-center gap-2">
                          <span>{req.leave_type_name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                            {req.leave_type_code}
                          </span>
                        </div>
                        {req.is_half_day && (
                          <span className="text-[11px] text-[#D97706] font-medium block mt-0.5">
                            Half Day ({req.from_time || '09:30'} - {req.to_time || '14:00'})
                          </span>
                        )}
                        {req.leave_type_code === 'PERM' && req.from_time && (
                          <span className="text-[11px] text-[#4F46E5] font-medium block mt-0.5">
                            Permission ({req.from_time} - {req.to_time})
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs space-y-1">
                        <div>{req.from_date === req.to_date ? req.from_date : `${req.from_date} to ${req.to_date}`}</div>
                        {req.days_breakdown && req.days_breakdown.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {req.days_breakdown.map((d) => (
                              <StatusBadge
                                key={d.id}
                                status={d.status}
                                label={`${d.date.slice(5)}: ${d.status.toUpperCase()}`}
                                size="sm"
                              />
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-semibold text-[#0F172A]">{req.days}</span>{' '}
                        <span className="text-xs text-[#64748B]">day(s)</span>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-[#475569]" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {req.approver_name && (
                          <div className="font-medium text-[#0F172A]">{req.approver_name}</div>
                        )}
                        {req.decision_note && (
                          <div className="text-[#64748B] italic mt-0.5" title={req.decision_note}>
                            "{req.decision_note}"
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {canCancel ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setCancelTarget(req)}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <span className="text-xs text-[#64748B]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Apply Leave Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Apply for Leave / Time Off"
      >
        <form onSubmit={handleApplySubmit} className="space-y-4">
          <FormField label="Leave Type" required>
            <select
              value={formData.leave_type_id}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : '';
                setFormData({ ...formData, leave_type_id: val });
              }}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            >
              <option value="">-- Select Leave Type --</option>
              {leaveTypes.map((lt) => {
                const bal = myBalances.find((b) => b.leave_type_id === lt.id);
                const remStr = lt.code === 'LOP' ? 'Unlimited' : lt.code === 'PERM' ? '2 hrs max' : `${bal?.remaining ?? 0} left`;
                return (
                  <option key={lt.id} value={lt.id}>
                    {lt.name} ({lt.code}) — {remStr}
                  </option>
                );
              })}
            </select>
          </FormField>

          {/* Dates row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="From Date" required>
              <input
                type="date"
                value={formData.from_date}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({
                    ...formData,
                    from_date: val,
                    to_date: formData.is_half_day || isPermission ? val : formData.to_date || val,
                  });
                }}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                required
              />
            </FormField>

            <FormField label="To Date" required>
              <input
                type="date"
                value={formData.to_date}
                disabled={formData.is_half_day || isPermission}
                min={formData.from_date}
                onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5] disabled:bg-[#F1F5F9] disabled:text-[#64748B]"
                required
              />
            </FormField>
          </div>

          {/* Permission or Half Day custom times */}
          {(formData.is_half_day || isPermission) && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#EEF2FF] rounded-xl border border-[#C7D2FE] text-xs">
              <FormField label="From Time (HH:mm)" required>
                <input
                  type="time"
                  value={formData.from_time}
                  onChange={(e) => setFormData({ ...formData, from_time: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-sm"
                  required
                />
              </FormField>

              <FormField label="To Time (HH:mm)" required>
                <input
                  type="time"
                  value={formData.to_time}
                  onChange={(e) => setFormData({ ...formData, to_time: e.target.value })}
                  className="w-full px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-sm"
                  required
                />
              </FormField>
            </div>
          )}

          {/* Half day toggle */}
          {selectedTypeObj?.allow_half_day && !isPermission && (
            <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-[#0F172A]">
                <input
                  type="checkbox"
                  checked={formData.is_half_day}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData({
                      ...formData,
                      is_half_day: checked,
                      to_date: checked ? formData.from_date : formData.to_date,
                    });
                  }}
                  className="rounded text-[#4F46E5] focus:ring-[#4F46E5]"
                />
                Half Day Leave (0.5 day)
              </label>

              {formData.is_half_day && (
                <div className="flex items-center gap-4 pt-1 pl-6">
                  <label className="inline-flex items-center gap-1.5 text-xs text-[#475569]">
                    <input
                      type="radio"
                      name="half_session"
                      value="first"
                      checked={formData.half_day_session === 'first'}
                      onChange={() => setFormData({ ...formData, half_day_session: 'first', from_time: '09:30', to_time: '14:00' })}
                    />
                    First Half (09:30 - 14:00)
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-[#475569]">
                    <input
                      type="radio"
                      name="half_session"
                      value="second"
                      checked={formData.half_day_session === 'second'}
                      onChange={() => setFormData({ ...formData, half_day_session: 'second', from_time: '14:00', to_time: '18:30' })}
                    />
                    Second Half (14:00 - 18:30)
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Live Working Days Calculation Preview */}
          {formData.from_date && formData.to_date && (
            <div className="p-3 rounded-lg border bg-[#EEF2FF] border-[#C7D2FE] text-xs text-[#312E81] space-y-1.5">
              <div className="flex items-center justify-between font-semibold">
                <span>Working Days Summary:</span>
                {isCalculating ? (
                  <span className="text-[#4F46E5]">Calculating...</span>
                ) : calcPreview ? (
                  <span className="text-base text-[#4338CA] font-bold">
                    {isPermission ? 'Permission (0 days deducted)' : `${calcPreview.days} day(s)`}
                  </span>
                ) : null}
              </div>

              {calcError && (
                <div className="flex items-center gap-1.5 text-[#DC2626] font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {calcError}
                </div>
              )}

              {calcPreview && (
                <div className="space-y-1 text-[#475569] pt-1 border-t border-[#C7D2FE]">
                  {calcPreview.holidayDates.length > 0 && (
                    <div className="text-[#B45309] font-medium">
                      Holidays excluded: {calcPreview.holidayDates.join(', ')}
                    </div>
                  )}
                  {calcPreview.weekendDates.length > 0 && (
                    <div>Weekends excluded: {calcPreview.weekendDates.join(', ')}</div>
                  )}
                </div>
              )}
            </div>
          )}

          <FormField label="Reason" required>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              placeholder="State the reason for your leave application..."
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
            <Button variant="secondary" onClick={() => setIsApplyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={applyMutation.isPending}
              disabled={isCalculating || Boolean(calcError)}
            >
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelTarget) {
            cancelMutation.mutate(cancelTarget.id);
          }
        }}
        title="Cancel Leave Request"
        message={`Are you sure you want to cancel your leave request for ${cancelTarget?.leave_type_name} (${cancelTarget?.from_date} to ${cancelTarget?.to_date})?`}
        variant="danger"
        confirmText="Yes, Cancel Leave"
      />
    </div>
  );
};

export default MyLeavesPage;
