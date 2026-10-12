export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'code_review'
  | 'changes_required'
  | 'testing'
  | 'qa_passed'
  | 'completed';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ProjectModule {
  id: number;
  project_id: number;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  comment: string;
  user_name?: string;
  user_email?: string;
  created_at: string;
  updated_at: string;
}

export interface TaskHistory {
  id: number;
  task_id: number;
  user_id: number | null;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  user_name?: string;
  created_at: string;
}

export interface Task {
  id: number;
  task_code: string;
  project_id: number;
  project_name?: string;
  project_code?: string;
  module_id?: number | null;
  module_name?: string | null;
  parent_task_id?: number | null;
  title: string;
  description?: string | null;
  assignee_id?: number | null;
  assignee_name?: string | null;
  assignee_code?: string | null;
  reviewer_id?: number | null;
  reviewer_name?: string | null;
  reviewer_code?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string | null;
  estimated_hours: number;
  actual_hours: number;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithDetails extends Task {
  subtasks: Task[];
  comments: TaskComment[];
  history: TaskHistory[];
}

export interface CreateTaskPayload {
  project_id: number;
  module_id?: number | null;
  parent_task_id?: number | null;
  title: string;
  description?: string;
  assignee_id?: number | null;
  reviewer_id?: number | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string;
  estimated_hours?: number;
}

export interface UpdateTaskPayload {
  module_id?: number | null;
  parent_task_id?: number | null;
  title?: string;
  description?: string;
  assignee_id?: number | null;
  reviewer_id?: number | null;
  priority?: TaskPriority;
  due_date?: string;
  estimated_hours?: number;
}

export interface TaskQueryParams {
  project_id?: number;
  module_id?: number;
  assignee_id?: number;
  reviewer_id?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  parent_task_id?: number | null;
  search?: string;
  page?: number;
  limit?: number;
}

export const VALID_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  backlog: ['todo'],
  todo: ['in_progress'],
  in_progress: ['code_review'],
  code_review: ['changes_required', 'testing'],
  changes_required: ['in_progress'],
  testing: ['changes_required', 'qa_passed'],
  qa_passed: ['completed'],
  completed: [],
};

export const TASK_STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  backlog: {
    label: 'Backlog',
    color: 'text-slate-700',
    bg: 'bg-slate-100',
    border: 'border-slate-300',
  },
  todo: {
    label: 'To Do',
    color: 'text-sky-700',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  code_review: {
    label: 'Code Review',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  changes_required: {
    label: 'Changes Req.',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
  testing: {
    label: 'Testing',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  qa_passed: {
    label: 'QA Passed',
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
};

export const TASK_PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; color: string; badge: string }
> = {
  low: { label: 'Low', color: 'text-slate-500', badge: 'bg-slate-100 text-slate-700' },
  medium: { label: 'Medium', color: 'text-blue-500', badge: 'bg-blue-50 text-blue-700' },
  high: { label: 'High', color: 'text-amber-500', badge: 'bg-amber-50 text-amber-700' },
  critical: { label: 'Critical', color: 'text-rose-600', badge: 'bg-rose-50 text-rose-700' },
};
