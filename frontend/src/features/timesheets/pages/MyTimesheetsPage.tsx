import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { useToast } from '../../../shared/context/ToastContext';
import { FormField } from '../../../shared/components/FormField';
import { Button } from '../../../shared/components/Button';
import { StatusBadge } from '../../../shared/components/StatusBadge';
import { Clock, Plus, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export const MyTimesheetsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error, info } = useToast();

  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState<number>(8);
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | ''>('');
  const [selectedTaskId, setSelectedTaskId] = useState<number | ''>('');

  // Fetch employee project assignments with open tasks
  const { data: assignments = [] } = useQuery({
    queryKey: ['projects', 'my-assignments'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get('/projects/my-assignments');
        return res.data.data || [];
      } catch {
        return [];
      }
    },
  });

  const selectedProject = assignments.find((p: any) => p.id === Number(selectedProjectId));
  const availableTasks = selectedProject?.tasks || selectedProject?.open_tasks || [];

  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ['timesheets', 'me'],
    queryFn: async () => {
      const res = await axiosClient.get('/timesheets/me');
      return res.data.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosClient.post('/timesheets', {
        date,
        hours,
        task_description: taskDescription,
        project_id: selectedProjectId ? Number(selectedProjectId) : null,
        task_id: selectedTaskId ? Number(selectedTaskId) : null,
      });
      return res.data;
    },
    onSuccess: (resData) => {
      success('Timesheet submitted successfully!');
      if (resData?.data?.warning) {
        info(resData.data.warning);
      }
      setTaskDescription('');
      setSelectedProjectId('');
      setSelectedTaskId('');
      queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    },
    onError: (err: any) => {
      error(err.response?.data?.message || 'Failed to submit timesheet');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDescription.trim()) {
      error('Task description is required');
      return;
    }
    submitMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#26301f] font-display flex items-center gap-2.5">
          <Clock className="w-7 h-7 text-[#14776b]" />
          My Timesheets
        </h1>
        <p className="text-[#6b7663] text-sm mt-1">
          Submit daily work hours and track timesheet approval status.
        </p>
      </div>

      {/* SUBMISSION FORM */}
      <div className="bg-[#e2e8dc] rounded-[24px] border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] p-5">
        <h2 className="font-bold text-[#26301f] font-display text-base mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-[#14776b]" /> Submit New Timesheet Entry
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Date" required>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] rounded-[14px] text-sm shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
                required
              />
            </FormField>

            <FormField label="Hours Worked" required>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] rounded-[14px] text-sm shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Project (Assigned Projects)">
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value ? Number(e.target.value) : '');
                  setSelectedTaskId('');
                }}
                className="w-full px-3 py-2 border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] rounded-[14px] text-sm shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              >
                <option value="">-- General / Non-Project --</option>
                {assignments.map((proj: any) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.project_code ? `[${proj.project_code}] ` : ''}{proj.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Task (Optional)">
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value ? Number(e.target.value) : '')}
                disabled={!selectedProjectId || availableTasks.length === 0}
                className="w-full px-3 py-2 border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] rounded-[14px] text-sm shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- Select Task --</option>
                {availableTasks.map((tsk: any) => (
                  <option key={tsk.id} value={tsk.id}>
                    {tsk.task_code ? `[${tsk.task_code}] ` : ''}{tsk.title}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Task Description" required>
            <textarea
              rows={3}
              placeholder="Describe work completed, tickets closed, or project deliverables..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              className="w-full px-3 py-2 border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] rounded-[14px] text-sm shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
              required
            />
          </FormField>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={submitMutation.isPending}
              disabled={!taskDescription.trim()}
            >
              Submit Entry
            </Button>
          </div>
        </form>
      </div>

      {/* TIMESHEET HISTORY TABLE */}
      <div className="bg-[#e2e8dc] rounded-[24px] border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] overflow-hidden">
        <div className="p-4 border-b border-[rgba(76,91,70,0.14)] bg-[#dbe2d5]/60 font-bold text-[#26301f] font-display text-base">
          Timesheet History
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-[#6b7663]">Loading timesheets...</div>
        ) : timesheets.length === 0 ? (
          <div className="p-12 text-center text-[#6b7663] text-sm">No timesheets submitted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#dbe2d5] text-xs font-semibold text-[#26301f] border-b border-[rgba(76,91,70,0.14)] font-display">
                <tr>
                  <th className="py-3 px-4 font-display">Date</th>
                  <th className="py-3 px-4 font-display">Project</th>
                  <th className="py-3 px-4 text-center font-display">Hours</th>
                  <th className="py-3 px-4 font-display">Task Description</th>
                  <th className="py-3 px-4 font-display">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(76,91,70,0.10)] text-[#35422d]">
                {timesheets.map((t: any) => (
                  <tr key={t.id} className="hover:bg-[#dbe2d5]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-[#26301f] tabular-nums">
                      {t.date}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-[#26301f]">
                      {t.project_name ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[8px] bg-[#dbe2d5] text-[#26301f] border border-[rgba(76,91,70,0.14)]">
                          {t.project_code ? `${t.project_code} - ` : ''}{t.project_name}
                        </span>
                      ) : (
                        <span className="text-[#6b7663]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#26301f] tabular-nums">
                      {t.hours} hrs
                    </td>
                    <td className="py-3.5 px-4 max-w-md truncate text-[#35422d]">
                      {t.task_description}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={t.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTimesheetsPage;
