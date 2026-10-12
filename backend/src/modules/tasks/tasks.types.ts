export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'code_review'
  | 'changes_required'
  | 'testing'
  | 'qa_passed'
  | 'completed';

export interface ProjectModule {
  id: number;
  project_id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  task_code: string;
  project_id: number;
  module_id?: number | null;
  parent_task_id?: number | null;
  title: string;
  description?: string | null;
  assignee_id?: number | null;
  reviewer_id?: number | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string | null;
  estimated_hours: number;
  actual_hours: number;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;

  // Joined fields
  project_name?: string;
  project_code?: string;
  module_name?: string;
  assignee_name?: string;
  assignee_code?: string;
  reviewer_name?: string;
  reviewer_code?: string;
  subtasks_count?: number;
  completed_subtasks_count?: number;
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  comment: string;
  user_name?: string;
  user_email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TaskHistory {
  id: number;
  task_id: number;
  user_id?: number | null;
  user_name?: string;
  field_changed: string;
  old_value?: string | null;
  new_value?: string | null;
  created_at?: string;
}

export interface TaskWithDetails extends Task {
  subtasks: Task[];
  comments: TaskComment[];
  history: TaskHistory[];
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
