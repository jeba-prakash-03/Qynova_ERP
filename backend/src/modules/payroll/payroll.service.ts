import db from '../../db/knex';
import PDFDocument from 'pdfkit';
import { getWorkingDays } from '../holidays/holidays.service';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../shared/errors/app-error';
import { auditService } from '../../shared/services/audit.service';
import { notificationService } from '../../shared/services/notification.service';
import { payrollGeneratedEmailTemplate } from '../../shared/services/email.templates';
import { TokenUserPayload } from '../../shared/utils/jwt.util';
import { getKolkataDateString } from '../../shared/utils/date.util';
import { setSalaryStructureSchema } from './payroll.schema';

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

export interface PayrollAdjustment {
  id: number;
  employee_id: number;
  employee_name?: string;
  employee_code?: string;
  month: string;
  incentives: number;
  bonus: number;
  allowances: number;
  overtime: number;
  pf: number | null;
  other_deductions: number;
  note?: string | null;
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
  incentives: number;
  bonus: number;
  allowances: number;
  overtime: number;
  pf_deduction: number;
  other_deductions: number;
  net_salary: number;
  status: 'draft' | 'processed' | 'locked' | 'paid';
}

export interface PayrollRun {
  id: number;
  month: string; // YYYY-MM
  status: 'draft' | 'processed' | 'locked' | 'paid';
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
    const validated = setSalaryStructureSchema.parse({
      employee_id: employeeId,
      base_salary: baseSalary,
      is_annual: isAnnual,
      effective_from: effectiveFrom,
    });

    const emp = await db('employees')
      .where({ id: validated.employee_id })
      .whereNull('deleted_at')
      .first();

    if (!emp) {
      throw new NotFoundError(`Employee with ID ${validated.employee_id} not found.`);
    }

    const effectiveDate = validated.effective_from || getKolkataDateString();

    const activeStructure = await db('salary_structures')
      .where({ employee_id: validated.employee_id })
      .whereNull('effective_to')
      .orderBy('effective_from', 'desc')
      .first();

    if (activeStructure) {
      const activeEffectiveFrom = activeStructure.effective_from instanceof Date
        ? activeStructure.effective_from.toISOString().split('T')[0]
        : String(activeStructure.effective_from);
      if (effectiveDate < activeEffectiveFrom) {
        throw new BadRequestError(
          `Effective from date (${effectiveDate}) cannot be earlier than current active salary structure effective date (${activeEffectiveFrom}).`
        );
      }
    }

    let createdId: number = 0;
    await db.transaction(async (trx: any) => {
      // 1. Close active structure if exists
      await trx('salary_structures')
        .where({ employee_id: validated.employee_id })
        .whereNull('effective_to')
        .update({ effective_to: effectiveDate });

      // 2. Insert new structure
      const [id] = await trx('salary_structures').insert({
        employee_id: validated.employee_id,
        base_salary: validated.base_salary,
        is_annual: validated.is_annual,
        effective_from: effectiveDate,
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
        entityId: validated.employee_id,
        newValue: { baseSalary: validated.base_salary, isAnnual: validated.is_annual, effectiveFrom: effectiveDate },
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
      .orderBy('id', 'desc')
      .first();

    return row || null;
  }

  // ==========================================
  // PAYROLL ADJUSTMENTS (Incentives, Bonus, Allowances, Overtime, PF, Deductions)
  // ==========================================
  async setPayrollAdjustment(
    data: {
      employee_id: number;
      month: string;
      incentives?: number;
      bonus?: number;
      allowances?: number;
      overtime?: number;
      pf?: number | null;
      other_deductions?: number;
      note?: string;
    },
    currentUserId?: number
  ): Promise<PayrollAdjustment> {
    const existingRun = await db('payroll_runs').where({ month: data.month }).first();
    if (existingRun && (existingRun.status === 'locked' || existingRun.status === 'paid')) {
      throw new BadRequestError(`Cannot add adjustments. Payroll for month ${data.month} is locked or paid.`);
    }

    const payload = {
      employee_id: data.employee_id,
      month: data.month,
      incentives: Number(data.incentives || 0),
      bonus: Number(data.bonus || 0),
      allowances: Number(data.allowances || 0),
      overtime: Number(data.overtime || 0),
      pf: data.pf !== undefined && data.pf !== null ? Number(data.pf) : null,
      other_deductions: Number(data.other_deductions || 0),
      note: data.note || null,
      created_by: currentUserId || null,
    };

    const existing = await db('payroll_adjustments')
      .where({ employee_id: data.employee_id, month: data.month })
      .first();

    if (existing) {
      await db('payroll_adjustments')
        .where({ id: existing.id })
        .update(payload);
    } else {
      await db('payroll_adjustments').insert(payload);
    }

    const row = await db('payroll_adjustments')
      .where({ employee_id: data.employee_id, month: data.month })
      .first();

    return {
      ...row,
      incentives: Number(row.incentives),
      bonus: Number(row.bonus),
      allowances: Number(row.allowances),
      overtime: Number(row.overtime),
      pf: row.pf !== null ? Number(row.pf) : null,
      other_deductions: Number(row.other_deductions),
    };
  }

  async getPayrollAdjustments(month: string, employeeId?: number): Promise<PayrollAdjustment[]> {
    let q = db('payroll_adjustments as pa')
      .join('employees as e', 'pa.employee_id', 'e.id')
      .where({ 'pa.month': month })
      .select(
        'pa.*',
        'e.employee_code',
        db.raw("CONCAT(e.first_name, ' ', e.last_name) as employee_name")
      );

    if (employeeId) {
      q = q.where('pa.employee_id', employeeId);
    }

    const rows = await q;
    return rows.map((r: any) => ({
      ...r,
      incentives: Number(r.incentives),
      bonus: Number(r.bonus),
      allowances: Number(r.allowances),
      overtime: Number(r.overtime),
      pf: r.pf !== null ? Number(r.pf) : null,
      other_deductions: Number(r.other_deductions),
    }));
  }

  // ==========================================
  // GENERATE / RECALCULATE PAYROLL RUN
  // ==========================================
  async generatePayroll(month: string, currentUserId?: number): Promise<PayrollRun> {
    const existingRun = await db('payroll_runs').where({ month }).first();
    if (existingRun && (existingRun.status === 'locked' || existingRun.status === 'paid')) {
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

    // Load Company Settings for Free Leave and PF configuration
    const companySettings = await db('company_settings').where({ id: 1 }).first();
    const freeLeaveAllowed =
      companySettings?.free_leave_per_month !== null && companySettings?.free_leave_per_month !== undefined
        ? Number(companySettings.free_leave_per_month)
        : 1.0;
    const pfPercent =
      companySettings?.pf_percent !== null && companySettings?.pf_percent !== undefined
        ? Number(companySettings.pf_percent)
        : 12.0;
    const pfWageCap =
      companySettings?.pf_wage_cap !== null && companySettings?.pf_wage_cap !== undefined
        ? Number(companySettings.pf_wage_cap)
        : 15000.0;

    const employees = await db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('designations as des', 'e.designation_id', 'des.id')
      .whereNull('e.deleted_at')
      .where('e.joining_date', '<=', monthEndDate)
      .where((qb) => {
        qb.whereNull('e.last_working_date')
          .orWhere('e.last_working_date', '>=', monthStartDate);
      })
      .where((qb) => {
        qb.whereNot('e.lifecycle_stage', 'relieved')
          .orWhere('e.last_working_date', '>=', monthStartDate);
      })
      .select(
        'e.id',
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        'e.joining_date',
        'e.last_working_date',
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

      let unratedMonthlySalary = Number(salaryStruct.base_salary);
      if (salaryStruct.is_annual) {
        unratedMonthlySalary = unratedMonthlySalary / 12;
      }

      const empJoiningDate = emp.joining_date instanceof Date ? emp.joining_date.toISOString().split('T')[0] : String(emp.joining_date);
      const empLastWorkingDate = emp.last_working_date 
        ? (emp.last_working_date instanceof Date ? emp.last_working_date.toISOString().split('T')[0] : String(emp.last_working_date))
        : null;

      const empActiveStart = empJoiningDate > monthStartDate ? empJoiningDate : monthStartDate;
      const empActiveEnd = empLastWorkingDate && empLastWorkingDate < monthEndDate ? empLastWorkingDate : monthEndDate;

      const activeDates = workingDates.filter((d) => d >= empActiveStart && d <= empActiveEnd);
      const activeWorkingDays = activeDates.length;

      if (activeWorkingDays === 0) {
        continue;
      }

      // True daily salary = unrated monthly base / working days in month
      const dailySalary = Math.round((unratedMonthlySalary / workingDaysInMonth) * 100) / 100;

      // Pro-rated monthly salary for mid-month joiner or leaver
      let monthlySalary = unratedMonthlySalary;
      if (activeWorkingDays < workingDaysInMonth) {
        monthlySalary = Math.round(dailySalary * activeWorkingDays * 100) / 100;
      }

      // Query approved leaves: join leave_requests -> leave_types
      // Only count days that are genuinely unpaid (is_paid = false/0), excluding WFH and PERM entirely
      const approvedLeaveRows = await db('leave_request_days as lrd')
        .join('leave_requests as lr', 'lrd.leave_request_id', 'lr.id')
        .join('leave_types as lt', 'lr.leave_type_id', 'lt.id')
        .where('lr.employee_id', emp.id)
        .where('lrd.status', 'approved')
        .where('lrd.date', '>=', empActiveStart)
        .where('lrd.date', '<=', empActiveEnd)
        .select('lrd.date', 'lrd.day_type', 'lt.code as leave_code', 'lt.is_paid');

      let unpaidApprovedLeaveDays = 0;
      const approvedLeaveDateSet = new Set<string>();

      for (const row of approvedLeaveRows) {
        const dateStr = row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date);
        approvedLeaveDateSet.add(dateStr);

        // Exclude WFH and PERM entirely from unpaid leave counting
        if (row.leave_code === 'WFH' || row.leave_code === 'PERM') {
          continue;
        }

        // Count only genuinely unpaid leaves (is_paid = false / 0)
        if (!row.is_paid) {
          unpaidApprovedLeaveDays += row.day_type === 'full' ? 1.0 : 0.5;
        }
      }

      // Attendance absents (unapproved absences)
      const absentRows = await db('attendance')
        .where({ employee_id: emp.id, status: 'absent' })
        .where('date', '>=', empActiveStart)
        .where('date', '<=', empActiveEnd)
        .select('date');

      let absentDays = 0;
      for (const aRow of absentRows) {
        const dateStr = aRow.date instanceof Date ? aRow.date.toISOString().split('T')[0] : String(aRow.date);
        if (!approvedLeaveDateSet.has(dateStr) && activeDates.includes(dateStr)) {
          absentDays += 1.0;
        }
      }

      const totalUnpaidDays = unpaidApprovedLeaveDays + absentDays;
      let freeLeaveApplied = 0;
      let lopDays = 0;

      // Apply free_leave_per_month from company_settings (default 1.0 if null) to unpaid/absent days
      if (totalUnpaidDays > 0) {
        freeLeaveApplied = Math.min(freeLeaveAllowed, totalUnpaidDays);
        lopDays = Math.max(0, totalUnpaidDays - freeLeaveApplied);
      }

      const lopDeduction = Math.round(lopDays * dailySalary * 100) / 100;

      // Fetch pre-configured adjustments (incentives, bonus, allowances, overtime, PF, other deductions)
      const adjustment = await db('payroll_adjustments')
        .where({ employee_id: emp.id, month })
        .first();

      const incentives = Number(adjustment?.incentives || 0);
      const bonus = Number(adjustment?.bonus || 0);
      const allowances = Number(adjustment?.allowances || 0);
      const overtime = Number(adjustment?.overtime || 0);
      
      // Basic component is 50% of monthly salary
      const basicSalary = Math.round(monthlySalary * 0.5 * 100) / 100;
      const pfEligibleSalary = pfWageCap > 0 ? Math.min(basicSalary, pfWageCap) : basicSalary;

      // PF: if configured explicitly in adjustment use it, else apply pf_percent (default 12%) to basic component up to wage cap
      const pfDeduction =
        adjustment?.pf !== null && adjustment?.pf !== undefined
          ? Number(adjustment.pf)
          : Math.round(pfEligibleSalary * (pfPercent / 100) * 100) / 100;

      // TODO: Statutory deductions unimplemented:
      // - ESI (Employee State Insurance): Statutory deduction applicable for employees with gross <= ₹21,000/month (0.75% employee contribution, 3.25% employer contribution).
      // - Professional Tax (PT): State-specific slab-based deduction (e.g. Karnataka ₹200/month for salary >= ₹15,000).
      // - TDS (Tax Deducted at Source / Section 192): Income tax withholding based on annual projected tax liability under Old/New tax regime.

      const otherDeductions = Number(adjustment?.other_deductions || 0);

      // Calculations:
      // Gross Earning = Monthly Base + Incentives + Bonus + Allowances + Overtime
      const grossEarning = Math.round((monthlySalary + incentives + bonus + allowances + overtime) * 100) / 100;

      // Total Deductions = LOP Deduction + PF + Other Deductions
      const totalEmployeeDeductions = Math.round((lopDeduction + pfDeduction + otherDeductions) * 100) / 100;

      // Net Salary = Gross Earning - Total Deductions (never negative)
      const netSalary = Math.max(0, Math.round((grossEarning - totalEmployeeDeductions) * 100) / 100);

      runTotalGross += grossEarning;
      runTotalDeductions += totalEmployeeDeductions;
      runTotalNet += netSalary;

      itemsToInsert.push({
        employee_id: emp.id,
        monthly_salary: Math.round(monthlySalary * 100) / 100,
        daily_salary: Math.round(dailySalary * 100) / 100,
        working_days_in_month: workingDaysInMonth,
        approved_leave_days: unpaidApprovedLeaveDays,
        absent_days: absentDays,
        free_leave_applied: freeLeaveApplied,
        lop_days: lopDays,
        gross_earning: grossEarning,
        lop_deduction: lopDeduction,
        incentives,
        bonus,
        allowances,
        overtime,
        pf_deduction: pfDeduction,
        other_deductions: otherDeductions,
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
      incentives: Number(item.incentives || 0),
      bonus: Number(item.bonus || 0),
      allowances: Number(item.allowances || 0),
      overtime: Number(item.overtime || 0),
      pf_deduction: Number(item.pf_deduction || 0),
      other_deductions: Number(item.other_deductions || 0),
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

  // ==========================================
  // STATUS LIFECYCLE: Draft > Processed > Locked > Paid
  // ==========================================
  async updatePayrollRunStatus(
    month: string,
    targetStatus: 'draft' | 'processed' | 'locked' | 'paid',
    currentUser?: { userId?: number; roles?: string[] } | number
  ): Promise<PayrollRun> {
    const run = await db('payroll_runs').where({ month }).first();
    if (!run) {
      throw new NotFoundError(`Payroll run for month ${month} not found.`);
    }

    const currentStatus = run.status;
    const allowedTransitions: Record<string, string[]> = {
      draft: ['processed'],
      processed: ['draft', 'locked'],
      locked: ['paid'],
      paid: [],
    };

    const validNext = allowedTransitions[currentStatus] || [];
    if (!validNext.includes(targetStatus)) {
      throw new BadRequestError(
        `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: ${
          validNext.length > 0 ? validNext.join(', ') : 'none (terminal state)'
        }.`
      );
    }

    const userId = typeof currentUser === 'number' ? currentUser : currentUser?.userId;
    let userRoles = typeof currentUser === 'object' && currentUser !== null && 'roles' in currentUser ? currentUser.roles : undefined;

    if (!userRoles && userId) {
      const userRoleRows = await db('user_roles as ur')
        .join('roles as r', 'ur.role_id', 'r.id')
        .where('ur.user_id', userId)
        .select('r.name');
      userRoles = userRoleRows.map((r: any) => r.name);
    }

    // Maker-checker policy: user who locked or paid must be different from creator, unless Admin
    if (targetStatus === 'locked' || targetStatus === 'paid') {
      const isAdmin = userRoles?.some((r: string) => r.toLowerCase() === 'admin');
      if (!isAdmin && run.created_by && userId && Number(run.created_by) === Number(userId)) {
        throw new ForbiddenError(
          `Maker-checker violation: User ${userId} generated this payroll run and cannot lock or pay it. Another user or an Admin is required.`
        );
      }
    }

    await db.transaction(async (trx: any) => {
      await trx('payroll_runs').where({ id: run.id }).update({ status: targetStatus });
      await trx('payroll_items').where({ payroll_run_id: run.id }).update({ status: targetStatus });
    });

    if (userId) {
      await auditService.record({
        userId,
        action: `payroll.status_${targetStatus}`,
        entity: 'payroll_runs',
        entityId: run.id,
        newValue: { month, status: targetStatus },
      });
    }

    if (targetStatus === 'paid' || targetStatus === 'processed' || targetStatus === 'locked') {
      try {
        const items = await db('payroll_items as pi')
          .join('employees as e', 'pi.employee_id', 'e.id')
          .where('pi.payroll_run_id', run.id)
          .select('pi.id', 'pi.net_salary', 'e.user_id', 'e.first_name', 'e.last_name', 'e.email');

        for (const item of items) {
          if (item.user_id) {
            const payslipUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-payslips`;
            const html = payrollGeneratedEmailTemplate({
              employeeName: `${item.first_name} ${item.last_name}`,
              month,
              netSalary: Number(item.net_salary),
              payslipUrl,
            });

            await notificationService.notify({
              eventKey: `payroll.${targetStatus}:${month}:item:${item.id}`,
              userIds: item.user_id,
              type: 'success',
              title: `Payslip Available (${month})`,
              message: `Your payslip for ${month} has been ${targetStatus}. Net salary: ₹${Number(item.net_salary).toLocaleString()}`,
              link: '/my-payslips',
              emailDetails: {
                eventType: 'payroll_generated',
                subject: `Your Payslip for ${month} is Ready`,
                html,
              },
            });
          }
        }
      } catch (err) {
        console.error('[PAYROLL_NOTIF_ERROR]', err);
      }
    }

    return this.getPayrollRunByMonth(month);
  }

  async lockPayrollRun(
    month: string,
    currentUser?: { userId?: number; roles?: string[] } | number
  ): Promise<PayrollRun> {
    return this.updatePayrollRunStatus(month, 'locked', currentUser);
  }

  async getMyPayslips(employeeId: number): Promise<PayrollItem[]> {
    return db('payroll_items as pi')
      .join('payroll_runs as pr', 'pi.payroll_run_id', 'pr.id')
      .where('pi.employee_id', employeeId)
      .select('pi.*', 'pr.month')
      .orderBy('pr.month', 'desc');
  }

  // ==========================================
  // PAYSLIP PDF GENERATION
  // ==========================================
  async generatePayslipPdf(payrollItemId: number, user: TokenUserPayload): Promise<{ buffer: Buffer; filename: string }> {
    const item = await db('payroll_items as pi')
      .join('payroll_runs as pr', 'pi.payroll_run_id', 'pr.id')
      .join('employees as e', 'pi.employee_id', 'e.id')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('designations as des', 'e.designation_id', 'des.id')
      .where('pi.id', payrollItemId)
      .select(
        'pi.*',
        'pr.month',
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        'e.email',
        'e.joining_date',
        'd.name as department_name',
        'des.name as designation_title'
      )
      .first();

    if (!item) {
      throw new NotFoundError('Payslip record not found');
    }

    const isAdmin = user.roles.some((r) => r.toLowerCase() === 'admin' || r.toLowerCase() === 'hr' || r === '*');
    if (!isAdmin && user.employeeId !== item.employee_id) {
      throw new ForbiddenError('You can only download your own payslip');
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    const bufferPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));
    });

    // Load Company Settings for Letterhead & Footer
    const companySettings = await db('company_settings').where({ id: 1 }).first();
    const companyName = companySettings?.legal_name || companySettings?.company_name || process.env.APP_NAME || 'ERP Enterprise';
    const companyAddress = [companySettings?.address_line1, companySettings?.city, companySettings?.state, companySettings?.pincode]
      .filter(Boolean)
      .join(', ') || 'Corporate Office';
    const contactLine = [companySettings?.email || companySettings?.support_email, companySettings?.website, companySettings?.phone]
      .filter(Boolean)
      .join(' | ');
    const payslipFooter = companySettings?.payslip_footer_text || 'This is a computer-generated payslip and does not require a physical signature.';
    const currency = companySettings?.currency || 'INR';

    // Brand Header
    doc.fillColor('#0F172A').fontSize(18).font('Helvetica-Bold').text(companyName.toUpperCase(), 40, 40);
    doc.fontSize(8.5).font('Helvetica').fillColor('#64748B').text(companyAddress);
    if (contactLine) {
      doc.text(contactLine);
    }

    // Title Badge
    doc.rect(360, 40, 195, 34).fill('#EEF2FF');
    doc.fillColor('#4338CA').font('Helvetica-Bold').fontSize(12).text(`PAYSLIP — ${item.month}`, 370, 52, { align: 'center', width: 175 });

    doc.moveDown(2);
    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1);

    // Employee Meta Grid
    const startY = doc.y;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A');
    doc.text('Employee Name:', 40, startY);
    doc.font('Helvetica').fillColor('#475569').text(`${item.first_name} ${item.last_name}`, 140, startY);

    doc.font('Helvetica-Bold').fillColor('#0F172A').text('Employee Code:', 320, startY);
    doc.font('Helvetica').fillColor('#475569').text(item.employee_code, 420, startY);

    doc.font('Helvetica-Bold').fillColor('#0F172A').text('Department:', 40, startY + 16);
    doc.font('Helvetica').fillColor('#475569').text(item.department_name || '-', 140, startY + 16);

    doc.font('Helvetica-Bold').fillColor('#0F172A').text('Designation:', 320, startY + 16);
    doc.font('Helvetica').fillColor('#475569').text(item.designation_title || '-', 420, startY + 16);

    doc.font('Helvetica-Bold').fillColor('#0F172A').text('Working Days:', 40, startY + 32);
    doc.font('Helvetica').fillColor('#475569').text(String(item.working_days_in_month), 140, startY + 32);

    doc.font('Helvetica-Bold').fillColor('#0F172A').text('LOP Days:', 320, startY + 32);
    doc.font('Helvetica').fillColor('#475569').text(String(item.lop_days), 420, startY + 32);

    doc.moveDown(3);
    doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1);

    // Salary Breakdown Table (Earnings vs Deductions)
    const tableTop = doc.y;
    const colWidth = 250;

    // Table Header
    doc.rect(40, tableTop, colWidth, 22).fill('#1E293B');
    doc.rect(40 + colWidth + 15, tableTop, colWidth, 22).fill('#1E293B');

    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
    doc.text('EARNINGS', 50, tableTop + 6);
    doc.text(`AMOUNT (${currency})`, 210, tableTop + 6, { align: 'right', width: 70 });

    doc.text('DEDUCTIONS', 50 + colWidth + 15, tableTop + 6);
    doc.text(`AMOUNT (${currency})`, 210 + colWidth + 15, tableTop + 6, { align: 'right', width: 70 });

    // Table Rows
    let currentY = tableTop + 28;
    const earnings = [
      { label: 'Basic Monthly Salary', value: Number(item.monthly_salary) },
      { label: 'Incentives', value: Number(item.incentives || 0) },
      { label: 'Bonus', value: Number(item.bonus || 0) },
      { label: 'Allowances', value: Number(item.allowances || 0) },
      { label: 'Overtime', value: Number(item.overtime || 0) },
    ];

    const deductions = [
      { label: 'Loss of Pay (LOP)', value: Number(item.lop_deduction || 0) },
      { label: 'Provident Fund (PF)', value: Number(item.pf_deduction || 0) },
      { label: 'Other Deductions', value: Number(item.other_deductions || 0) },
    ];

    const maxRows = Math.max(earnings.length, deductions.length);
    doc.font('Helvetica').fontSize(9).fillColor('#0F172A');

    for (let i = 0; i < maxRows; i++) {
      const earn = earnings[i];
      const ded = deductions[i];

      if (earn) {
        doc.text(earn.label, 50, currentY);
        doc.text(earn.value.toFixed(2), 210, currentY, { align: 'right', width: 70 });
      }

      if (ded) {
        doc.text(ded.label, 50 + colWidth + 15, currentY);
        doc.text(ded.value.toFixed(2), 210 + colWidth + 15, currentY, { align: 'right', width: 70 });
      }

      currentY += 18;
    }

    // Totals Row
    doc.rect(40, currentY, colWidth, 22).fill('#F8FAFC');
    doc.rect(40 + colWidth + 15, currentY, colWidth, 22).fill('#F8FAFC');

    doc.font('Helvetica-Bold').fontSize(9).fillColor('#0F172A');
    doc.text('Gross Earnings', 50, currentY + 6);
    doc.text(Number(item.gross_earning).toFixed(2), 210, currentY + 6, { align: 'right', width: 70 });

    const totalDed = Number(item.lop_deduction || 0) + Number(item.pf_deduction || 0) + Number(item.other_deductions || 0);
    doc.text('Total Deductions', 50 + colWidth + 15, currentY + 6);
    doc.text(totalDed.toFixed(2), 210 + colWidth + 15, currentY + 6, { align: 'right', width: 70 });

    // Net Payout Box
    currentY += 36;
    doc.rect(40, currentY, 515, 45).fill('#DCFCE7');
    doc.strokeColor('#86EFAC').lineWidth(1).rect(40, currentY, 515, 45).stroke();

    doc.font('Helvetica-Bold').fontSize(11).fillColor('#15803D');
    doc.text('NET SALARY PAYOUT:', 60, currentY + 16);
    doc.fontSize(16).text(`${currency} ${Number(item.net_salary).toFixed(2)}`, 320, currentY + 14, { align: 'right', width: 220 });

    // Footer Signoff
    doc.font('Helvetica').fontSize(8).fillColor('#64748B');
    doc.text(payslipFooter, 40, 750, { align: 'center', width: 515 });

    doc.end();

    const buffer = await bufferPromise;
    const filename = `Payslip_${item.employee_code}_${item.month}.pdf`;
    return { buffer, filename };
  }

  // ==========================================
  // FULL & FINAL (FNF) SETTLEMENT
  // ==========================================
  async calculateFnFSettlement(
    employeeId: number,
    dto: {
      last_working_date?: string;
      worked_days?: number;
      encash_leave_days?: number;
      notice_period_required_days?: number;
      notice_period_served_days?: number;
      additional_earnings?: number;
      deductions?: number;
      remarks?: string;
    } = {},
    currentUserId?: number
  ) {
    const employee = await db('employees as e')
      .leftJoin('departments as d', 'e.department_id', 'd.id')
      .leftJoin('designations as des', 'e.designation_id', 'des.id')
      .where('e.id', employeeId)
      .whereNull('e.deleted_at')
      .select(
        'e.id',
        'e.employee_code',
        'e.first_name',
        'e.last_name',
        'e.email',
        'e.joining_date',
        'e.last_working_date',
        'e.lifecycle_stage',
        'd.name as department_name',
        'des.name as designation_title'
      )
      .first();

    if (!employee) {
      throw new NotFoundError(`Employee with ID ${employeeId} not found`);
    }

    const joiningDateStr = employee.joining_date instanceof Date
      ? employee.joining_date.toISOString().split('T')[0]
      : String(employee.joining_date);

    const lastWorkingDateStr = dto.last_working_date
      || (employee.last_working_date
        ? (employee.last_working_date instanceof Date ? employee.last_working_date.toISOString().split('T')[0] : String(employee.last_working_date))
        : new Date().toISOString().split('T')[0]);

    const exitMonth = lastWorkingDateStr.substring(0, 7);
    const [exitYearStr, exitMonthStr] = exitMonth.split('-');
    const exitYear = parseInt(exitYearStr, 10);
    const exitM = parseInt(exitMonthStr, 10);

    // 1. Fetch effective salary structure
    const salaryStruct = (await this.getEffectiveSalary(employeeId, exitMonth))
      || (await db('salary_structures').where({ employee_id: employeeId }).orderBy('effective_from', 'desc').first());

    if (!salaryStruct) {
      throw new BadRequestError(`No active salary structure found for employee ${employee.employee_code}`);
    }

    const monthlySalary = salaryStruct.is_annual ? salaryStruct.base_salary / 12 : salaryStruct.base_salary;
    const lastDrawnBasic = Math.round(monthlySalary * 0.5 * 100) / 100;

    // 2. Working days in exit month
    const { count: workingDaysInMonth, workingDates } = await getWorkingDays(exitYear, exitM);
    const dailySalary = workingDaysInMonth > 0 ? Math.round((monthlySalary / workingDaysInMonth) * 100) / 100 : 0;

    // 3. Earned Salary in Exit Month
    let finalMonthWorkedDays = 0;
    if (dto.worked_days !== undefined) {
      finalMonthWorkedDays = Number(dto.worked_days);
    } else {
      const workingDaysBeforeExit = workingDates.filter((d: string) => d <= lastWorkingDateStr);
      finalMonthWorkedDays = workingDaysBeforeExit.length;
    }
    const earnedSalary = Math.round(finalMonthWorkedDays * dailySalary * 100) / 100;

    // 4. Leave Encashment (Privilege Leave / Earned Leave)
    let plEncashmentDays = 0;
    if (dto.encash_leave_days !== undefined) {
      plEncashmentDays = Number(dto.encash_leave_days);
    } else {
      const plType = await db('leave_types')
        .whereIn('code', ['EL', 'PL', 'AL'])
        .first();

      if (plType) {
        const bal = await db('leave_balances')
          .where({
            employee_id: employeeId,
            leave_type_id: plType.id,
            year: exitYear,
          })
          .first();

        if (bal) {
          plEncashmentDays = Math.max(0, Number(bal.allocated) - Number(bal.used) - Number(bal.pending));
        }
      }
    }
    const plEncashmentAmount = Math.round(plEncashmentDays * dailySalary * 100) / 100;

    // 5. Tenure & Gratuity Calculation (Payment of Gratuity Act 1972)
    const jDate = new Date(joiningDateStr);
    const lDate = new Date(lastWorkingDateStr);
    const diffMs = lDate.getTime() - jDate.getTime();
    const tenureYears = Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 365.25));
    const wholeYears = Math.floor(tenureYears);
    const remainingMonths = (tenureYears - wholeYears) * 12;
    // Under the Act, 6 months or more counts as another completed year
    const completedYears = remainingMonths >= 6 ? wholeYears + 1 : wholeYears;
    const isGratuityEligible = tenureYears >= 4.9; // 5 years continuous service
    const gratuityAmount = isGratuityEligible
      ? Math.round(((15 * lastDrawnBasic * completedYears) / 26) * 100) / 100
      : 0;

    // 6. Notice Period Recovery
    const noticePeriodRequiredDays = dto.notice_period_required_days !== undefined ? Number(dto.notice_period_required_days) : 30;
    const noticePeriodServedDays = dto.notice_period_served_days !== undefined ? Number(dto.notice_period_served_days) : noticePeriodRequiredDays;
    const noticeShortfallDays = Math.max(0, noticePeriodRequiredDays - noticePeriodServedDays);
    const noticeRecoveryAmount = Math.round(noticeShortfallDays * dailySalary * 100) / 100;

    // 7. Totals & Net Payable
    const additionalEarnings = Number(dto.additional_earnings || 0);
    const otherDeductions = Number(dto.deductions || 0);

    const totalEarnings = Math.round((earnedSalary + plEncashmentAmount + gratuityAmount + additionalEarnings) * 100) / 100;
    const totalDeductions = Math.round((noticeRecoveryAmount + otherDeductions) * 100) / 100;
    const netPayable = Math.max(0, Math.round((totalEarnings - totalDeductions) * 100) / 100);

    if (currentUserId) {
      await auditService.record({
        userId: currentUserId,
        action: 'payroll.fnf_calculated',
        entity: 'payroll',
        entityId: employeeId,
        newValue: {
          netPayable,
          earnedSalary,
          plEncashmentAmount,
          gratuityAmount,
          noticeRecoveryAmount,
          lastWorkingDateStr,
        },
      });
    }

    return {
      employee: {
        id: employee.id,
        employee_code: employee.employee_code,
        name: `${employee.first_name} ${employee.last_name}`,
        email: employee.email,
        department_name: employee.department_name,
        designation_title: employee.designation_title,
        joining_date: joiningDateStr,
        last_working_date: lastWorkingDateStr,
        lifecycle_stage: employee.lifecycle_stage,
        tenure_years: Math.round(tenureYears * 10) / 10,
        completed_years: completedYears,
      },
      salary: {
        monthly_base: Math.round(monthlySalary * 100) / 100,
        basic_salary: lastDrawnBasic,
        daily_rate: dailySalary,
        working_days_in_month: workingDaysInMonth,
      },
      earnings: {
        worked_days: finalMonthWorkedDays,
        earned_salary: earnedSalary,
        pl_encashment_days: plEncashmentDays,
        pl_encashment_amount: plEncashmentAmount,
        gratuity_eligible: isGratuityEligible,
        gratuity_amount: gratuityAmount,
        additional_earnings: additionalEarnings,
        total_earnings: totalEarnings,
      },
      deductions: {
        notice_required_days: noticePeriodRequiredDays,
        notice_served_days: noticePeriodServedDays,
        notice_shortfall_days: noticeShortfallDays,
        notice_recovery_amount: noticeRecoveryAmount,
        other_deductions: otherDeductions,
        total_deductions: totalDeductions,
      },
      net_payable: netPayable,
      remarks: dto.remarks || null,
      calculated_at: new Date().toISOString(),
    };
  }
}

export const payrollService = new PayrollService();
