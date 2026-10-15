import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../api';
import { projectsApi } from '../../projects/api';
import { Task, CreateTaskPayload, UpdateTaskPayload, TaskPriority, TaskStatus } from '../types';
import { useToast } from '../../../shared/context/ToastContext';
import { Modal } from '../../../shared/components/Modal';
import axiosClient from '../../../shared/api/axiosClient';
import { Save } from 'lucide-react';

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
    queryKey: ['employees', 'task-reviewers'],
    queryFn: async () => {
      const res = await axiosClient.get('/employees?limit=200&status=active');
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // Populate fields if editing
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
      setEstimatedHours(Number(taskToEdit.estimated_hours || 0));
    } else {
      setProjectId(defaultProjectId || 0);
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
  }, [taskToEdit, defaultProjectId, isOpen]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Task title is required');
      if (!activeProjectId) throw new Error('Project is required');

      if (taskToEdit) {
        const payload: UpdateTaskPayload = {
          title: title.trim(),
          description: description.trim() || undefined,
          module_id: moduleId || null,
          assignee_id: assigneeId || null,
          reviewer_id: reviewerId || null,
          priority,
          due_date: dueDate || undefined,
          estimated_hours: estimatedHours > 0 ? Number(estimatedHours) : undefined,
        };
        return tasksApi.update(taskToEdit.id, payload);
      } else {
        const payload: CreateTaskPayload = {
          project_id: activeProjectId,
          module_id: moduleId,
          title: title.trim(),
          description: description.trim() || undefined,
          assignee_id: assigneeId,
          reviewer_id: reviewerId,
          priority,
          status,
          due_date: dueDate || undefined,
          estimated_hours: estimatedHours > 0 ? Number(estimatedHours) : undefined,
        };
        return tasksApi.create(payload);
      }
    },
    onSuccess: (task) => {
      success(taskToEdit ? `Task ${task.task_code} updated` : `Task ${task.task_code} created`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={taskToEdit ? `Edit Task (${taskToEdit.task_code})` : 'Create New Task'}
      subtitle={taskToEdit ? `Update sprint task details and assignments` : 'Assign task deliverables to project team members'}
      maxWidth="xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#c5d0be] rounded-xl text-xs font-semibold text-[#26301f] bg-[#e2e8dc] hover:bg-[#dbe2d5] transition active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="task-form"
            disabled={mutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14776b] hover:bg-[#11655b] text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition shadow-xs active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            {mutation.isPending ? 'Saving...' : taskToEdit ? 'Save Changes' : 'Create Task'}
          </button>
        </>
      }
    >
      <form
        id="task-form"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        {/* Project selection */}
        {!taskToEdit && !defaultProjectId && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Project *
            </label>
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(Number(e.target.value));
                setAssigneeId(undefined);
              }}
              required
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
            Task Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement banking payment webhook validator"
            className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30 placeholder-[#6b7663]/60"
          />
        </div>

        {/* Module & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Project Module
            </label>
            <select
              value={moduleId || ''}
              onChange={(e) => setModuleId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30 capitalize"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Assignee & Reviewer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Assignee (Project Member)
            </label>
            <select
              value={assigneeId || ''}
              onChange={(e) =>
                setAssigneeId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Reviewer
            </label>
            <select
              value={reviewerId || ''}
              onChange={(e) =>
                setReviewerId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
              Estimated Hours
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#6b7663] mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed acceptance criteria or implementation notes..."
            className="w-full text-xs px-3 py-2 border border-[#c5d0be]/60 clay-inset bg-[#e2e8dc] text-[#26301f] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14776b]/30 placeholder-[#6b7663]/60"
          />
        </div>
      </form>
    </Modal>
  );
};

export default TaskFormModal;
