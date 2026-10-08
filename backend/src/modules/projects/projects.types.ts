export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';

export type ProjectStatus =
  | 'lead'
  | 'proposal'
  | 'won'
  | 'contract'
  | 'planning'
  | 'development'
  | 'testing'
  | 'uat'
  | 'deployment'
  | 'maintenance'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

export type ProjectMemberRole = 'manager' | 'team_lead' | 'developer' | 'qa' | 'designer';

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed';

export interface Project {
  id: number;
  project_code: string;
  client_id: number;
  client_name?: string;
  name: string;
  description?: string | null;
  project_manager_id?: number | null;
  project_manager_name?: string | null;
  start_date: string;
  end_date?: string | null;
  budget: number | string;
  technologies?: string[] | null;
  priority: ProjectPriority;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  email?: string;
  role: ProjectMemberRole;
  allocation_percent: number;
  joined_at: string;
  left_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMilestone {
  id: number;
  project_id: number;
  title: string;
  description?: string | null;
  due_date: string;
  amount: number | string;
  status: MilestoneStatus;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithDetails extends Project {
  members: ProjectMember[];
  milestones: ProjectMilestone[];
  progress_percent?: number;
}

export interface ProjectQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  client_id?: number;
  project_manager_id?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface UserVisibilityContext {
  userId: number;
  employeeId: number | null;
  roles: string[];
  permissions: string[];
}
