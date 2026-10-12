import { Request, Response } from 'express';
import { assetsService } from './assets.service';
import { sendSuccess } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { UnauthorizedError } from '../../shared/errors/app-error';

export class AssetsController {
  public getAssets = asyncHandler(async (req: Request, res: Response) => {
    const { search, category, status, page, limit } = req.query;
    const result = await assetsService.getAssets({
      search: search ? String(search) : undefined,
      category: category ? String(category) : undefined,
      status: status ? String(status) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return sendSuccess(res, result.data, 200, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / result.limit),
    });
  });

  public getAssetById = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await assetsService.getAssetById(id);
    return sendSuccess(res, result, 200);
  });

  public createAsset = asyncHandler(async (req: Request, res: Response) => {
    const created = await assetsService.createAsset(req.body, req.user?.userId);
    return sendSuccess(res, created, 201, undefined, 'Asset registered successfully');
  });

  public updateAsset = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const updated = await assetsService.updateAsset(id, req.body, req.user?.userId);
    return sendSuccess(res, updated, 200, undefined, 'Asset updated successfully');
  });

  public deleteAsset = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await assetsService.deleteAsset(id, req.user?.userId);
    return sendSuccess(res, { deleted: true }, 200, undefined, 'Asset deleted successfully');
  });

  public assignAsset = asyncHandler(async (req: Request, res: Response) => {
    const assetId = Number(req.params.id);
    const result = await assetsService.assignAsset(assetId, req.body, req.user?.userId);
    return sendSuccess(res, result, 200, undefined, 'Asset assigned successfully');
  });

  public returnAsset = asyncHandler(async (req: Request, res: Response) => {
    const assetId = Number(req.params.id);
    const result = await assetsService.returnAsset(assetId, req.body, req.user?.userId);
    return sendSuccess(res, result, 200, undefined, 'Asset returned successfully');
  });

  public createMaintenance = asyncHandler(async (req: Request, res: Response) => {
    const assetId = Number(req.params.id);
    const result = await assetsService.createMaintenance(assetId, req.body, req.user?.userId);
    return sendSuccess(res, result, 201, undefined, 'Asset moved to maintenance');
  });

  public updateMaintenance = asyncHandler(async (req: Request, res: Response) => {
    const maintenanceId = Number(req.params.maintenanceId);
    const result = await assetsService.updateMaintenance(maintenanceId, req.body, req.user?.userId);
    return sendSuccess(res, result, 200, undefined, 'Maintenance record updated');
  });

  public getMyAssets = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user?.employeeId) {
      return sendSuccess(res, [], 200);
    }
    const myAssets = await assetsService.getMyAssets(req.user.employeeId);
    return sendSuccess(res, myAssets, 200);
  });
}

export const assetsController = new AssetsController();
export default assetsController;
