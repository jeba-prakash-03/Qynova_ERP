import db from '../../db/knex';
import { Knex } from 'knex';
import {
  Task,
  TaskWithDetails,
  TaskComment,
  TaskHistory,
  ProjectModule,
  TaskQueryParams,
} from './tasks.types';
import { CreateTaskInput, UpdateTaskInput, CreateModuleInput } from './tasks.schema';

export class TasksRepository {
  public async generateTaskCode(trx?: Knex.Transaction): Promise<string> {
    const q = trx ? trx('tasks') : db('tasks');
    const last = await q.orderBy('id', 'desc').first();
    const nextNum = last ? 1000 + Number(last.id) + 1 : 1001;
    return `TASK-${nextNum}`;
  }

  public async findMany(params: TaskQueryParams): Promise<{ data: Task[]; total: number }> {
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    const baseQuery = db('tasks as t')
      .join('projects as p', 't.project_id', 'p.id')
      .leftJoin('project_modules as m', 't.module_id', 'm.id')
      .leftJoin('employees as a', 't.assignee_id', 'a.id')
      .leftJoin('employees as r', 't.reviewer_id', 'r.id')
      .whereNull('p.deleted_at');

    if (params.project_id) {
      baseQuery.where('t.project_id', params.project_id);
    }
    if (params.module_id) {
      baseQuery.where('t.module_id', params.module_id);
    }
    if (params.assignee_id) {
      baseQuery.where('t.assignee_id', params.assignee_id);
    }
    if (params.reviewer_id) {
      baseQuery.where('t.reviewer_id', params.reviewer_id);
    }
    if (params.status) {
      baseQuery.where('t.status', params.status);
    }
    if (params.priority) {
      baseQuery.where('t.priority', params.priority);
    }
    if (params.parent_task_id !== undefined) {
      if (params.parent_task_id === null) {
        baseQuery.whereNull('t.parent_task_id');
      } else {
        baseQuery.where('t.parent_task_id', params.parent_task_id);
      }
    }
    if (params.search) {
      const term = `%${params.search}%`;
      baseQuery.where((b) => {
        b.where('t.task_code', 'like', term)
          .orWhere('t.title', 'like', term)
          .orWhere('t.description', 'like', term);
      });
    }

    const countRes = await baseQuery.clone().count<{ total: number }>('t.id as total').first();
    const total = Number(countRes?.total || 0);

    const rows = await baseQuery
      .select(
        't.*',
        'p.name as project_name',
        'p.project_code',
        'm.name as module_name',
        'a.employee_code as assignee_code',
        db.raw("CONCAT(a.first_name, ' ', a.last_name) as assignee_name"),
        'r.employee_code as reviewer_code',
        db.raw("CONCAT(r.first_name, ' ', r.last_name) as reviewer_name")
      )
      .orderBy('t.id', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      data: rows.map(this.formatTask),
      total,
    };
  }

  public async findById(id: number): Promise<TaskWithDetails | null> {
    const row = await db('tasks as t')
      .join('projects as p', 't.project_id', 'p.id')
      .leftJoin('project_modules as m', 't.module_id', 'm.id')
      .leftJoin('employees as a', 't.assignee_id', 'a.id')
      .leftJoin('employees as r', 't.reviewer_id', 'r.id')
      .where('t.id', id)
      .whereNull('p.deleted_at')
      .select(
        't.*',
        'p.name as project_name',
        'p.project_code',
        'm.name as module_name',
        'a.employee_code as assignee_code',
        db.raw("CONCAT(a.first_name, ' ', a.last_name) as assignee_name"),
        'r.employee_code as reviewer_code',
        db.raw("CONCAT(r.first_name, ' ', r.last_name) as reviewer_name")
      )
      .first();

    if (!row) return null;

    const [subtasks, comments, history] = await Promise.all([
      this.findSubtasks(id),
      this.findComments(id),
      this.findHistory(id),
    ]);

    return {
      ...this.formatTask(row),
      subtasks,
      comments,
      history,
    };
  }

  public async findRawById(id: number, trx?: Knex.Transaction): Promise<Task | null> {
    const q = trx ? trx('tasks') : db('tasks');
    const row = await q.where({ id }).first();
    return row ? this.formatTask(row) : null;
  }

  public async findSubtasks(parentTaskId: number): Promise<Task[]> {
    const rows = await db('tasks as t')
      .leftJoin('employees as a', 't.assignee_id', 'a.id')
      .where('t.parent_task_id', parentTaskId)
      .select(
        't.*',
        'a.employee_code as assignee_code',
        db.raw("CONCAT(a.first_name, ' ', a.last_name) as assignee_name")
      )
      .orderBy('t.id', 'asc');

    return rows.map(this.formatTask);
  }

  public async findIncompleteSubtasks(parentTaskId: number): Promise<Task[]> {
    const rows = await db('tasks')
      .where('parent_task_id', parentTaskId)
      .whereNot('status', 'completed');
    return rows.map(this.formatTask);
  }

  public async create(data: CreateTaskInput, userId?: number): Promise<Task> {
    return db.transaction(async (trx) => {
      const task_code = await this.generateTaskCode(trx);
      const [id] = await trx('tasks').insert({
        task_code,
        project_id: data.project_id,
        module_id: data.module_id || null,
        parent_task_id: data.parent_task_id || null,
        title: data.title,
        description: data.description || null,
        assignee_id: data.assignee_id || null,
        reviewer_id: data.reviewer_id || null,
        priority: data.priority || 'medium',
        status: data.status || 'backlog',
        due_date: data.due_date || null,
        estimated_hours: data.estimated_hours || 0,
        actual_hours: 0,
        created_by: userId || null,
      });

      await trx('task_history').insert({
        task_id: id,
        user_id: userId || null,
        field_changed: 'status',
        old_value: null,
        new_value: data.status || 'backlog',
      });

      const created = await trx('tasks').where({ id }).first();
      return this.formatTask(created);
    });
  }

  public async update(id: number, data: UpdateTaskInput, userId?: number): Promise<Task> {
    await db('tasks').where({ id }).update({
      module_id: data.module_id !== undefined ? data.module_id : undefined,
      parent_task_id: data.parent_task_id !== undefined ? data.parent_task_id : undefined,
      title: data.title !== undefined ? data.title : undefined,
      description: data.description !== undefined ? data.description : undefined,
      assignee_id: data.assignee_id !== undefined ? data.assignee_id : undefined,
      reviewer_id: data.reviewer_id !== undefined ? data.reviewer_id : undefined,
      priority: data.priority !== undefined ? data.priority : undefined,
      due_date: data.due_date !== undefined ? data.due_date : undefined,
      estimated_hours: data.estimated_hours !== undefined ? data.estimated_hours : undefined,
    });

    const updated = await this.findRawById(id);
    return updated!;
  }

  public async updateStatus(id: number, status: string, trx?: Knex.Transaction): Promise<void> {
    const q = trx ? trx('tasks') : db('tasks');
    await q.where({ id }).update({ status });
  }

  public async delete(id: number): Promise<void> {
    await db('tasks').where({ id }).del();
  }

  // Comments
  public async findComments(taskId: number): Promise<TaskComment[]> {
    const rows = await db('task_comments as c')
      .join('users as u', 'c.user_id', 'u.id')
      .leftJoin('employees as e', 'u.id', 'e.user_id')
      .where('c.task_id', taskId)
      .select(
        'c.*',
        'u.email as user_email',
        db.raw("COALESCE(CONCAT(e.first_name, ' ', e.last_name), u.email) as user_name")
      )
      .orderBy('c.created_at', 'asc');

    return rows.map((r: any) => ({
      id: Number(r.id),
      task_id: Number(r.task_id),
      user_id: Number(r.user_id),
      comment: r.comment,
      user_name: r.user_name,
      user_email: r.user_email,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  public async addComment(taskId: number, userId: number, comment: string): Promise<TaskComment> {
    const [id] = await db('task_comments').insert({
      task_id: taskId,
      user_id: userId,
      comment,
    });

    const created = await db('task_comments as c')
      .join('users as u', 'c.user_id', 'u.id')
      .leftJoin('employees as e', 'u.id', 'e.user_id')
      .where('c.id', id)
      .select(
        'c.*',
        'u.email as user_email',
        db.raw("COALESCE(CONCAT(e.first_name, ' ', e.last_name), u.email) as user_name")
      )
      .first();

    return {
      id: Number(created.id),
      task_id: Number(created.task_id),
      user_id: Number(created.user_id),
      comment: created.comment,
      user_name: created.user_name,
      user_email: created.user_email,
      created_at: created.created_at,
      updated_at: created.updated_at,
    };
  }

  // History
  public async findHistory(taskId: number): Promise<TaskHistory[]> {
    const rows = await db('task_history as h')
      .leftJoin('users as u', 'h.user_id', 'u.id')
      .leftJoin('employees as e', 'u.id', 'e.user_id')
      .where('h.task_id', taskId)
      .select(
        'h.*',
        db.raw("COALESCE(CONCAT(e.first_name, ' ', e.last_name), u.email, 'System') as user_name")
      )
      .orderBy('h.created_at', 'desc');

    return rows.map((r: any) => ({
      id: Number(r.id),
      task_id: Number(r.task_id),
      user_id: r.user_id ? Number(r.user_id) : null,
      user_name: r.user_name,
      field_changed: r.field_changed,
      old_value: r.old_value,
      new_value: r.new_value,
      created_at: r.created_at,
    }));
  }

  public async recordHistory(
    taskId: number,
    userId: number | null,
    fieldChanged: string,
    oldValue: string | null,
    newValue: string | null,
    trx?: Knex.Transaction
  ): Promise<void> {
    const q = trx ? trx('task_history') : db('task_history');
    await q.insert({
      task_id: taskId,
      user_id: userId || null,
      field_changed: fieldChanged,
      old_value: oldValue,
      new_value: newValue,
    });
  }

  // Modules
  public async findModules(projectId: number): Promise<ProjectModule[]> {
    return db('project_modules').where({ project_id: projectId }).orderBy('name', 'asc');
  }

  public async createModule(data: CreateModuleInput): Promise<ProjectModule> {
    const [id] = await db('project_modules').insert({
      project_id: data.project_id,
      name: data.name,
      description: data.description || null,
    });
    return (await db('project_modules').where({ id }).first())!;
  }

  private formatTask(r: any): Task {
    return {
      id: Number(r.id),
      task_code: r.task_code,
      project_id: Number(r.project_id),
      module_id: r.module_id ? Number(r.module_id) : null,
      parent_task_id: r.parent_task_id ? Number(r.parent_task_id) : null,
      title: r.title,
      description: r.description,
      assignee_id: r.assignee_id ? Number(r.assignee_id) : null,
      reviewer_id: r.reviewer_id ? Number(r.reviewer_id) : null,
      priority: r.priority,
      status: r.status,
      due_date: r.due_date ? String(r.due_date).split('T')[0] : null,
      estimated_hours: Number(r.estimated_hours || 0),
      actual_hours: Number(r.actual_hours || 0),
      created_by: r.created_by ? Number(r.created_by) : null,
      created_at: r.created_at,
      updated_at: r.updated_at,
      project_name: r.project_name,
      project_code: r.project_code,
      module_name: r.module_name,
      assignee_name: r.assignee_name,
      assignee_code: r.assignee_code,
      reviewer_name: r.reviewer_name,
      reviewer_code: r.reviewer_code,
    };
  }
}

export const tasksRepository = new TasksRepository();
