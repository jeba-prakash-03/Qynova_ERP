import { Request, Response } from 'express';
import { auditLogsRepository } from './audit-logs.repository';
import { sendSuccess } from '../../shared/utils/response.util';
import { asyncHandler } from '../../shared/utils/async-handler.util';

export class AuditLogsController {
  public getAll = asyncHandler(async (req: Request, res: Response) => {
    const queryParams: any = req.query;
    const { data, total } = await auditLogsRepository.findAll(queryParams);
    const limit = Number(queryParams.limit) || 20;
    const page = Number(queryParams.page) || 1;

    return sendSuccess(res, data, 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  });
}

export const auditLogsController = new AuditLogsController();
export default auditLogsController;
