import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api';
import { Task, TaskStatus, TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, VALID_STATUS_TRANSITIONS } from '../types';
import { TaskDrawer } from '../components/TaskDrawer';
import { useToast } from '../../../shared/context/ToastContext';
import { Button } from '../../../shared/components/Button';
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
        <h1 className="text-2xl font-bold text-[#26301f] font-display tracking-tight flex items-center gap-2.5">
          <CheckSquare className="w-7 h-7 text-[#14776b]" />
          My Work & Tasks
        </h1>
        <p className="text-sm text-[#6b7663] mt-1">
          Assigned engineering tasks, PR code reviews, and personal workload dashboard.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#e2e8dc] p-5 rounded-[22px] border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] clay-card-interactive">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6b7663]">
            Active / In Progress
          </span>
          <div className="text-2xl font-bold text-[#14776b] font-display mt-1 tabular-nums">{inProgressCount}</div>
        </div>

        <div className="bg-[#e2e8dc] p-5 rounded-[22px] border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] clay-card-interactive">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6b7663]">
            In Code Review
          </span>
          <div className="text-2xl font-bold text-[#cf9b34] font-display mt-1 tabular-nums">{reviewCount}</div>
        </div>

        <div className="bg-[#e2e8dc] p-5 rounded-[22px] border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] clay-card-interactive">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6b7663]">
            Completed
          </span>
          <div className="text-2xl font-bold text-[#1b4e23] font-display mt-1 tabular-nums">{completedCount}</div>
        </div>

        <div className="bg-[#e2e8dc] p-5 rounded-[22px] border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] clay-card-interactive">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6b7663]">
            Logged Hours
          </span>
          <div className="text-2xl font-bold text-[#26301f] font-display mt-1 tabular-nums">
            {totalLoggedHours.toFixed(1)}h
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-[#e2e8dc] p-4 rounded-[22px] border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-[#6b7663] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search my tasks..."
              className="w-full pl-9 pr-3.5 py-2 text-xs border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3.5 py-2 border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
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

        <span className="text-xs font-medium text-[#6b7663] tabular-nums">
          Showing <strong className="text-[#26301f]">{tasks.length}</strong> tasks
        </span>
      </div>

      {/* Tasks List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-[#dbe2d5] animate-pulse rounded-[22px] border border-[rgba(76,91,70,0.14)]" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 text-center bg-[#f6dfd8] rounded-[24px] border border-[#e8beae] text-[#8a3114]">
          Failed to load assigned tasks.
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-[#e2e8dc] rounded-[26px] border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)]">
          <CheckCircle2 className="w-12 h-12 text-[#3f8f4a] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#26301f] font-display">No pending tasks!</h3>
          <p className="text-xs text-[#6b7663] max-w-sm mx-auto mt-1">
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
                className="bg-[#e2e8dc] p-5 rounded-[22px] border border-[rgba(76,91,70,0.14)] shadow-[6px_8px_20px_rgba(88,104,84,0.18),-4px_-5px_14px_rgba(255,255,255,0.75)] hover:shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.85)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setActiveTaskId(task.id)}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#dbe2d5] text-[#14776b] rounded-[8px] border border-[rgba(76,91,70,0.18)] tabular-nums">
                      {task.task_code}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize border ${
                        TASK_STATUS_CONFIG[task.status]?.bg || 'bg-[#dbe2d5]'
                      } ${TASK_STATUS_CONFIG[task.status]?.color || 'text-[#26301f]'} ${
                        TASK_STATUS_CONFIG[task.status]?.border || 'border-[rgba(76,91,70,0.18)]'
                      }`}
                    >
                      {TASK_STATUS_CONFIG[task.status]?.label || task.status}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        task.priority === 'critical'
                          ? 'bg-[#f6dfd8] text-[#8a3114] border-[#e8beae]'
                          : task.priority === 'high'
                          ? 'bg-[#f7efdd] text-[#855b11] border-[#e6d4a8]'
                          : 'bg-[#dbe2d5] text-[#3c4535] border-[#c0cbba]'
                      }`}
                    >
                      {task.priority}
                    </span>

                    {dueWarn && (
                      <span className="px-2 py-0.5 rounded-full bg-[#f7efdd] text-[#855b11] font-bold text-[10px] flex items-center gap-1 border border-[#e6d4a8]">
                        <AlertTriangle className="w-3 h-3 text-[#cf9b34]" />
                        Due Tomorrow
                      </span>
                    )}

                    {overdue && (
                      <span className="px-2 py-0.5 rounded-full bg-[#f6dfd8] text-[#8a3114] font-bold text-[10px] flex items-center gap-1 border border-[#e8beae]">
                        <AlertTriangle className="w-3 h-3 text-[#c4643f]" />
                        Overdue
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[#26301f] hover:text-[#14776b] transition font-display">
                    {task.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#6b7663] mt-2">
                    <span className="flex items-center gap-1 font-medium text-[#35422d]">
                      <FolderKanban className="w-3.5 h-3.5 text-[#6b7663]" />
                      {task.project_name || 'Project'}
                    </span>
                    {task.module_name && <span>• Module: {task.module_name}</span>}
                    <span className="flex items-center gap-1 tabular-nums">
                      <Clock className="w-3.5 h-3.5 text-[#6b7663]" />
                      Logged: {Number(task.actual_hours || 0).toFixed(1)}h / Est:{' '}
                      {Number(task.estimated_hours || 0).toFixed(1)}h
                    </span>
                    {task.due_date && (
                      <span className="flex items-center gap-1 tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-[#6b7663]" />
                        Due: {task.due_date.split('T')[0]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Advance Workflow Action */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {nextStatuses.map((next) => (
                    <Button
                      key={next}
                      variant={next === 'changes_required' ? 'danger' : 'primary'}
                      size="sm"
                      disabled={updateStatusMutation.isPending}
                      onClick={() =>
                        updateStatusMutation.mutate({
                          taskId: task.id,
                          status: next,
                        })
                      }
                      rightIcon={<ArrowRight className="w-3 h-3" />}
                    >
                      {TASK_STATUS_CONFIG[next]?.label || next}
                    </Button>
                  ))}

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveTaskId(task.id)}
                  >
                    Details
                  </Button>
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

export default MyTasksPage;
