import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { sendSuccess } from '../../shared/utils/response.util';
import {
  getDashboardWidgets,
  executeDashboardWidget,
  getReports,
  executeReport,
  getReportDefinition,
  generateExcelReport,
  generatePdfReport,
} from '../../shared/registry';
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error';

export class RegistryController {
  // ==========================================
  // DASHBOARD WIDGETS
  // ==========================================
  public listWidgets = asyncHandler(async (req: Request, res: Response) => {
    const widgets = getDashboardWidgets(req.user!);
    return sendSuccess(res, widgets, 200, undefined, 'Dashboard widgets retrieved successfully');
  });

  public getWidgetData = asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;
    if (!key) {
      throw new BadRequestError('Widget key is required');
    }

    const data = await executeDashboardWidget(key, req.user!, req.query);
    return sendSuccess(res, data, 200, undefined, `Widget data for '${key}' retrieved successfully`);
  });

  // ==========================================
  // REPORTS
  // ==========================================
  public listReports = asyncHandler(async (req: Request, res: Response) => {
    const reports = getReports(req.user!);
    return sendSuccess(res, reports, 200, undefined, 'Reports retrieved successfully');
  });

  public getReportData = asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;
    if (!key) {
      throw new BadRequestError('Report key is required');
    }

    const reportData = await executeReport(key, req.query, req.user!);
    return sendSuccess(res, reportData, 200, undefined, `Report '${key}' executed successfully`);
  });

  public exportReport = asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;
    const { format = 'xlsx' } = req.query as { format?: string };

    if (!key) {
      throw new BadRequestError('Report key is required');
    }

    const reportDef = getReportDefinition(key);
    if (!reportDef) {
      throw new NotFoundError(`Report '${key}' not found in registry`);
    }

    const reportData = await executeReport(key, req.query, req.user!);

    if (format === 'pdf') {
      const buffer = await generatePdfReport(reportDef, reportData, req.query);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${key}_${Date.now()}.pdf"`);
      return res.send(buffer);
    } else {
      const buffer = await generateExcelReport(reportDef, reportData, req.query);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${key}_${Date.now()}.xlsx"`);
      return res.send(buffer);
    }
  });
}

export const registryController = new RegistryController();
