import { projectsRepository } from './projects.repository';
import { auditService } from '../../shared/services/audit.service';
import { notificationService } from '../../shared/services/notification.service';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../../shared/errors/app-error';
import { db } from '../../db/knex';
import {
  ProjectQueryParams,
  ProjectStatus,
  UserVisibilityContext,
} from './projects.types';
import {
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectMemberInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from './projects.schema';

const LIFECYCLE_ORDER: ProjectStatus[] = [
  'lead',
  'proposal',
  'won',
  'contract',
  'planning',
  'development',
  'testing',
  'uat',
  'deployment',
  'maintenance',
  'completed',
];

export class ProjectsService {
  /**
   * Validate whether a status transition is permitted:
   * 1. Forward progression along lifecycle
   * 2. Any active status can transition to 'on_hold' or 'cancelled'
   * 3. 'on_hold' can transition forward to any valid lifecycle stage or 'cancelled'
   */
  public isValidStatusTransition(current: ProjectStatus, target: ProjectStatus): boolean {
    if (current === target) return true;

    // Moving to on_hold or cancelled is universally permitted from non-terminal states
    if (target === 'on_hold' || target === 'cancelled') {
      return current !== 'cancelled';
    }

    // From on_hold, you can resume to any lifecycle stage
    if (current === 'on_hold') {
      return LIFECYCLE_ORDER.includes(target);
    }

    // Cancelled cannot transition unless explicitly reopened
    if (current === 'cancelled') {
      return target === 'lead' || target === 'planning';
    }

    const currentIndex = LIFECYCLE_ORDER.indexOf(current);
    const targetIndex = LIFECYCLE_ORDER.indexOf(target);

    if (currentIndex === -1 || targetIndex === -1) {
      return false;
    }

    // Allowed forward transitions
    return targetIndex > currentIndex;
  }

  public async getProjects(params: ProjectQueryParams, visibility: UserVisibilityContext) {
    return projectsRepository.findMany(params, visibility);
  }

  public async getProjectById(id: number, visibility: UserVisibilityContext) {
    const project = await projectsRepository.findById(id, visibility);

    if (!project) {
      // Check if project exists without visibility filter to give accurate 403 vs 404
      const unscoped = await projectsRepository.findById(id);
      if (unscoped) {
        throw new ForbiddenError('You do not have permission to view this project');
      }
      throw new NotFoundError(`Project with ID ${id} not found`);
    }

    return project;
  }

  public async getMyAssignments(employeeId: number) {
    return projectsRepository.getMyAssignments(employeeId);
  }

  public async createProject(data: CreateProjectInput, userId?: number, ip?: string) {
    // Validate client exists
    const client = await db('clients')
      .where({ id: data.client_id })
      .whereNull('deleted_at')
      .first();
    if (!client) {
      throw new BadRequestError(`Client with ID ${data.client_id} does not exist`);
    }

    // If PM specified, validate employee exists
    if (data.project_manager_id) {
      const pm = await db('employees')
        .where({ id: data.project_manager_id })
        .whereNull('deleted_at')
        .first();
      if (!pm) {
        throw new BadRequestError(`Project Manager with employee ID ${data.project_manager_id} not found`);
      }
    }

    const created = await projectsRepository.create(data);

    await auditService.record({
      userId,
      action: 'projects.create',
      entity: 'projects',
      entityId: created.id,
      newValue: {
        name: created.name,
        project_code: created.project_code,
        status: created.status,
        budget: created.budget,
      },
      ip,
    });

    return created;
  }

  public async updateProject(
    id: number,
    data: UpdateProjectInput,
    userId?: number,
    ip?: string
  ) {
    const existing = await projectsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Project with ID ${id} not found`);
    }

    if (data.client_id) {
      const client = await db('clients')
        .where({ id: data.client_id })
        .whereNull('deleted_at')
        .first();
      if (!client) {
        throw new BadRequestError(`Client with ID ${data.client_id} does not exist`);
      }
    }

    if (data.project_manager_id) {
      const pm = await db('employees')
        .where({ id: data.project_manager_id })
        .whereNull('deleted_at')
        .first();
      if (!pm) {
        throw new BadRequestError(`Project Manager with employee ID ${data.project_manager_id} not found`);
      }
    }

    const updated = await projectsRepository.update(id, data);

    await auditService.record({
      userId,
      action: 'projects.edit',
      entity: 'projects',
      entityId: id,
      oldValue: {
        name: existing.name,
        budget: existing.budget,
        priority: existing.priority,
      },
      newValue: data,
      ip,
    });

    return updated;
  }

  public async updateStatus(
    id: number,
    targetStatus: ProjectStatus,
    reason?: string,
    userId?: number,
    ip?: string
  ) {
    const existing = await projectsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Project with ID ${id} not found`);
    }

    const isValid = this.isValidStatusTransition(existing.status, targetStatus);
    if (!isValid) {
      throw new BadRequestError(
        `Invalid status transition from '${existing.status}' to '${targetStatus}'. Allowed: forward lifecycle transitions, on_hold, or cancelled.`
      );
    }

    const updated = await projectsRepository.updateStatus(id, targetStatus);

    await auditService.record({
      userId,
      action: 'projects.status_change',
      entity: 'projects',
      entityId: id,
      oldValue: { status: existing.status },
      newValue: { status: targetStatus, reason },
      ip,
    });

    return updated;
  }

  public async deleteProject(id: number, userId?: number, ip?: string) {
    const existing = await projectsRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Project with ID ${id} not found`);
    }

    await projectsRepository.softDelete(id);

    await auditService.record({
      userId,
      action: 'projects.delete',
      entity: 'projects',
      entityId: id,
      oldValue: { project_code: existing.project_code, name: existing.name },
      ip,
    });

    return true;
  }

  // Members
  public async addMember(
    projectId: number,
    data: AddProjectMemberInput,
    userId?: number,
    ip?: string
  ) {
    const project = await projectsRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }

    // Verify employee exists and fetch user_id
    const employee = await db('employees')
      .where({ id: data.employee_id })
      .whereNull('deleted_at')
      .first();
    if (!employee) {
      throw new BadRequestError(`Employee with ID ${data.employee_id} not found`);
    }

    // Check if already assigned
    const existingMember = await projectsRepository.findMember(projectId, data.employee_id);
    if (existingMember) {
      throw new BadRequestError(
        `Employee ${employee.first_name} ${employee.last_name} is already assigned to this project`
      );
    }

    const member = await projectsRepository.addMember(projectId, data);

    // Audit log
    await auditService.record({
      userId,
      action: 'projects.member_add',
      entity: 'project_members',
      entityId: member.id,
      newValue: {
        projectId,
        employeeId: data.employee_id,
        role: member.role,
        allocation: member.allocation_percent,
      },
      ip,
    });

    // Notify employee if linked to a user account
    if (employee.user_id) {
      await notificationService.notify({
        eventKey: `project:${projectId}:member_added:${data.employee_id}:${Date.now()}`,
        userIds: employee.user_id,
        type: 'info',
        title: `Assigned to Project: ${project.name}`,
        message: `You have been added as ${member.role} to ${project.name} (${project.project_code}) with ${member.allocation_percent}% allocation.`,
        link: `/projects/${projectId}`,
      });
    }

    return member;
  }

  public async removeMember(
    projectId: number,
    employeeId: number,
    userId?: number,
    ip?: string
  ) {
    const member = await projectsRepository.findMember(projectId, employeeId);
    if (!member) {
      throw new NotFoundError(`Member with Employee ID ${employeeId} not found in this project`);
    }

    await projectsRepository.removeMember(projectId, employeeId);

    await auditService.record({
      userId,
      action: 'projects.member_remove',
      entity: 'project_members',
      entityId: member.id,
      oldValue: member,
      ip,
    });

    return true;
  }

  // Milestones
  public async addMilestone(
    projectId: number,
    data: CreateMilestoneInput,
    userId?: number,
    ip?: string
  ) {
    const project = await projectsRepository.findById(projectId);
    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found`);
    }

    const milestone = await projectsRepository.addMilestone(projectId, data);

    await auditService.record({
      userId,
      action: 'projects.milestone_add',
      entity: 'project_milestones',
      entityId: milestone.id,
      newValue: { projectId, title: milestone.title, amount: milestone.amount },
      ip,
    });

    return milestone;
  }

  public async updateMilestone(
    projectId: number,
    milestoneId: number,
    data: UpdateMilestoneInput,
    userId?: number,
    ip?: string
  ) {
    const milestone = await projectsRepository.findMilestoneById(milestoneId);
    if (!milestone || milestone.project_id !== projectId) {
      throw new NotFoundError(`Milestone with ID ${milestoneId} not found in this project`);
    }

    const updated = await projectsRepository.updateMilestone(milestoneId, data);

    await auditService.record({
      userId,
      action: 'projects.milestone_edit',
      entity: 'project_milestones',
      entityId: milestoneId,
      oldValue: milestone,
      newValue: data,
      ip,
    });

    return updated;
  }

  public async deleteMilestone(
    projectId: number,
    milestoneId: number,
    userId?: number,
    ip?: string
  ) {
    const milestone = await projectsRepository.findMilestoneById(milestoneId);
    if (!milestone || milestone.project_id !== projectId) {
      throw new NotFoundError(`Milestone with ID ${milestoneId} not found in this project`);
    }

    await projectsRepository.deleteMilestone(milestoneId);

    await auditService.record({
      userId,
      action: 'projects.milestone_delete',
      entity: 'project_milestones',
      entityId: milestoneId,
      oldValue: milestone,
      ip,
    });

    return true;
  }
}

export const projectsService = new ProjectsService();
