import { Request, Response } from 'express';
import { projectsService } from './projects.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { UserVisibilityContext } from './projects.types';
import { UnauthorizedError, ForbiddenError } from '../../shared/errors/app-error';

export class ProjectsController {
  private getVisibilityContext(req: Request): UserVisibilityContext {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    return {
      userId: req.user.userId,
      employeeId: req.user.employeeId ?? null,
      roles: req.user.roles || [],
      permissions: req.user.permissions || [],
    };
  }

  public getAll = asyncHandler(async (req: Request, res: Response) => {
    const visibility = this.getVisibilityContext(req);
    const queryParams: any = req.query;
    const { projects, total } = await projectsService.getProjects(queryParams, visibility);
    const limit = Number(queryParams.limit) || 20;
    const page = Number(queryParams.page) || 1;

    return sendSuccess(res, projects, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  });

  public getMyAssignments = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    if (!req.user.employeeId) {
      throw new ForbiddenError('Action requires an employee identity');
    }

    const assignments = await projectsService.getMyAssignments(req.user.employeeId);
    return sendSuccess(res, assignments, 200);
  });

  public getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const visibility = this.getVisibilityContext(req);
    const project = await projectsService.getProjectById(id, visibility);
    return sendSuccess(res, project, 200);
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const project = await projectsService.createProject(req.body, req.user?.userId, ip);
    return sendCreated(res, project, `Project ${project.project_code} created successfully`);
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const project = await projectsService.updateProject(id, req.body, req.user?.userId, ip);
    return sendSuccess(res, project, 200, undefined, 'Project updated successfully');
  });

  public updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const { status, reason } = req.body;
    const project = await projectsService.updateStatus(id, status, reason, req.user?.userId, ip);
    return sendSuccess(res, project, 200, undefined, `Project status transitioned to ${status}`);
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    await projectsService.deleteProject(id, req.user?.userId, ip);
    return sendSuccess(res, { id }, 200, undefined, 'Project deleted successfully');
  });

  // Members
  public addMember = asyncHandler(async (req: Request, res: Response) => {
    const projectId = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const member = await projectsService.addMember(projectId, req.body, req.user?.userId, ip);
    return sendCreated(res, member, 'Member added to project successfully');
  });

  public removeMember = asyncHandler(async (req: Request, res: Response) => {
    const projectId = Number(req.params.id);
    const employeeId = Number(req.params.employeeId);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    await projectsService.removeMember(projectId, employeeId, req.user?.userId, ip);
    return sendSuccess(res, { employeeId }, 200, undefined, 'Member removed from project successfully');
  });

  // Milestones
  public addMilestone = asyncHandler(async (req: Request, res: Response) => {
    const projectId = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const milestone = await projectsService.addMilestone(projectId, req.body, req.user?.userId, ip);
    return sendCreated(res, milestone, 'Milestone created successfully');
  });

  public updateMilestone = asyncHandler(async (req: Request, res: Response) => {
    const projectId = Number(req.params.id);
    const milestoneId = Number(req.params.milestoneId);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const milestone = await projectsService.updateMilestone(
      projectId,
      milestoneId,
      req.body,
      req.user?.userId,
      ip
    );
    return sendSuccess(res, milestone, 200, undefined, 'Milestone updated successfully');
  });

  public deleteMilestone = asyncHandler(async (req: Request, res: Response) => {
    const projectId = Number(req.params.id);
    const milestoneId = Number(req.params.milestoneId);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    await projectsService.deleteMilestone(projectId, milestoneId, req.user?.userId, ip);
    return sendSuccess(res, { milestoneId }, 200, undefined, 'Milestone deleted successfully');
  });
}

export const projectsController = new ProjectsController();
