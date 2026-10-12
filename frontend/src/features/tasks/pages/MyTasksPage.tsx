import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api';
import { Task, TaskStatus, TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, VALID_STATUS_TRANSITIONS } from '../types';
import { TaskDrawer } from '../components/TaskDrawer';
import { useToast } from '../../../shared/context/ToastContext';
import {
  CheckSquare,
  Clock,
  Calendar,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FolderKanban,
  Search,
} from 'lucide-react';

export const MyTasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data: myTasksRes, isLoading, isError } = useQuery({
    queryKey: ['tasks', 'my', { search, status: statusFilter }],
    queryFn: () =>
      tasksApi.getMyTasks({
        search: search || undefined,
        status: (statusFilter as TaskStatus) || undefined,
        limit: 100,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      tasksApi.updateStatus(taskId, status),
    onSuccess: (updated) => {
      success(`Task status moved to ${updated.status.replace('_', ' ')}`);
      queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to update task status');
    },
  });

  const tasks = myTasksRes?.data || [];

  // Metrics
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const reviewCount = tasks.filter((t) => t.status === 'code_review').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalLoggedHours = tasks.reduce((sum, t) => sum + Number(t.actual_hours || 0), 0);

  const isDueTomorrow = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return (
      due.getFullYear() === tomorrow.getFullYear() &&
      due.getMonth() === tomorrow.getMonth() &&
      due.getDate() === tomorrow.getDate()
    );
  };

  const isOverdue = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <CheckSquare className="w-7 h-7 text-indigo-600" />
          My Work & Tasks
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Assigned engineering tasks, PR code reviews, and personal workload dashboard.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active / In Progress
          </span>
          <div className="text-2xl font-black text-indigo-600 mt-1">{inProgressCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            In Code Review
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">{reviewCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Completed
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{completedCount}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Logged Hours
          </span>
          <div className="text-2xl font-black text-slate-800 mt-1">
            {totalLoggedHours.toFixed(1)}h
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search my tasks..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          >
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="code_review">Code Review</option>
            <option value="changes_required">Changes Required</option>
            <option value="testing">Testing</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <span className="text-xs font-medium text-slate-500">
          Showing <strong>{tasks.length}</strong> tasks
        </span>
      </div>

      {/* Tasks List */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center bg-white rounded-2xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : isError ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-rose-600">
          Failed to load assigned tasks.
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No pending tasks!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            You currently have no tasks assigned to you matching this filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const nextStatuses = VALID_STATUS_TRANSITIONS[task.status] || [];
            const dueWarn = isDueTomorrow(task.due_date);
            const overdue = isOverdue(task.due_date) && task.status !== 'completed';

            return (
              <div
                key={task.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setActiveTaskId(task.id)}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                      {task.task_code}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${
                        TASK_STATUS_CONFIG[task.status]?.bg || 'bg-slate-100'
                      } ${TASK_STATUS_CONFIG[task.status]?.color || 'text-slate-700'} ${
                        TASK_STATUS_CONFIG[task.status]?.border || 'border-slate-200'
                      }`}
                    >
                      {TASK_STATUS_CONFIG[task.status]?.label || task.status}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        TASK_PRIORITY_CONFIG[task.priority]?.badge
                      }`}
                    >
                      {task.priority}
                    </span>

                    {dueWarn && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center gap-1 border border-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Due Tomorrow
                      </span>
                    )}

                    {overdue && (
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center gap-1 border border-rose-300">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Overdue
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 hover:text-indigo-600 transition">
                    {task.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
                      {task.project_name || 'Project'}
                    </span>
                    {task.module_name && <span>• Module: {task.module_name}</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Logged: {Number(task.actual_hours || 0).toFixed(1)}h / Est:{' '}
                      {Number(task.estimated_hours || 0).toFixed(1)}h
                    </span>
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Due: {task.due_date.split('T')[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Advance Workflow Action */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {nextStatuses.map((next) => (
                    <button
                      key={next}
                      disabled={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({
                          taskId: task.id,
                          status: next,
                        })
                      }
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-xs ${
                        next === 'changes_required'
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      <ArrowRight className="w-3 h-3" />
                      {TASK_STATUS_CONFIG[next]?.label || next}
                    </button>
                  ))}

                  <button
                    onClick={() => setActiveTaskId(task.id)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Drawer */}
      <TaskDrawer taskId={activeTaskId} onClose={() => setActiveTaskId(null)} />
    </div>
  );
};
