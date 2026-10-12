import db from '../../db/knex';
import PDFDocument from 'pdfkit';
import { getWorkingDays } from '../holidays/holidays.service';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../shared/errors/app-error';
import { auditService } from '../../shared/services/audit.service';
import { notificationService } from '../../shared/services/notification.service';
import { payrollGeneratedEmailTemplate } from '../../shared/services/email.templates';
import { TokenUserPayload } from '../../shared/utils/jwt.util';

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
  status: 'draft' | 'processed' | 'processing' | 'locked' | 'approved' | 'paid';
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

      // Daily salary = monthly salary / working days of that month
      const dailySalary = monthlySalary / workingDaysInMonth;

      // Approved leaves
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

      // Attendance absents
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

      // 1 free leave per month
      if (totalLeaveAndAbsent > 0) {
        freeLeaveApplied = Math.min(1.0, totalLeaveAndAbsent);
        lopDays = totalLeaveAndAbsent - freeLeaveApplied;
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
      
      // PF: if configured explicitly in adjustment use it, else standard 12% of basic
      const pfDeduction =
        adjustment?.pf !== null && adjustment?.pf !== undefined
          ? Number(adjustment.pf)
          : Math.round(monthlySalary * 0.12 * 100) / 100;

      const otherDeductions = Number(adjustment?.other_deductions || 0);

      // Calculations:
      // Gross Earning = Monthly Base + Incentives + Bonus + Allowances + Overtime
      const grossEarning = Math.round((monthlySalary + incentives + bonus + allowances + overtime) * 100) / 100;

      // Total Deductions = LOP Deduction + PF + Other Deductions
      const totalEmployeeDeductions = Math.round((lopDeduction + pfDeduction + otherDeductions) * 100) / 100;

      // Net Salary = Gross Earning - Total Deductions
      const netSalary = Math.round((grossEarning - totalEmployeeDeductions) * 100) / 100;

      runTotalGross += grossEarning;
      runTotalDeductions += totalEmployeeDeductions;
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
    currentUserId?: number
  ): Promise<PayrollRun> {
    const run = await db('payroll_runs').where({ month }).first();
    if (!run) {
      throw new NotFoundError(`Payroll run for month ${month} not found.`);
    }

    if (run.status === 'locked' && targetStatus === 'draft') {
      throw new BadRequestError(`Locked payroll cannot be moved back to draft.`);
    }

    if (run.status === 'paid' && targetStatus !== 'paid') {
      throw new BadRequestError(`Paid payroll cannot be modified.`);
    }

    await db.transaction(async (trx: any) => {
      await trx('payroll_runs').where({ id: run.id }).update({ status: targetStatus });
      await trx('payroll_items').where({ payroll_run_id: run.id }).update({ status: targetStatus });
    });

    if (currentUserId) {
      await auditService.record({
        userId: currentUserId,
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

  async lockPayrollRun(month: string, currentUserId?: number): Promise<PayrollRun> {
    return this.updatePayrollRunStatus(month, 'locked', currentUserId);
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
}

export const payrollService = new PayrollService();
