import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../../shared/api/axiosClient';
import { useToast } from '../../../shared/context/ToastContext';
import { FormField } from '../../../shared/components/FormField';
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
      queryClient.invalidateQueries({ queryKey: ['timesheets', 'me'] });
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
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <Clock className="w-7 h-7 text-indigo-600" />
          My Timesheets
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Submit daily work hours and track timesheet approval status.
        </p>
      </div>

      {/* SUBMISSION FORM */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5">
        <h2 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-600" /> Submit New Timesheet Entry
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Date" required>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </FormField>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitMutation.isPending || !taskDescription.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit Entry'}
            </button>
          </div>
        </form>
      </div>

      {/* TIMESHEET HISTORY TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-slate-900 text-base">
          Timesheet History
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading timesheets...</div>
        ) : timesheets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No timesheets submitted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4 text-center">Hours</th>
                  <th className="py-3 px-4">Task Description</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {timesheets.map((t: any) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-900">
                      {t.date}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-800">
                      {t.project_name ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {t.project_code ? `${t.project_code} - ` : ''}{t.project_name}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {t.hours} hrs
                    </td>
                    <td className="py-3.5 px-4 max-w-md truncate text-slate-600">
                      {t.task_description}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          t.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.status}
                      </span>
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
