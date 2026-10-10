import { Request, Response } from 'express';
import { payrollService } from './payroll.service';
import { sendSuccess, sendCreated } from '../../shared/utils/response.util';
import { ForbiddenError, BadRequestError } from '../../shared/errors/app-error';

export class PayrollController {
  // Set employee salary structure
  setSalaryStructure = async (req: Request, res: Response) => {
    const { employee_id, base_salary, is_annual, effective_from } = req.body;
    const structure = await payrollService.setSalaryStructure(
      Number(employee_id),
      Number(base_salary),
      Boolean(is_annual),
      effective_from,
      req.user?.userId
    );
    return sendCreated(res, structure, 'Salary structure updated successfully');
  };

  // Get employee salary history
  getSalaryHistory = async (req: Request, res: Response) => {
    const employeeId = Number(req.params.employeeId);
    const history = await payrollService.getSalaryHistory(employeeId);
    return sendSuccess(res, history);
  };

  // Generate / Recalculate Payroll
  generatePayroll = async (req: Request, res: Response) => {
    const { month } = req.body;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      throw new BadRequestError('Month must be in YYYY-MM format (e.g. 2026-10)');
    }

    const run = await payrollService.generatePayroll(month, req.user?.userId);
    return sendSuccess(res, run, 200, undefined, `Payroll for ${month} calculated successfully`);
  };

  // Get Payroll Run by Month
  getPayrollRun = async (req: Request, res: Response) => {
    const month = (req.query.month as string) || req.params.month;
    if (!month) {
      throw new BadRequestError('Month parameter is required');
    }
    const run = await payrollService.getPayrollRunByMonth(month);
    return sendSuccess(res, run);
  };

  // Lock Payroll Run
  lockPayroll = async (req: Request, res: Response) => {
    const { month } = req.params;
    const locked = await payrollService.lockPayrollRun(month, req.user?.userId);
    return sendSuccess(res, locked, 200, undefined, `Payroll for ${month} is locked`);
  };

  // Get My Payslips
  getMyPayslips = async (req: Request, res: Response) => {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      throw new ForbiddenError('Only registered employees can view their payslips.');
    }
    const payslips = await payrollService.getMyPayslips(employeeId);
    return sendSuccess(res, payslips);
  };
}

export const payrollController = new PayrollController();
