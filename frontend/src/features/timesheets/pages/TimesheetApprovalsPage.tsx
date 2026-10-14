import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { useToast } from '../../../shared/context/ToastContext';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Button } from '../../../shared/components/Button';
import { Modal } from '../../../shared/components/Modal';
import { FormField } from '../../../shared/components/FormField';
import { Loader } from '../../../shared/components/Loader';
import { Clock, CheckCircle2, XCircle, Search, UserCheck } from 'lucide-react';

interface TimesheetItem {
  id: number;
  employee_id: number;
  employee_code: string;
  employee_name: string;
  department_name?: string | null;
  date: string;
  hours: number;
  task_description: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export const TimesheetApprovalsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [rejectTarget, setRejectTarget] = useState<TimesheetItem | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const { data: pendingTimesheets = [], isLoading } = useQuery<TimesheetItem[]>({
    queryKey: ['timesheets', 'pending'],
    queryFn: async () => {
      const res = await axiosClient.get('/timesheets/pending');
      return res.data.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await axiosClient.patch(`/timesheets/${id}/approve`);
      return res.data;
    },
    onSuccess: () => {
      success('Timesheet approved successfully.');
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to approve timesheet.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string }) => {
      const res = await axiosClient.patch(`/timesheets/${id}/reject`, { note });
      return res.data;
    },
    onSuccess: () => {
      success('Timesheet rejected.');
      setRejectTarget(null);
      setRejectNote('');
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to reject timesheet.');
    },
  });

  const filtered = pendingTimesheets.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      t.employee_name?.toLowerCase().includes(term) ||
      t.employee_code?.toLowerCase().includes(term) ||
      t.task_description?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26301f] font-display flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-[#14776b]" />
            Timesheet Approvals
          </h1>
          <p className="text-[#6b7663] text-sm mt-1">
            Review and approve daily work hours logged by your direct reports.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#6b7663] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee or task..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.12)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
          />
        </div>
      </div>

      {isLoading ? (
        <Loader size="lg" text="Loading pending timesheets..." />
      ) : filtered.length === 0 ? (
        <div className="bg-[#e2e8dc] rounded-[24px] border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] p-12 text-center">
          <Clock className="w-10 h-10 text-[#6b7663] mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#26301f] font-display">No Pending Timesheets</h3>
          <p className="text-xs text-[#6b7663] mt-1">
            All submitted timesheet entries for your team have been reviewed.
          </p>
        </div>
      ) : (
        <div className="bg-[#e2e8dc] rounded-[24px] border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#dbe2d5] border-b border-[rgba(76,91,70,0.14)] text-xs font-semibold text-[#26301f] font-display">
                  <th className="py-3 px-4 font-display">Employee</th>
                  <th className="py-3 px-4 font-display">Date</th>
                  <th className="py-3 px-4 font-display">Hours</th>
                  <th className="py-3 px-4 font-display">Task Description</th>
                  <th className="py-3 px-4 font-display">Status</th>
                  <th className="py-3 px-4 text-right font-display">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(76,91,70,0.10)] text-sm text-[#35422d]">
                {filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#dbe2d5]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#26301f] font-display">{entry.employee_name}</div>
                      <div className="text-xs text-[#6b7663] font-mono">
                        {entry.employee_code} {entry.department_name && `• ${entry.department_name}`}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-[#35422d]">
                      {entry.date ? new Date(entry.date).toISOString().split('T')[0] : '—'}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums">
                      <span className="font-bold text-[#26301f]">{entry.hours}</span> hrs
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <p className="text-xs text-[#35422d] line-clamp-2" title={entry.task_description}>
                        {entry.task_description}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={entry.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={approveMutation.isPending && approveMutation.variables === entry.id}
                          onClick={() => approveMutation.mutate(entry.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setRejectTarget(entry);
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
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="Reject Timesheet Entry"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (rejectTarget) {
              rejectMutation.mutate({ id: rejectTarget.id, note: rejectNote });
            }
          }}
          className="space-y-4"
        >
          <p className="text-xs text-[#35422d]">
            Rejecting timesheet of <strong className="text-[#26301f] tabular-nums">{rejectTarget?.hours} hrs</strong> logged by{' '}
            <strong className="text-[#26301f] font-display">{rejectTarget?.employee_name}</strong> on {rejectTarget?.date?.slice(0, 10)}.
          </p>

          <FormField label="Rejection Note (Optional)">
            <textarea
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Provide feedback on why this timesheet is rejected..."
              className="w-full px-3 py-2 border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] rounded-[14px] text-sm shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-[rgba(76,91,70,0.14)]">
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" isLoading={rejectMutation.isPending}>
              Confirm Rejection
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TimesheetApprovalsPage;
