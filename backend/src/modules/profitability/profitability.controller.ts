import { Request, Response } from 'express';
import { profitabilityService } from './profitability.service';
import { sendSuccess } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors/app-error';

export class ProfitabilityController {
  public getProjectProfitability = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // MANDATORY SECURITY CHECK:
    // Only users with projects.view_financials or Admin role can view salary-derived costs
    const hasFinancialsPerm =
      req.user.roles.includes('Admin') ||
      req.user.permissions.includes('projects.view_financials') ||
      req.user.permissions.includes('*');

    if (!hasFinancialsPerm) {
      throw new ForbiddenError(
        "Permission 'projects.view_financials' required to view project cost and profitability metrics"
      );
    }

    const projectId = Number(req.params.id);
    const profitability = await profitabilityService.getProjectProfitability(projectId);
    return sendSuccess(res, profitability);
  });

  public getFinanceOverview = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const hasFinanceView =
      req.user.roles.includes('Admin') ||
      req.user.permissions.includes('projects.view_financials') ||
      req.user.permissions.includes('invoices.view') ||
      req.user.permissions.includes('expenses.view');

    if (!hasFinanceView) {
      throw new ForbiddenError("Permission required to view finance overview");
    }

    const overview = await profitabilityService.getFinanceOverview();
    return sendSuccess(res, overview);
  });
}

export const profitabilityController = new ProfitabilityController();
