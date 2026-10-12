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

  // Pre-run adjustments (Incentives, Bonus, Allowances, Overtime, PF, Other Deductions)
  setAdjustment = async (req: Request, res: Response) => {
    const { employee_id, month, incentives, bonus, allowances, overtime, pf, other_deductions, note } = req.body;
    if (!employee_id || !month) {
      throw new BadRequestError('employee_id and month are required');
    }
    const result = await payrollService.setPayrollAdjustment(
      {
        employee_id: Number(employee_id),
        month,
        incentives: incentives !== undefined ? Number(incentives) : undefined,
        bonus: bonus !== undefined ? Number(bonus) : undefined,
        allowances: allowances !== undefined ? Number(allowances) : undefined,
        overtime: overtime !== undefined ? Number(overtime) : undefined,
        pf: pf !== undefined && pf !== null ? Number(pf) : undefined,
        other_deductions: other_deductions !== undefined ? Number(other_deductions) : undefined,
        note,
      },
      req.user?.userId
    );
    return sendCreated(res, result, 'Payroll adjustment saved successfully');
  };

  getAdjustments = async (req: Request, res: Response) => {
    const { month, employee_id } = req.query as { month: string; employee_id?: string };
    if (!month) {
      throw new BadRequestError('month query parameter is required (YYYY-MM)');
    }
    const list = await payrollService.getPayrollAdjustments(
      month,
      employee_id ? Number(employee_id) : undefined
    );
    return sendSuccess(res, list);
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

  // Update Payroll Run Status (Draft > Processed > Locked > Paid)
  updateStatus = async (req: Request, res: Response) => {
    const { month } = req.params;
    const { status } = req.body;
    if (!status || !['draft', 'processed', 'locked', 'paid'].includes(status)) {
      throw new BadRequestError('Status must be draft, processed, locked, or paid');
    }
    const updated = await payrollService.updatePayrollRunStatus(month, status, req.user?.userId);
    return sendSuccess(res, updated, 200, undefined, `Payroll for ${month} status updated to ${status}`);
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

  // Download Payslip PDF
  downloadPayslipPdf = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!id) {
      throw new BadRequestError('Payslip ID is required');
    }
    const { buffer, filename } = await payrollService.generatePayslipPdf(id, req.user!);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  };
}

export const payrollController = new PayrollController();
