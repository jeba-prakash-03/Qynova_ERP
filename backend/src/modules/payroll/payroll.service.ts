import db from '../../db/knex';
import { getWorkingDays } from '../holidays/holidays.service';
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error';
import { auditService } from '../../shared/services/audit.service';
import { notificationService } from '../../shared/services/notification.service';

export interface SalaryStructure {
  id: number;
  employee_id: number;
  base_salary: number;
  is_annual: boolean;
  effective_from: string;
  effective_to?: string | null;
  created_by?: number | null;
  created_at?: string;
}

export interface PayrollItem {
  id: number;
  payroll_run_id: number;
  employee_id: number;
  employee_code?: string;
  employee_name?: string;
  department_name?: string;
  designation_title?: string;
  monthly_salary: number;
  daily_salary: number;
  working_days_in_month: number;
  approved_leave_days: number;
  absent_days: number;
  free_leave_applied: number;
  lop_days: number;
  gross_earning: number;
  lop_deduction: number;
  net_salary: number;
  status: 'draft' | 'locked' | 'paid';
}

export interface PayrollRun {
  id: number;
  month: string; // YYYY-MM
  status: 'draft' | 'processing' | 'locked' | 'approved' | 'paid';
  total_gross: number;
  total_deductions: number;
  total_net: number;
  created_by?: number | null;
  created_at?: string;
  items?: PayrollItem[];
  warnings?: string[];
}

export class PayrollService {
  // ==========================================
  // SALARY STRUCTURES
  // ==========================================
  async setSalaryStructure(
    employeeId: number,
    baseSalary: number,
    isAnnual: boolean = false,
    effectiveFrom?: string,
    currentUserId?: number
  ): Promise<SalaryStructure> {
    const today = effectiveFrom || new Date().toISOString().split('T')[0];

    let createdId: number = 0;
    await db.transaction(async (trx: any) => {
      // 1. Close active structure if exists
      await trx('salary_structures')
        .where({ employee_id: employeeId })
        .whereNull('effective_to')
        .update({ effective_to: today });

      // 2. Insert new structure
      const [id] = await trx('salary_structures').insert({
        employee_id: employeeId,
        base_salary: baseSalary,
        is_annual: isAnnual,
        effective_from: today,
        effective_to: null,
        created_by: currentUserId || null,
      });
      createdId = id;
    });

    if (currentUserId) {
      await auditService.record({
        userId: currentUserId,
        action: 'payroll.salary_updated',
        entity: 'salary_structures',
        entityId: employeeId,
        newValue: { baseSalary, isAnnual, effectiveFrom: today },
      });
    }

    return (await db('salary_structures').where({ id: createdId }).first())!;
  }

  async getSalaryHistory(employeeId: number): Promise<SalaryStructure[]> {
    return db('salary_structures')
      .where({ employee_id: employeeId })
      .orderBy('effective_from', 'desc');
  }

  async getEffectiveSalary(employeeId: number, month: string): Promise<SalaryStructure | null> {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    const startDate = `${month}-01`;
    const lastDay = new Date(year, m, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    const row = await db('salary_structures')
      .where({ employee_id: employeeId })
      .where('effective_from', '<=', endDate)
      .where((builder: any) => {
        builder.whereNull('effective_to').orWhere('effective_to', '>=', startDate);
      })
      .orderBy('effective_from', 'desc')
      .first();

    return row || null;
  }

  // ==========================================
  // GENERATE / RECALCULATE PAYROLL RUN
  // ==========================================
  async generatePayroll(month: string, currentUserId?: number): Promise<PayrollRun> {
    const existingRun = await db('payroll_runs').where({ month }).first();
    if (existingRun && (existingRun.status === 'locked' || existingRun.status === 'paid' || existingRun.status === 'approved')) {
      throw new BadRequestError(`Payroll for month ${month} is locked and cannot be recalculated.`);
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);
    const lastDayNum = new Date(year, m, 0).getDate();
    const monthStartDate = `${month}-01`;
    const monthEndDate = `${month}-${String(lastDayNum).padStart(2, '0')}`;

    const { count: workingDaysInMonth, workingDates } = await getWorkingDays(year, m);

    if (workingDaysInMonth <= 0) {
      throw new BadRequestError(`No working days found for month ${month}`);
    }

    const employees = await db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('designations as des', 'e.designation_id', 'des.id')
      .whereNull('e.deleted_at')
      .whereNot('e.lifecycle_stage', 'relieved')
      .select(
        'e.id',
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        'e.joining_date',
        'd.name as department_name',
        'des.name as designation_title'
      );

    const warnings: string[] = [];
    const itemsToInsert: any[] = [];

    let runTotalGross = 0;
    let runTotalDeductions = 0;
    let runTotalNet = 0;

    for (const emp of employees) {
      const salaryStruct = await this.getEffectiveSalary(emp.id, month);
      if (!salaryStruct) {
        warnings.push(`Skipped employee ${emp.first_name} ${emp.last_name} (${emp.employee_code}): No salary structure configured.`);
        continue;
      }

      let monthlySalary = Number(salaryStruct.base_salary);
      if (salaryStruct.is_annual) {
        monthlySalary = monthlySalary / 12;
      }

      const empJoiningDate = emp.joining_date instanceof Date ? emp.joining_date.toISOString().split('T')[0] : String(emp.joining_date);
      let activeWorkingDays = workingDaysInMonth;
      if (empJoiningDate > monthStartDate && empJoiningDate <= monthEndDate) {
        const activeDates = workingDates.filter((d) => d >= empJoiningDate);
        activeWorkingDays = activeDates.length;
        monthlySalary = (monthlySalary * activeWorkingDays) / workingDaysInMonth;
      }

      const dailySalary = monthlySalary / workingDaysInMonth;

      const approvedLeaveRows = await db('leave_request_days as lrd')
        .join('leave_requests as lr', 'lrd.leave_request_id', 'lr.id')
        .where('lr.employee_id', emp.id)
        .where('lrd.status', 'approved')
        .where('lrd.date', '>=', monthStartDate)
        .where('lrd.date', '<=', monthEndDate)
        .select('lrd.date', 'lrd.day_type');

      let approvedLeaveDays = 0;
      const leaveDateSet = new Set<string>();
      for (const row of approvedLeaveRows) {
        leaveDateSet.add(row.date);
        approvedLeaveDays += row.day_type === 'full' ? 1.0 : 0.5;
      }

      const absentRows = await db('attendance')
        .where({ employee_id: emp.id, status: 'absent' })
        .where('date', '>=', monthStartDate)
        .where('date', '<=', monthEndDate)
        .select('date');

      let absentDays = 0;
      for (const aRow of absentRows) {
        const dateStr = aRow.date instanceof Date ? aRow.date.toISOString().split('T')[0] : String(aRow.date);
        if (!leaveDateSet.has(dateStr) && workingDates.includes(dateStr)) {
          absentDays += 1.0;
        }
      }

      const totalLeaveAndAbsent = approvedLeaveDays + absentDays;
      let freeLeaveApplied = 0;
      let lopDays = 0;

      if (totalLeaveAndAbsent > 0) {
        freeLeaveApplied = Math.min(1.0, totalLeaveAndAbsent);
        lopDays = totalLeaveAndAbsent - freeLeaveApplied;
      }

      const lopDeduction = Math.round(lopDays * dailySalary * 100) / 100;
      const grossEarning = Math.round(monthlySalary * 100) / 100;
      const netSalary = Math.round((grossEarning - lopDeduction) * 100) / 100;

      runTotalGross += grossEarning;
      runTotalDeductions += lopDeduction;
      runTotalNet += netSalary;

      itemsToInsert.push({
        employee_id: emp.id,
        monthly_salary: Math.round(monthlySalary * 100) / 100,
        daily_salary: Math.round(dailySalary * 100) / 100,
        working_days_in_month: workingDaysInMonth,
        approved_leave_days: approvedLeaveDays,
        absent_days: absentDays,
        free_leave_applied: freeLeaveApplied,
        lop_days: lopDays,
        gross_earning: grossEarning,
        lop_deduction: lopDeduction,
        net_salary: netSalary,
        status: 'draft',
      });
    }

    let runId: number = 0;
    await db.transaction(async (trx: any) => {
      if (existingRun) {
        runId = existingRun.id;
        await trx('payroll_runs').where({ id: runId }).update({
          total_gross: Math.round(runTotalGross * 100) / 100,
          total_deductions: Math.round(runTotalDeductions * 100) / 100,
          total_net: Math.round(runTotalNet * 100) / 100,
          status: 'draft',
        });
        await trx('payroll_items').where({ payroll_run_id: runId }).del();
      } else {
        const [id] = await trx('payroll_runs').insert({
          month,
          status: 'draft',
          total_gross: Math.round(runTotalGross * 100) / 100,
          total_deductions: Math.round(runTotalDeductions * 100) / 100,
          total_net: Math.round(runTotalNet * 100) / 100,
          created_by: currentUserId || null,
        });
        runId = id;
      }

      for (const item of itemsToInsert) {
        item.payroll_run_id = runId;
        await trx('payroll_items').insert(item);
      }
    });

    try {
      if (currentUserId) {
        await notificationService.notify({
          eventKey: `payroll.generated:${month}`,
          userIds: currentUserId,
          type: 'info',
          title: 'Payroll Generated',
          message: `Payroll for ${month} generated with ${itemsToInsert.length} employee(s).`,
          link: '/payroll/runs',
        });
      }
    } catch {
      // Non-fatal
    }

    return this.getPayrollRunByMonth(month, warnings);
  }

  async getPayrollRunByMonth(month: string, warnings?: string[]): Promise<PayrollRun> {
    const run = await db('payroll_runs').where({ month }).first();
    if (!run) {
      throw new NotFoundError(`Payroll run for month ${month} not found.`);
    }

    const items = await db('payroll_items as pi')
      .join('employees as e', 'pi.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('designations as des', 'e.designation_id', 'des.id')
      .where('pi.payroll_run_id', run.id)
      .select(
        'pi.*',
        'e.employee_code',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as employee_name"),
        'd.name as department_name',
        'des.name as designation_title'
      );

    const formattedItems = items.map((item: any) => ({
      ...item,
      monthly_salary: Number(item.monthly_salary),
      daily_salary: Number(item.daily_salary),
      working_days_in_month: Number(item.working_days_in_month),
      approved_leave_days: Number(item.approved_leave_days),
      absent_days: Number(item.absent_days),
      free_leave_applied: Number(item.free_leave_applied),
      lop_days: Number(item.lop_days),
      gross_earning: Number(item.gross_earning),
      lop_deduction: Number(item.lop_deduction),
      net_salary: Number(item.net_salary),
    }));

    return {
      ...run,
      total_gross: Number(run.total_gross),
      total_deductions: Number(run.total_deductions),
      total_net: Number(run.total_net),
      items: formattedItems,
      warnings: warnings || [],
    };
  }

  async lockPayrollRun(month: string, currentUserId?: number): Promise<PayrollRun> {
    const run = await db('payroll_runs').where({ month }).first();
    if (!run) {
      throw new NotFoundError(`Payroll run for month ${month} not found.`);
    }

    await db.transaction(async (trx: any) => {
      await trx('payroll_runs').where({ id: run.id }).update({ status: 'locked' });
      await trx('payroll_items').where({ payroll_run_id: run.id }).update({ status: 'locked' });
    });

    if (currentUserId) {
      await auditService.record({
        userId: currentUserId,
        action: 'payroll.locked',
        entity: 'payroll_runs',
        entityId: run.id,
        newValue: { month },
      });
    }

    return this.getPayrollRunByMonth(month);
  }

  async getMyPayslips(employeeId: number): Promise<PayrollItem[]> {
    return db('payroll_items as pi')
      .join('payroll_runs as pr', 'pi.payroll_run_id', 'pr.id')
      .where('pi.employee_id', employeeId)
      .select('pi.*', 'pr.month')
      .orderBy('pr.month', 'desc');
  }
}

export const payrollService = new PayrollService();
