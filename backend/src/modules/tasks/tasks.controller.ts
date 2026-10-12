import { Request, Response } from 'express';
import { tasksService } from './tasks.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { TaskQueryParams } from './tasks.types';

export class TasksController {
  public getAll = asyncHandler(async (req: Request, res: Response) => {
    const params: TaskQueryParams = {
      project_id: req.query.project_id ? Number(req.query.project_id) : undefined,
      module_id: req.query.module_id ? Number(req.query.module_id) : undefined,
      assignee_id: req.query.assignee_id ? Number(req.query.assignee_id) : undefined,
      reviewer_id: req.query.reviewer_id ? Number(req.query.reviewer_id) : undefined,
      status: req.query.status as any,
      priority: req.query.priority as any,
      parent_task_id:
        req.query.parent_task_id !== undefined
          ? req.query.parent_task_id === 'null'
            ? null
            : Number(req.query.parent_task_id)
          : undefined,
      search: req.query.search as string,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    };

    const result = await tasksService.getTasks(params);
    return sendSuccess(res, result.data, 200, {
      total: result.total,
      page: params.page || 1,
      limit: params.limit || 50,
      totalPages: Math.ceil(result.total / (params.limit || 50)),
    });
  });

  public getMyTasks = asyncHandler(async (req: Request, res: Response) => {
    const employeeId = req.user?.employeeId;
    const params: TaskQueryParams = {
      assignee_id: employeeId || undefined,
      status: req.query.status as any,
      priority: req.query.priority as any,
      search: req.query.search as string,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 50,
    };

    const result = await tasksService.getTasks(params);
    return sendSuccess(res, result.data, 200, {
      total: result.total,
      page: params.page || 1,
      limit: params.limit || 50,
      totalPages: Math.ceil(result.total / (params.limit || 50)),
    });
  });

  public getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const task = await tasksService.getTaskById(id);
    return sendSuccess(res, task);
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const created = await tasksService.createTask(req.body, req.user?.userId, ip);
    return sendCreated(res, created, 'Task created successfully');
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const updated = await tasksService.updateTask(id, req.body, req.user?.userId, ip);
    return sendSuccess(res, updated, 200, undefined, 'Task updated successfully');
  });

  public updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const updated = await tasksService.updateStatus(
      id,
      req.body,
      {
        userId: req.user!.userId,
        employeeId: req.user!.employeeId,
        roles: req.user!.roles,
        permissions: req.user!.permissions,
      },
      ip
    );
    return sendSuccess(res, updated, 200, undefined, `Task status updated to ${updated.status}`);
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    await tasksService.deleteTask(id, req.user?.userId, ip);
    return sendSuccess(res, { deleted: true }, 200, undefined, 'Task deleted successfully');
  });

  public addComment = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const comment = await tasksService.addComment(id, req.body, req.user!.userId);
    return sendCreated(res, comment, 'Comment added successfully');
  });

  public getModules = asyncHandler(async (req: Request, res: Response) => {
    const projectId = Number(req.params.projectId || req.query.project_id);
    const modules = await tasksService.getModules(projectId);
    return sendSuccess(res, modules);
  });

  public createModule = asyncHandler(async (req: Request, res: Response) => {
    const module = await tasksService.createModule(req.body);
    return sendCreated(res, module, 'Module created successfully');
  });
}

export const tasksController = new TasksController();
