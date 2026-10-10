import { Request, Response } from 'express';
import { holidaysService } from './holidays.service';
import { sendSuccess } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { auditService } from '../../shared/services/audit.service';

export class HolidaysController {
  public getAll = asyncHandler(async (req: Request, res: Response) => {
    const { year, month, type } = req.query as {
      year?: string;
      month?: string;
      type?: string;
    };
    const holidays = await holidaysService.getAll({
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      type,
    });
    return sendSuccess(res, holidays);
  });

  public getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const holiday = await holidaysService.getById(id);
    return sendSuccess(res, holiday);
  });

  public create = asyncHandler(async (req: Request, res: Response) => {
    const holiday = await holidaysService.create(req.body);

    if (req.user) {
      await auditService.record({
        userId: req.user.userId,
        action: 'holidays.create',
        entity: 'holidays',
        entityId: holiday.id,
        newValue: holiday,
        ip: req.ip,
      });
    }

    return sendSuccess(res, holiday, 201, undefined, 'Holiday created successfully');
  });

  public update = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const prior = await holidaysService.getById(id);
    const updated = await holidaysService.update(id, req.body);

    if (req.user) {
      await auditService.record({
        userId: req.user.userId,
        action: 'holidays.edit',
        entity: 'holidays',
        entityId: id,
        oldValue: prior,
        newValue: updated,
        ip: req.ip,
      });
    }

    return sendSuccess(res, updated, 200, undefined, 'Holiday updated successfully');
  });

  public delete = asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const prior = await holidaysService.getById(id);
    await holidaysService.delete(id);

    if (req.user) {
      await auditService.record({
        userId: req.user.userId,
        action: 'holidays.delete',
        entity: 'holidays',
        entityId: id,
        oldValue: prior,
        ip: req.ip,
      });
    }

    return sendSuccess(res, null, 200, undefined, 'Holiday deleted successfully');
  });

  public getWorkSettings = asyncHandler(async (req: Request, res: Response) => {
    const settings = await holidaysService.getWorkSettings();
    return sendSuccess(res, settings);
  });

  public updateWorkSettings = asyncHandler(async (req: Request, res: Response) => {
    const prior = await holidaysService.getWorkSettings();
    const updated = await holidaysService.updateWorkSettings(req.body);

    if (req.user) {
      await auditService.record({
        userId: req.user.userId,
        action: 'work_settings.edit',
        entity: 'work_settings',
        entityId: updated.id,
        oldValue: prior,
        newValue: updated,
        ip: req.ip,
      });
    }

    return sendSuccess(res, updated, 200, undefined, 'Work settings updated successfully');
  });

  public getWorkingDays = asyncHandler(async (req: Request, res: Response) => {
    const year = Number(req.query.year || new Date().getFullYear());
    const month = Number(req.query.month || new Date().getMonth() + 1);
    const result = await holidaysService.getWorkingDays(year, month);
    return sendSuccess(res, result);
  });
}

export const holidaysController = new HolidaysController();
