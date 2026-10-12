import { tasksRepository } from './tasks.repository';
import { timesheetIntegrationService } from '../projects/timesheet-integration.service';
import { auditService } from '../../shared/services/audit.service';
import { notificationService } from '../../shared/services/notification.service';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../shared/errors/app-error';
import db from '../../db/knex';
import {
  Task,
  TaskStatus,
  TaskWithDetails,
  TaskQueryParams,
  ProjectModule,
  TaskComment,
} from './tasks.types';
import {
  CreateTaskInput,
  UpdateTaskInput,
  UpdateTaskStatusInput,
  CreateCommentInput,
  CreateModuleInput,
} from './tasks.schema';

const ALLOWED_NEXT_STATUS: Record<TaskStatus, TaskStatus[]> = {
  backlog: ['todo'],
  todo: ['in_progress'],
  in_progress: ['code_review'],
  code_review: ['testing', 'changes_required'],
  changes_required: ['in_progress'],
  testing: ['qa_passed', 'changes_required'],
  qa_passed: ['completed'],
  completed: ['backlog'],
};

export class TasksService {
  public async getTasks(params: TaskQueryParams): Promise<{ data: Task[]; total: number }> {
    const result = await tasksRepository.findMany(params);

    // Populate actual_hours from approved timesheets
    const enriched = await Promise.all(
      result.data.map(async (task) => {
        const approvedMinutes = await timesheetIntegrationService.getApprovedMinutesByTask(task.id);
        const actual_hours = Math.round((approvedMinutes / 60) * 100) / 100;
        return {
          ...task,
          actual_hours,
        };
      })
    );

    return {
      data: enriched,
      total: result.total,
    };
  }

  public async getTaskById(id: number): Promise<TaskWithDetails> {
    const task = await tasksRepository.findById(id);
    if (!task) {
      throw new NotFoundError(`Task with ID ${id} not found`);
    }

    const approvedMinutes = await timesheetIntegrationService.getApprovedMinutesByTask(id);
    const actual_hours = Math.round((approvedMinutes / 60) * 100) / 100;

    return {
      ...task,
      actual_hours,
    };
  }

  public async createTask(data: CreateTaskInput, currentUserId?: number, ip?: string): Promise<Task> {
    // 1. Verify project exists
    const project = await db('projects').where({ id: data.project_id }).whereNull('deleted_at').first();
    if (!project) {
      throw new BadRequestError(`Project with ID ${data.project_id} does not exist`, [
        { field: 'project_id', message: `Project with ID ${data.project_id} does not exist` },
      ]);
    }

    // 2. Verify assignee is a project member if provided
    if (data.assignee_id) {
      const isMember = await db('project_members')
        .where({ project_id: data.project_id, employee_id: data.assignee_id })
        .first();
      if (!isMember) {
        throw new BadRequestError('The assignee must be an active project member', [
          { field: 'assignee_id', message: 'The assignee must be an active project member' },
        ]);
      }
    }

    // 3. Verify reviewer is an employee if provided
    if (data.reviewer_id) {
      const reviewer = await db('employees').where({ id: data.reviewer_id }).whereNull('deleted_at').first();
      if (!reviewer) {
        throw new BadRequestError('The reviewer employee does not exist', [
          { field: 'reviewer_id', message: 'The reviewer employee does not exist' },
        ]);
      }
    }

    const created = await tasksRepository.create(data, currentUserId);

    await auditService.record({
      userId: currentUserId,
      action: 'tasks.create',
      entity: 'tasks',
      entityId: created.id,
      newValue: {
        task_code: created.task_code,
        title: created.title,
        project_id: created.project_id,
        status: created.status,
      },
      ip,
    });

    // Notify assignee if assigned upon creation
    if (data.assignee_id) {
      await this.notifyAssignee(created, data.assignee_id);
    }

    return created;
  }

  public async updateTask(
    id: number,
    data: UpdateTaskInput,
    currentUserId?: number,
    ip?: string
  ): Promise<Task> {
    const existing = await tasksRepository.findRawById(id);
    if (!existing) {
      throw new NotFoundError(`Task with ID ${id} not found`);
    }

    // If updating assignee, verify project membership
    if (data.assignee_id && data.assignee_id !== existing.assignee_id) {
      const isMember = await db('project_members')
        .where({ project_id: existing.project_id, employee_id: data.assignee_id })
        .first();
      if (!isMember) {
        throw new BadRequestError('The assignee must be an active project member', [
          { field: 'assignee_id', message: 'The assignee must be an active project member' },
        ]);
      }
    }

    const updated = await tasksRepository.update(id, data, currentUserId);

    // Record history for updated fields
    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined && (existing as any)[key] !== val) {
        await tasksRepository.recordHistory(
          id,
          currentUserId || null,
          key,
          String((existing as any)[key] ?? ''),
          String(val ?? '')
        );
      }
    }

    await auditService.record({
      userId: currentUserId,
      action: 'tasks.edit',
      entity: 'tasks',
      entityId: id,
      oldValue: existing,
      newValue: data,
      ip,
    });

    // Notify new assignee if changed
    if (data.assignee_id && data.assignee_id !== existing.assignee_id) {
      await this.notifyAssignee(updated, data.assignee_id);
    }

    return updated;
  }

  public async updateStatus(
    id: number,
    input: UpdateTaskStatusInput,
    currentUser: {
      userId: number;
      employeeId: number | null;
      roles: string[];
      permissions: string[];
    },
    ip?: string
  ): Promise<Task> {
    const task = await tasksRepository.findRawById(id);
    if (!task) {
      throw new NotFoundError(`Task with ID ${id} not found`);
    }

    const currentStatus = task.status;
    const targetStatus = input.status;

    if (currentStatus === targetStatus) {
      return task;
    }

    // 1. Workflow validation: verify transition is allowed in the state machine
    const allowed = ALLOWED_NEXT_STATUS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestError(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed next statuses: [${allowed.join(', ')}]`,
        [
          {
            field: 'status',
            message: `Allowed next statuses from '${currentStatus}' are: [${allowed.join(', ')}]`,
          },
        ]
      );
    }

    // 2. Fetch project details to check if current user is PM or Admin
    const project = await db('projects').where({ id: task.project_id }).first();
    const isAdmin = currentUser.roles.includes('Admin');
    const isProjectManager =
      currentUser.employeeId && project && project.project_manager_id === currentUser.employeeId;
    const canOverride = isAdmin || isProjectManager;

    const isAssignee = currentUser.employeeId && task.assignee_id === currentUser.employeeId;
    const isReviewer = currentUser.employeeId && task.reviewer_id === currentUser.employeeId;

    // Role-based transition enforcement:
    // - Only assignee can move to code_review
    if (targetStatus === 'code_review' && !isAssignee && !canOverride) {
      throw new ForbiddenError('Only the task assignee can move this task to code_review');
    }

    // - Only reviewer can move to changes_required, testing, qa_passed
    if (
      ['changes_required', 'testing', 'qa_passed'].includes(targetStatus) &&
      !isReviewer &&
      !canOverride
    ) {
      throw new ForbiddenError(
        `Only the task reviewer can move this task to ${targetStatus}`
      );
    }

    // 3. Subtask completion check: A parent task cannot be completed until its subtasks are
    if (targetStatus === 'completed') {
      const incomplete = await tasksRepository.findIncompleteSubtasks(id);
      if (incomplete.length > 0) {
        throw new BadRequestError(
          'A parent task cannot be completed until all its subtasks are completed',
          [
            {
              field: 'status',
              message: `Cannot complete parent task while ${incomplete.length} subtask(s) remain incomplete`,
            },
          ]
        );
      }
    }

    // Perform status update in transaction
    await db.transaction(async (trx) => {
      await tasksRepository.updateStatus(id, targetStatus, trx);

      await tasksRepository.recordHistory(
        id,
        currentUser.userId,
        'status',
        currentStatus,
        targetStatus,
        trx
      );

      if (input.comment) {
        await trx('task_comments').insert({
          task_id: id,
          user_id: currentUser.userId,
          comment: `[Status changed to ${targetStatus}] ${input.comment}`,
        });
      }
    });

    await auditService.record({
      userId: currentUser.userId,
      action: 'tasks.status_change',
      entity: 'tasks',
      entityId: id,
      oldValue: { status: currentStatus },
      newValue: { status: targetStatus, comment: input.comment },
      ip,
    });

    // 4. Notifications based on workflow transitions
    // a. Sent to review: notify reviewer
    if (targetStatus === 'code_review' && task.reviewer_id) {
      const reviewer = await db('employees').where({ id: task.reviewer_id }).first();
      if (reviewer?.user_id) {
        await notificationService.notify({
          eventKey: `task:${task.id}:review_requested:${Date.now()}`,
          userIds: reviewer.user_id,
          type: 'info',
          title: `Code Review Requested: ${task.title}`,
          message: `Task ${task.task_code} has been submitted for code review by the assignee.`,
          link: `/tasks?projectId=${task.project_id}&taskId=${task.id}`,
        });
      }
    }

    // b. Changes required: notify assignee
    if (targetStatus === 'changes_required' && task.assignee_id) {
      const assignee = await db('employees').where({ id: task.assignee_id }).first();
      if (assignee?.user_id) {
        await notificationService.notify({
          eventKey: `task:${task.id}:changes_required:${Date.now()}`,
          userIds: assignee.user_id,
          type: 'warning',
          title: `Changes Required: ${task.title}`,
          message: `Reviewer requested changes on ${task.task_code}: "${input.comment || 'Please address review feedback'}"`,
          link: `/tasks?projectId=${task.project_id}&taskId=${task.id}`,
        });
      }
    }

    const updated = await this.getTaskById(id);
    return updated;
  }

  public async deleteTask(id: number, currentUserId?: number, ip?: string): Promise<void> {
    const existing = await tasksRepository.findRawById(id);
    if (!existing) {
      throw new NotFoundError(`Task with ID ${id} not found`);
    }

    await tasksRepository.delete(id);

    await auditService.record({
      userId: currentUserId,
      action: 'tasks.delete',
      entity: 'tasks',
      entityId: id,
      oldValue: existing,
      ip,
    });
  }

  // Comments
  public async addComment(
    taskId: number,
    data: CreateCommentInput,
    currentUserId: number
  ): Promise<TaskComment> {
    const task = await tasksRepository.findRawById(taskId);
    if (!task) {
      throw new NotFoundError(`Task with ID ${taskId} not found`);
    }

    const comment = await tasksRepository.addComment(taskId, currentUserId, data.comment);

    // Notify assignee if someone else commented
    if (task.assignee_id) {
      const assignee = await db('employees').where({ id: task.assignee_id }).first();
      if (assignee?.user_id && assignee.user_id !== currentUserId) {
        await notificationService.notify({
          eventKey: `task:${taskId}:comment:${Date.now()}`,
          userIds: assignee.user_id,
          type: 'info',
          title: `New Comment on ${task.task_code}`,
          message: `A new comment was added to "${task.title}".`,
          link: `/tasks?projectId=${task.project_id}&taskId=${task.id}`,
        });
      }
    }

    return comment;
  }

  // Modules
  public async getModules(projectId: number): Promise<ProjectModule[]> {
    return tasksRepository.findModules(projectId);
  }

  public async createModule(data: CreateModuleInput): Promise<ProjectModule> {
    const project = await db('projects').where({ id: data.project_id }).whereNull('deleted_at').first();
    if (!project) {
      throw new NotFoundError(`Project with ID ${data.project_id} not found`);
    }
    return tasksRepository.createModule(data);
  }

  // Cron reminder: due tomorrow
  public async sendDueTomorrowReminders(): Promise<number> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const tasksDue = await db('tasks as t')
      .join('employees as e', 't.assignee_id', 'e.id')
      .where('t.due_date', tomorrowStr)
      .whereNot('t.status', 'completed')
      .whereNotNull('e.user_id')
      .select('t.*', 'e.user_id as assignee_user_id');

    let count = 0;
    for (const t of tasksDue) {
      try {
        await notificationService.notify({
          eventKey: `task:${t.id}:due_tomorrow:${tomorrowStr}`,
          userIds: t.assignee_user_id,
          type: 'warning',
          title: `Task Due Tomorrow: ${t.task_code}`,
          message: `Task "${t.title}" is due tomorrow (${tomorrowStr}).`,
          link: `/tasks?projectId=${t.project_id}&taskId=${t.id}`,
        });
        count++;
      } catch {
        // Skip duplicate or notification errors
      }
    }

    return count;
  }

  private async notifyAssignee(task: Task, employeeId: number): Promise<void> {
    const employee = await db('employees').where({ id: employeeId }).first();
    if (employee?.user_id) {
      await notificationService.notify({
        eventKey: `task:${task.id}:assigned:${employeeId}:${Date.now()}`,
        userIds: employee.user_id,
        type: 'info',
        title: `Task Assigned: ${task.title}`,
        message: `You have been assigned to task ${task.task_code} (${task.priority} priority).`,
        link: `/tasks?projectId=${task.project_id}&taskId=${task.id}`,
      });
    }
  }
}

export const tasksService = new TasksService();
