import { Request, Response } from 'express';
import { designationsService } from './designations.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';

export class DesignationsController {
  public getAll = asyncHandler(async (_req: Request, res: Response) => {
    const designations = await designationsService.getAllDesignations();
    return sendSuccess(res, designations, 200);
  });

  public getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const designation = await designationsService.getDesignationById(id);
    return sendSuccess(res, designation, 200);
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const designation = await designationsService.createDesignation(req.body, req.user?.userId, ip);
    return sendCreated(res, designation, 'Designation created successfully');
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    const designation = await designationsService.updateDesignation(id, req.body, req.user?.userId, ip);
    return sendSuccess(res, designation, 200, undefined, 'Designation updated successfully');
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const ip = req.ip || (req.headers['x-forwarded-for'] as string);
    await designationsService.deleteDesignation(id, req.user?.userId, ip);
    return sendSuccess(res, { deleted: true }, 200, undefined, 'Designation deleted successfully');
  });
}

export const designationsController = new DesignationsController();
export default designationsController;
