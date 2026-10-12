import { Request, Response } from 'express';
import { crmService } from './crm.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { LeadStage } from './crm.types';

export class CrmController {
  public getPipelineOverview = asyncHandler(async (req: Request, res: Response) => {
    const overview = await crmService.getPipelineOverview();
    return sendSuccess(res, overview);
  });

  public getLeads = asyncHandler(async (req: Request, res: Response) => {
    const { stage, salesperson_id, search, page, limit } = req.query;

    const result = await crmService.getLeads({
      stage: stage as LeadStage,
      salesperson_id: salesperson_id ? Number(salesperson_id) : undefined,
      search: search as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return sendSuccess(res, result.data, 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  });

  public getLeadById = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const lead = await crmService.getLeadById(id);
    return sendSuccess(res, lead);
  });

  public createLead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);

    const created = await crmService.createLead(req.body, userId, ip);
    return sendCreated(res, created, 'Lead created successfully');
  });

  public updateLead = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userId = req.user?.userId;
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);

    const updated = await crmService.updateLead(id, req.body, userId, ip);
    return sendSuccess(res, updated, 200, undefined, 'Lead updated successfully');
  });

  public updateStage = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userId = req.user?.userId;
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);

    const updated = await crmService.updateStage(
      id,
      req.body.stage as LeadStage,
      req.body.lost_reason,
      userId,
      ip
    );

    return sendSuccess(res, updated, 200, undefined, `Lead moved to ${req.body.stage} stage`);
  });

  public convertLead = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userId = req.user?.userId;
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);

    const result = await crmService.convertLead(id, req.body, userId, ip);
    return sendSuccess(res, result, 200, undefined, 'Lead successfully converted to Client and Project');
  });

  public deleteLead = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userId = req.user?.userId;
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);

    await crmService.deleteLead(id, userId, ip);
    return sendSuccess(res, { id }, 200, undefined, 'Lead deleted successfully');
  });

  public addActivity = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userId = req.user?.userId;

    const activities = await crmService.addActivity(id, req.body, userId);
    return sendCreated(res, activities, 'Activity logged successfully');
  });

  public getActivities = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const activities = await crmService.getActivities(id);
    return sendSuccess(res, activities);
  });
}

export const crmController = new CrmController();
