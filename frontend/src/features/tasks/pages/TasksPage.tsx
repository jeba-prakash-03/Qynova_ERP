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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-7 h-7 text-indigo-600" />
            Task Management & Sprints
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track development workflow, sprint tasks, and server-enforced code review lifecycles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'kanban'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          <Can permission="tasks.create">
            <button
              onClick={() => {
                setTaskToEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Task
            </button>
          </Can>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Project filter */}
          <div className="min-w-[200px]">
            <select
              value={selectedProjectId || ''}
              onChange={(e) =>
                setSelectedProjectId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
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
              className="text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
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
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or title..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{tasks.length}</strong> tasks
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center bg-white rounded-2xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : isError ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-rose-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-semibold text-sm">Failed to load tasks</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No tasks found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Get started by creating tasks for your projects to track deliverables and sprint progress.
          </p>
          <Can permission="tasks.create">
            <button
              onClick={() => {
                setTaskToEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" /> Create First Task
            </button>
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
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
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => setActiveTaskId(task.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="px-5 py-3.5 font-mono font-bold text-indigo-600">
                      {task.task_code}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800 max-w-xs truncate">
                      {task.title}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-medium">
                      {task.project_name || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">
                      {task.assignee_name || 'Unassigned'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          TASK_PRIORITY_CONFIG[task.priority]?.badge
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize border ${
                          TASK_STATUS_CONFIG[task.status]?.bg || 'bg-slate-100'
                        } ${TASK_STATUS_CONFIG[task.status]?.color || 'text-slate-700'} ${
                          TASK_STATUS_CONFIG[task.status]?.border || 'border-slate-200'
                        }`}
                      >
                        {TASK_STATUS_CONFIG[task.status]?.label || task.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-medium">
                      {Number(task.actual_hours || 0).toFixed(1)}h /{' '}
                      {Number(task.estimated_hours || 0).toFixed(1)}h
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">
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
