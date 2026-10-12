import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { sendSuccess } from '../../shared/utils/response.util';
import { registryService } from './registry.service';

export class RegistryController {
  private normalizeUser(req: Request) {
    const user = req.user!;
    return {
      userId: user.userId,
      employee_id: user.employeeId,
      employeeId: user.employeeId,
      roles: user.roles || [],
      role: user.roles?.[0] || 'Employee',
      permissions: user.permissions || [],
    };
  }

  getDashboardWidgets = asyncHandler(async (req: Request, res: Response) => {
    const user = this.normalizeUser(req);
    const widgets = await registryService.getDashboardWidgets(user);
    sendSuccess(res, widgets);
  });

  getDashboardWidgetById = asyncHandler(async (req: Request, res: Response) => {
    const user = this.normalizeUser(req);
    const { id } = req.params;
    const widgetData = await registryService.getDashboardWidgetById(id, user);
    sendSuccess(res, widgetData);
  });

  getAvailableReports = asyncHandler(async (req: Request, res: Response) => {
    const user = this.normalizeUser(req);
    const reports = registryService.getAvailableReports(user);
    sendSuccess(res, reports);
  });

  runReport = asyncHandler(async (req: Request, res: Response) => {
    const user = this.normalizeUser(req);
    const { id } = req.params;
    const filters = {
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
      ...req.query,
    };
    const result = await registryService.runReport(id, filters, user);
    sendSuccess(res, result);
  });

  exportReport = asyncHandler(async (req: Request, res: Response) => {
    const user = this.normalizeUser(req);
    const { id } = req.params;
    const format = (req.query.format === 'json' ? 'json' : 'csv') as 'csv' | 'json';
    const filters = {
      fromDate: req.query.fromDate as string | undefined,
      toDate: req.query.toDate as string | undefined,
      ...req.query,
    };

    const exported = await registryService.exportReport(id, filters, format, user);
    res.setHeader('Content-Type', exported.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exported.filename}"`);
    res.send(exported.data);
  });
}

export const registryController = new RegistryController();
