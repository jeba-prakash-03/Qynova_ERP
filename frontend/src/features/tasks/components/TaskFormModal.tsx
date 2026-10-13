import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api';
import { projectsApi } from '../../projects/api';
import { Task, CreateTaskPayload, UpdateTaskPayload, TaskPriority, TaskStatus } from '../types';
import { useToast } from '../../../shared/context/ToastContext';
import axiosClient from '../../../shared/api/axiosClient';
import { X, Save } from 'lucide-react';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  defaultProjectId?: number;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  defaultProjectId,
}) => {
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const [projectId, setProjectId] = useState<number>(defaultProjectId || 0);
  const [moduleId, setModuleId] = useState<number | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<number | undefined>(undefined);
  const [reviewerId, setReviewerId] = useState<number | undefined>(undefined);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('backlog');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number>(0);

  // Fetch projects list if not locked to defaultProjectId
  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'form-select'],
    queryFn: () => projectsApi.getAll({ limit: 100 }),
    enabled: isOpen,
  });

  // Fetch project details to get valid project members
  const activeProjectId = projectId || defaultProjectId || 0;
  const { data: currentProject } = useQuery({
    queryKey: ['projects', activeProjectId],
    queryFn: () => projectsApi.getById(activeProjectId),
    enabled: Boolean(activeProjectId && isOpen),
  });

  // Fetch modules for active project
  const { data: modules = [] } = useQuery({
    queryKey: ['tasks', 'modules', activeProjectId],
    queryFn: () => tasksApi.getModules(activeProjectId),
    enabled: Boolean(activeProjectId && isOpen),
  });

  // Fetch active employees for reviewer list
  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'active-form-select'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees?limit=200&status=active');
      const list: any[] = res.data?.data || [];
      return list.filter((e) => e.status === 'active' && e.lifecycle_stage !== 'relieved');
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (taskToEdit) {
      setProjectId(taskToEdit.project_id);
      setModuleId(taskToEdit.module_id || undefined);
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setAssigneeId(taskToEdit.assignee_id || undefined);
      setReviewerId(taskToEdit.reviewer_id || undefined);
      setPriority(taskToEdit.priority);
      setStatus(taskToEdit.status);
      setDueDate(taskToEdit.due_date ? taskToEdit.due_date.split('T')[0] : '');
      setEstimatedHours(taskToEdit.estimated_hours || 0);
    } else {
      setProjectId(defaultProjectId || (projectsData?.data?.[0]?.id ?? 0));
      setModuleId(undefined);
      setTitle('');
      setDescription('');
      setAssigneeId(undefined);
      setReviewerId(undefined);
      setPriority('medium');
      setStatus('backlog');
      setDueDate('');
      setEstimatedHours(0);
    }
  }, [taskToEdit, defaultProjectId, projectsData, isOpen]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (taskToEdit) {
        const payload: UpdateTaskPayload = {
          module_id: moduleId || null,
          title,
          description,
          assignee_id: assigneeId || null,
          reviewer_id: reviewerId || null,
          priority,
          due_date: dueDate || undefined,
          estimated_hours: Number(estimatedHours) || 0,
        };
        return tasksApi.update(taskToEdit.id, payload);
      } else {
        const payload: CreateTaskPayload = {
          project_id: projectId,
          module_id: moduleId || null,
          title,
          description,
          assignee_id: assigneeId || null,
          reviewer_id: reviewerId || null,
          priority,
          status,
          due_date: dueDate || undefined,
          estimated_hours: Number(estimatedHours) || 0,
        };
        return tasksApi.create(payload);
      }
    },
    onSuccess: (saved) => {
      success(`Task ${taskToEdit ? 'updated' : 'created'} successfully: ${saved.task_code}`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.errors?.[0]?.message ||
        err.response?.data?.message ||
        'Failed to save task';
      toastError(msg);
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="text-base font-bold text-slate-800">
            {taskToEdit ? `Edit Task (${taskToEdit.task_code})` : 'Create New Task'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="p-6 space-y-4"
        >
          {/* Project selection */}
          {!taskToEdit && !defaultProjectId && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Project *
              </label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(Number(e.target.value));
                  setAssigneeId(undefined);
                }}
                required
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Select Project</option>
                {projectsData?.data?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_code} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement banking payment webhook validator"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Module & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Project Module
              </label>
              <select
                value={moduleId || ''}
                onChange={(e) => setModuleId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">None / General</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white capitalize"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Assignee & Reviewer */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Assignee (Project Member)
              </label>
              <select
                value={assigneeId || ''}
                onChange={(e) =>
                  setAssigneeId(e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Unassigned</option>
                {currentProject?.members && currentProject.members.length > 0 ? (
                  currentProject.members.map((m) => (
                    <option key={m.id} value={m.employee_id}>
                      {m.employee_name} ({m.role})
                    </option>
                  ))
                ) : (
                  <option disabled>No members in project</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Reviewer
              </label>
              <select
                value={reviewerId || ''}
                onChange={(e) =>
                  setReviewerId(e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">None / Self</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date & Estimated hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Estimated Hours
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={estimatedHours}
                onChange={(e) => setEstimatedHours(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed acceptance criteria or implementation notes..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              {mutation.isPending ? 'Saving...' : taskToEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
