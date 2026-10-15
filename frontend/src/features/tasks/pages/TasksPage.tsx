import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api';
import { projectsApi } from '../../projects/api';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TASK_STATUS_CONFIG,
  TASK_PRIORITY_CONFIG,
} from '../types';
import { TaskKanbanBoard } from '../components/TaskKanbanBoard';
import { TaskDrawer } from '../components/TaskDrawer';
import { TaskFormModal } from '../components/TaskFormModal';
import { useToast } from '../../../shared/context/ToastContext';
import { Can } from '../../../shared/components/Can';
import { Button } from '../../../shared/components/Button';
import {
  Plus,
  Kanban,
  List,
  Search,
  Filter,
  CheckSquare,
  Clock,
  User,
  AlertCircle,
} from 'lucide-react';

export const TasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedProjectId, setSelectedProjectId] = useState<number | undefined>(undefined);
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [search, setSearch] = useState('');
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Fetch projects for filter dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'filter-list'],
    queryFn: () => projectsApi.getAll({ limit: 100 }),
  });

  // Fetch tasks
  const {
    data: tasksResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['tasks', { project_id: selectedProjectId, priority: selectedPriority, search }],
    queryFn: () =>
      tasksApi.getAll({
        project_id: selectedProjectId,
        priority: (selectedPriority as TaskPriority) || undefined,
        search: search || undefined,
        limit: 100,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: TaskStatus }) =>
      tasksApi.updateStatus(taskId, status),
    onSuccess: (updated) => {
      success(`Task moved to ${updated.status.replace('_', ' ')}`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: any) => {
      toastError(err.response?.data?.message || 'Failed to update task status');
    },
  });

  const tasks = tasksResponse?.data || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#26301f] font-display tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-7 h-7 text-[#14776b]" />
            Task Management & Sprints
          </h1>
          <p className="text-sm text-[#6b7663] mt-1">
            Track development workflow, sprint tasks, and server-enforced code review lifecycles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View switcher */}
          <div className="flex items-center bg-[#dbe2d5] p-1 rounded-full border border-[rgba(76,91,70,0.14)] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)]">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all font-display ${
                viewMode === 'kanban'
                  ? 'bg-[#14776b] text-white shadow-sm font-bold'
                  : 'text-[#35422d] hover:text-[#26301f]'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all font-display ${
                viewMode === 'list'
                  ? 'bg-[#14776b] text-white shadow-sm font-bold'
                  : 'text-[#35422d] hover:text-[#26301f]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          <Can permission="tasks.create">
            <Button
              variant="primary"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setTaskToEdit(null);
                setIsCreateModalOpen(true);
              }}
            >
              New Task
            </Button>
          </Can>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#e2e8dc] p-4 rounded-[22px] border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Project filter */}
          <div className="min-w-[200px]">
            <select
              value={selectedProjectId || ''}
              onChange={(e) =>
                setSelectedProjectId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full text-xs px-3.5 py-2 border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
            >
              <option value="">All Projects</option>
              {projectsData?.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="text-xs px-3.5 py-2 border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-[#6b7663] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or title..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-[rgba(76,91,70,0.18)] bg-[#dbe2d5] text-[#26301f] placeholder:text-[#6b7663] rounded-[14px] shadow-[inset_1px_2px_4px_rgba(104,118,100,0.15)] focus:outline-none focus:ring-2 focus:ring-[#14776b]"
            />
          </div>
        </div>

        <div className="text-xs text-[#6b7663] font-medium tabular-nums">
          Showing <strong className="text-[#26301f]">{tasks.length}</strong> tasks
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-[#dbe2d5] animate-pulse rounded-[24px] border border-[rgba(76,91,70,0.14)]" />
          ))}
        </div>
      ) : isError ? (
        <div className="p-8 text-center bg-[#f6dfd8] rounded-[24px] border border-[#e8beae] text-[#8a3114]">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[#c4643f]" />
          <p className="font-semibold text-sm">Failed to load tasks</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-[#e2e8dc] rounded-[26px] border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)]">
          <CheckSquare className="w-10 h-10 text-[#6b7663] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#26301f] font-display">No tasks found</h3>
          <p className="text-xs text-[#6b7663] max-w-sm mx-auto mt-1">
            Get started by creating tasks for your projects to track deliverables and sprint progress.
          </p>
          <Can permission="tasks.create">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              className="mt-4"
              onClick={() => {
                setTaskToEdit(null);
                setIsCreateModalOpen(true);
              }}
            >
              Create First Task
            </Button>
          </Can>
        </div>
      ) : viewMode === 'kanban' ? (
        <TaskKanbanBoard
          tasks={tasks}
          onStatusChange={(taskId, status) => updateStatusMutation.mutate({ taskId, status })}
          onCardClick={(task) => setActiveTaskId(task.id)}
        />
      ) : (
        /* Table List View */
        <div className="bg-[#e2e8dc] rounded-[24px] border border-[rgba(76,91,70,0.18)] shadow-[8px_10px_24px_rgba(88,104,84,0.25),-6px_-7px_18px_rgba(255,255,255,0.75)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-[#dbe2d5] border-b border-[rgba(76,91,70,0.14)] text-[#26301f] font-semibold uppercase tracking-wider text-[11px] font-display">
                <tr>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Title</th>
                  <th className="px-5 py-3.5">Project</th>
                  <th className="px-5 py-3.5">Assignee</th>
                  <th className="px-5 py-3.5">Priority</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Logged / Est.</th>
                  <th className="px-5 py-3.5">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(76,91,70,0.10)] text-[#35422d]">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => setActiveTaskId(task.id)}
                    className="hover:bg-[#dbe2d5]/60 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-[#14776b]">
                      {task.task_code}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#26301f] max-w-xs truncate font-display">
                      {task.title}
                    </td>
                    <td className="px-5 py-3.5 text-[#6b7663] font-medium">
                      {task.project_name || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-[#35422d] font-medium">
                      {task.assignee_name || 'Unassigned'}
                    </td>
                    <td className="px-5 py-3.5">
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
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize border ${
                          TASK_STATUS_CONFIG[task.status]?.bg || 'bg-[#dbe2d5]'
                        } ${TASK_STATUS_CONFIG[task.status]?.color || 'text-[#26301f]'} ${
                          TASK_STATUS_CONFIG[task.status]?.border || 'border-[rgba(76,91,70,0.18)]'
                        }`}
                      >
                        {TASK_STATUS_CONFIG[task.status]?.label || task.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#35422d] font-medium tabular-nums">
                      {Number(task.actual_hours || 0).toFixed(1)}h /{' '}
                      {Number(task.estimated_hours || 0).toFixed(1)}h
                    </td>
                    <td className="px-5 py-3.5 text-[#6b7663] tabular-nums">
                      {task.due_date ? task.due_date.split('T')[0] : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Drawer */}
      <TaskDrawer
        taskId={activeTaskId}
        onClose={() => setActiveTaskId(null)}
        onEdit={(task) => {
          setActiveTaskId(null);
          setTaskToEdit(task);
          setIsCreateModalOpen(true);
        }}
      />

      {/* Task Form Modal */}
      <TaskFormModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
        defaultProjectId={selectedProjectId}
      />
    </div>
  );
};
