import { Knex } from 'knex';
import { db } from '../../db/knex';
import {
  Project,
  ProjectMember,
  ProjectMilestone,
  ProjectWithDetails,
  ProjectQueryParams,
  UserVisibilityContext,
} from './projects.types';
import {
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectMemberInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from './projects.schema';
import { SYSTEM_ROLES } from '../../shared/constants/roles';

export class ProjectsRepository {
  private knex: Knex;

  constructor(knexInstance: Knex = db) {
    this.knex = knexInstance;
  }

  public async getNextProjectCode(): Promise<string> {
    const lastProject = await this.knex('projects')
      .select('project_code')
      .where('project_code', 'like', 'PRJ-%')
      .orderBy('id', 'desc')
      .first();

    if (!lastProject || !lastProject.project_code) {
      return 'PRJ-0001';
    }

    const matches = lastProject.project_code.match(/PRJ-(\d+)/);
    if (!matches) {
      return 'PRJ-0001';
    }

    const nextNum = parseInt(matches[1], 10) + 1;
    return `PRJ-${String(nextNum).padStart(4, '0')}`;
  }

  private applyVisibilityFilter(
    qb: Knex.QueryBuilder,
    visibility: UserVisibilityContext
  ): Knex.QueryBuilder {
    // Admin and HR see all projects
    if (
      visibility.roles.includes(SYSTEM_ROLES.ADMIN) ||
      visibility.roles.includes(SYSTEM_ROLES.HR)
    ) {
      return qb;
    }

    const empId = visibility.employeeId;
    if (!empId) {
      // If user has no employee identity and is not Admin/HR, they cannot see any project
      return qb.whereRaw('1 = 0');
    }

    // Manager sees projects they manage OR projects where they are manager/team_lead
    if (visibility.roles.includes(SYSTEM_ROLES.MANAGER) || visibility.permissions.includes('projects.view_team')) {
      return qb.where((inner) => {
        inner
          .where('projects.project_manager_id', empId)
          .orWhereExists(function () {
            this.select('*')
              .from('project_members')
              .whereRaw('project_members.project_id = projects.id')
              .andWhere('project_members.employee_id', empId)
              .andWhere('project_members.role', 'in', ['manager', 'team_lead'])
              .whereNull('project_members.left_at');
          });
      });
    }

    // Regular employee sees projects they are a member of
    return qb.whereExists(function () {
      this.select('*')
        .from('project_members')
        .whereRaw('project_members.project_id = projects.id')
        .andWhere('project_members.employee_id', empId)
        .whereNull('project_members.left_at');
    });
  }

  public async findMany(
    params: ProjectQueryParams,
    visibility: UserVisibilityContext
  ): Promise<{ projects: any[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      priority,
      client_id,
      project_manager_id,
      sort = 'created_at',
      order = 'desc',
    } = params;

    const offset = (Number(page) - 1) * Number(limit);

    let query = this.knex('projects')
      .whereNull('projects.deleted_at')
      .join('clients', 'projects.client_id', 'clients.id')
      .leftJoin('employees as pm', 'projects.project_manager_id', 'pm.id')
      .select(
        'projects.*',
        'clients.company_name as client_name',
        this.knex.raw("CONCAT(pm.first_name, ' ', pm.last_name) as project_manager_name"),
        'pm.employee_code as project_manager_code'
      );

    let countQuery = this.knex('projects')
      .whereNull('projects.deleted_at')
      .join('clients', 'projects.client_id', 'clients.id');

    // Apply visibility scoping
    query = this.applyVisibilityFilter(query, visibility);
    countQuery = this.applyVisibilityFilter(countQuery, visibility);

    if (search) {
      const term = `%${search.toLowerCase()}%`;
      const searchClause = (qb: Knex.QueryBuilder) => {
        qb.whereRaw('LOWER(projects.name) LIKE ?', [term])
          .orWhereRaw('LOWER(projects.project_code) LIKE ?', [term])
          .orWhereRaw('LOWER(clients.company_name) LIKE ?', [term]);
      };
      query = query.where(searchClause);
      countQuery = countQuery.where(searchClause);
    }

    if (status) {
      query = query.where('projects.status', status);
      countQuery = countQuery.where('projects.status', status);
    }

    if (priority) {
      query = query.where('projects.priority', priority);
      countQuery = countQuery.where('projects.priority', priority);
    }

    if (client_id) {
      query = query.where('projects.client_id', Number(client_id));
      countQuery = countQuery.where('projects.client_id', Number(client_id));
    }

    if (project_manager_id) {
      query = query.where('projects.project_manager_id', Number(project_manager_id));
      countQuery = countQuery.where('projects.project_manager_id', Number(project_manager_id));
    }

    const [{ total }] = await countQuery.count({ total: '*' });

    const projects = await query
      .orderBy(`projects.${sort}`, order)
      .limit(Number(limit))
      .offset(offset);

    // Format technologies if stored as string JSON
    const formatted = projects.map((p) => ({
      ...p,
      technologies: typeof p.technologies === 'string' ? JSON.parse(p.technologies) : p.technologies || [],
    }));

    return { projects: formatted, total: Number(total) };
  }

  public async findById(
    id: number,
    visibility?: UserVisibilityContext
  ): Promise<ProjectWithDetails | null> {
    let query = this.knex('projects')
      .where('projects.id', id)
      .whereNull('projects.deleted_at')
      .join('clients', 'projects.client_id', 'clients.id')
      .leftJoin('employees as pm', 'projects.project_manager_id', 'pm.id')
      .select(
        'projects.*',
        'clients.company_name as client_name',
        this.knex.raw("CONCAT(pm.first_name, ' ', pm.last_name) as project_manager_name"),
        'pm.employee_code as project_manager_code'
      )
      .first();

    if (visibility) {
      query = this.applyVisibilityFilter(query, visibility);
    }

    const project = await query;
    if (!project) return null;

    const [members, milestones] = await Promise.all([
      this.knex('project_members')
        .join('employees', 'project_members.employee_id', 'employees.id')
        .where({ 'project_members.project_id': id })
        .select(
          'project_members.*',
          this.knex.raw("CONCAT(employees.first_name, ' ', employees.last_name) as employee_name"),
          'employees.employee_code',
          'employees.email'
        )
        .orderBy('project_members.role', 'asc')
        .orderBy('project_members.joined_at', 'asc'),
      this.knex('project_milestones')
        .where({ project_id: id })
        .orderBy('due_date', 'asc'),
    ]);

    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter((m) => m.status === 'completed').length;
    const progress_percent =
      totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    return {
      ...project,
      technologies:
        typeof project.technologies === 'string'
          ? JSON.parse(project.technologies)
          : project.technologies || [],
      members,
      milestones,
      progress_percent,
    };
  }

  public async getMyAssignments(employeeId: number): Promise<any[]> {
    const projects = await this.knex('projects')
      .whereNull('projects.deleted_at')
      .join('project_members', 'projects.id', 'project_members.project_id')
      .join('clients', 'projects.client_id', 'clients.id')
      .where('project_members.employee_id', employeeId)
      .whereNull('project_members.left_at')
      .select(
        'projects.id',
        'projects.project_code',
        'projects.name',
        'projects.status',
        'clients.company_name as client_name',
        'project_members.role as my_role',
        'project_members.allocation_percent'
      )
      .orderBy('projects.name', 'asc');

    const hasTasksTable = await this.knex.schema.hasTable('tasks');
    return Promise.all(
      projects.map(async (p) => {
        let tasks: any[] = [];
        if (hasTasksTable) {
          tasks = await this.knex('tasks')
            .where({ project_id: p.id })
            .where((b) => b.where({ assignee_id: employeeId }).orWhereNull('assignee_id'))
            .whereNotIn('status', ['completed'])
            .select('id', 'task_code', 'title', 'status', 'priority')
            .orderBy('id', 'asc');
        }
        return {
          ...p,
          tasks,
        };
      })
    );
  }

  public async create(data: CreateProjectInput): Promise<ProjectWithDetails> {
    const project_code = await this.getNextProjectCode();

    const [id] = await this.knex('projects').insert({
      project_code,
      client_id: data.client_id,
      name: data.name,
      description: data.description || null,
      project_manager_id: data.project_manager_id || null,
      start_date: data.start_date,
      end_date: data.end_date || null,
      budget: data.budget || 0,
      technologies: JSON.stringify(data.technologies || []),
      priority: data.priority || 'medium',
      status: data.status || 'planning',
    });

    const created = await this.findById(id);
    return created!;
  }

  public async update(id: number, data: UpdateProjectInput): Promise<ProjectWithDetails | null> {
    const updatePayload: any = { ...data, updated_at: this.knex.fn.now() };
    if (data.technologies !== undefined) {
      updatePayload.technologies = JSON.stringify(data.technologies);
    }

    await this.knex('projects').where({ id }).update(updatePayload);
    return this.findById(id);
  }

  public async updateStatus(id: number, status: string): Promise<ProjectWithDetails | null> {
    await this.knex('projects').where({ id }).update({
      status,
      updated_at: this.knex.fn.now(),
    });
    return this.findById(id);
  }

  public async softDelete(id: number): Promise<boolean> {
    const updated = await this.knex('projects')
      .where({ id })
      .whereNull('deleted_at')
      .update({
        deleted_at: this.knex.fn.now(),
      });
    return updated > 0;
  }

  // Members
  public async addMember(projectId: number, data: AddProjectMemberInput): Promise<ProjectMember> {
    const today = new Date().toISOString().split('T')[0];

    const [id] = await this.knex('project_members').insert({
      project_id: projectId,
      employee_id: data.employee_id,
      role: data.role || 'developer',
      allocation_percent: data.allocation_percent || 100,
      joined_at: data.joined_at || today,
    });

    return this.knex('project_members')
      .join('employees', 'project_members.employee_id', 'employees.id')
      .where({ 'project_members.id': id })
      .select(
        'project_members.*',
        this.knex.raw("CONCAT(employees.first_name, ' ', employees.last_name) as employee_name"),
        'employees.employee_code',
        'employees.email'
      )
      .first();
  }

  public async removeMember(projectId: number, employeeId: number): Promise<boolean> {
    const count = await this.knex('project_members')
      .where({ project_id: projectId, employee_id: employeeId })
      .delete();
    return count > 0;
  }

  public async findMember(projectId: number, employeeId: number): Promise<ProjectMember | null> {
    return this.knex('project_members')
      .where({ project_id: projectId, employee_id: employeeId })
      .first();
  }

  // Milestones
  public async addMilestone(projectId: number, data: CreateMilestoneInput): Promise<ProjectMilestone> {
    const [id] = await this.knex('project_milestones').insert({
      project_id: projectId,
      title: data.title,
      description: data.description || null,
      due_date: data.due_date,
      amount: data.amount || 0,
      status: data.status || 'pending',
      completed_at: data.status === 'completed' ? this.knex.fn.now() : null,
    });

    return this.knex('project_milestones').where({ id }).first();
  }

  public async updateMilestone(
    milestoneId: number,
    data: UpdateMilestoneInput
  ): Promise<ProjectMilestone | null> {
    const updatePayload: any = {
      ...data,
      updated_at: this.knex.fn.now(),
    };

    if (data.status === 'completed') {
      updatePayload.completed_at = this.knex.fn.now();
    } else if (data.status) {
      updatePayload.completed_at = null;
    }

    await this.knex('project_milestones').where({ id: milestoneId }).update(updatePayload);
    return this.knex('project_milestones').where({ id: milestoneId }).first();
  }

  public async deleteMilestone(milestoneId: number): Promise<boolean> {
    const count = await this.knex('project_milestones').where({ id: milestoneId }).delete();
    return count > 0;
  }

  public async findMilestoneById(milestoneId: number): Promise<ProjectMilestone | null> {
    return this.knex('project_milestones').where({ id: milestoneId }).first();
  }
}

export const projectsRepository = new ProjectsRepository();
