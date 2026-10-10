import { Request, Response } from 'express';
import { leavesService } from './leaves.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response.util';
import { ForbiddenError, BadRequestError } from '../../shared/errors/app-error';

export class LeavesController {
  // ==========================================
  // LEAVE TYPES
  // ==========================================
  getAllTypes = async (_req: Request, res: Response) => {
    const types = await leavesService.getAllTypes();
    return sendSuccess(res, types);
  };

  getTypeById = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const type = await leavesService.getTypeById(id);
    return sendSuccess(res, type);
  };

  // ==========================================
  // WORKING DAYS PREVIEW
  // ==========================================
  calculateDays = async (req: Request, res: Response) => {
    const { from_date, to_date, is_half_day } = req.body;
    const result = await leavesService.calculateWorkingDays(
      from_date,
      to_date,
      Boolean(is_half_day)
    );
    return sendSuccess(res, result);
  };

  // ==========================================
  // LEAVE REQUESTS (EMPLOYEE SIDE)
  // ==========================================
  applyLeave = async (req: Request, res: Response) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      throw new ForbiddenError(
        'Only registered employees with an employee profile can apply for leave.'
      );
    }

    const created = await leavesService.applyLeave(employeeId, req.body);
    return sendCreated(res, created, 'Leave request submitted successfully');
  };

  getMyRequests = async (req: Request, res: Response) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      throw new ForbiddenError(
        'Only registered employees with an employee profile can view their leave requests.'
      );
    }

    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const status = req.query.status as string | undefined;

    const requests = await leavesService.getMyRequests(employeeId, { year, status });
    return sendSuccess(res, requests);
  };

  cancelLeave = async (req: Request, res: Response) => {
    const requestId = parseInt(req.params.id, 10);
    const updated = await leavesService.cancelLeave(requestId, req.user!);
    return sendSuccess(res, updated, 200, undefined, 'Leave request cancelled successfully');
  };

  // ==========================================
  // APPROVALS (MANAGER / HR / ADMIN)
  // ==========================================
  getPendingApprovals = async (req: Request, res: Response) => {
    const pending = await leavesService.getPendingApprovals(req.user!);
    return sendSuccess(res, pending);
  };

  approveLeave = async (req: Request, res: Response) => {
    const requestId = parseInt(req.params.id, 10);
    const updated = await leavesService.approveLeave(requestId, req.user!, req.body);
    return sendSuccess(res, updated, 200, undefined, 'Leave request approved successfully');
  };

  rejectLeave = async (req: Request, res: Response) => {
    const requestId = parseInt(req.params.id, 10);
    const updated = await leavesService.rejectLeave(requestId, req.user!, req.body);
    return sendSuccess(res, updated, 200, undefined, 'Leave request rejected');
  };

  getTeamCalendar = async (req: Request, res: Response) => {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const events = await leavesService.getTeamCalendar(month, req.user!);
    return sendSuccess(res, events);
  };

  // ==========================================
  // LEAVE BALANCES
  // ==========================================
  getMyBalances = async (req: Request, res: Response) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      throw new ForbiddenError(
        'Only registered employees with an employee profile can view their leave balances.'
      );
    }

    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const balances = await leavesService.getEmployeeBalances(employeeId, year);
    return sendSuccess(res, balances);
  };

  getEmployeeBalances = async (req: Request, res: Response) => {
    const employeeId = req.query.employeeId
      ? parseInt(req.query.employeeId as string, 10)
      : undefined;

    if (!employeeId) {
      throw new BadRequestError('employeeId query parameter is required');
    }

    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const balances = await leavesService.getEmployeeBalances(employeeId, year);
    return sendSuccess(res, balances);
  };

  allocateBalance = async (req: Request, res: Response) => {
    const result = await leavesService.allocateBalance(req.body, req.user?.userId);
    return sendSuccess(
      res,
      result,
      200,
      undefined,
      `Allocated quota successfully to ${result.affectedEmployees} employee(s)`
    );
  };
}

export const leavesController = new LeavesController();
