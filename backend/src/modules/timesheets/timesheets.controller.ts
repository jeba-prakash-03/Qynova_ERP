import { Request, Response } from 'express';
import { timesheetsService } from './timesheets.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response.util';
import { ForbiddenError, BadRequestError } from '../../shared/errors/app-error';

export class TimesheetsController {
  submitTimesheet = async (req: Request, res: Response) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      throw new ForbiddenError('Only registered employees can submit timesheets.');
    }

    const { date, hours, task_description, project_id, task_id } = req.body;
    const entry = await timesheetsService.submitTimesheet(
      employeeId,
      date,
      Number(hours),
      task_description,
      project_id ? Number(project_id) : null,
      task_id ? Number(task_id) : null
    );
    return sendCreated(res, entry, 'Timesheet entry submitted successfully');
  };

  getMyTimesheets = async (req: Request, res: Response) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      throw new ForbiddenError('Only registered employees can view their timesheets.');
    }
    const entries = await timesheetsService.getMyTimesheets(employeeId);
    return sendSuccess(res, entries);
  };

  getPendingTimesheets = async (req: Request, res: Response) => {
    const pending = await timesheetsService.getPendingTimesheets(req.user!);
    return sendSuccess(res, pending);
  };

  approveTimesheet = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const { decision_note } = req.body;
    const updated = await timesheetsService.decideTimesheet(id, 'approved', decision_note, req.user!);
    return sendSuccess(res, updated, 200, undefined, 'Timesheet approved');
  };

  rejectTimesheet = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const { decision_note } = req.body;
    const updated = await timesheetsService.decideTimesheet(id, 'rejected', decision_note, req.user!);
    return sendSuccess(res, updated, 200, undefined, 'Timesheet rejected');
  };
}

export const timesheetsController = new TimesheetsController();
