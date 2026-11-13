import request from 'supertest';
import createApp from '../src/app';
import db from '../src/db/knex';
import { payrollService } from '../src/modules/payroll/payroll.service';

const app = createApp();

describe('Payroll & Salary Module Connections (Phase 5)', () => {
  let adminToken: string;
  let employeeId: number;
  let userId: number;

  beforeAll(async () => {
    // Authenticate Admin
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@qynova.erp',
      password: 'Admin@123',
    });
    adminToken = loginRes.body?.data?.accessToken;

    // Reset company settings baseline
    await db('company_settings').where({ id: 1 }).update({ free_leave_per_month: 1.0 });

    // Clean any previous test employee/user
    const existingUser = await db('users').where({ email: 'payroll_test_emp@qynova.com' }).first();
    if (existingUser) {
      const empIds = (await db('employees').where({ user_id: existingUser.id }).select('id')).map((e) => e.id);
      if (empIds.length > 0) {
        await db('leave_request_days').whereIn('leave_request_id', function() {
          this.select('id').from('leave_requests').whereIn('employee_id', empIds);
        }).del();
        await db('leave_requests').whereIn('employee_id', empIds).del();
        await db('attendance').whereIn('employee_id', empIds).del();
        await db('payroll_items').whereIn('employee_id', empIds).del();
        await db('salary_structures').whereIn('employee_id', empIds).del();
        await db('employees').where({ user_id: existingUser.id }).del();
      }
      await db('users').where({ id: existingUser.id }).del();
    }

    const [uId] = await db('users').insert({
      email: 'payroll_test_emp@qynova.com',
      password_hash: 'hash',
      status: 'active',
      must_change_password: 0,
    });
    userId = uId;

    const [eId] = await db('employees').insert({
      employee_code: 'EMP_PAY_001',
      user_id: uId,
      first_name: 'Payroll',
      last_name: 'Tester',
      email: 'payroll_test_emp@qynova.com',
      joining_date: '2026-01-01',
      employment_type: 'full_time',
      status: 'active',
      lifecycle_stage: 'active',
    });
    employeeId = eId;
  });

  afterAll(async () => {
    if (employeeId) {
      await db('leave_request_days').whereIn('leave_request_id', function() {
        this.select('id').from('leave_requests').where({ employee_id: employeeId });
      }).del();
      await db('leave_requests').where({ employee_id: employeeId }).del();
      await db('attendance').where({ employee_id: employeeId }).del();
      await db('payroll_items').where({ employee_id: employeeId }).del();
      await db('salary_structures').where({ employee_id: employeeId }).del();
      await db('employees').where({ id: employeeId }).del();
    }
    await db('payroll_runs').where({ month: '2026-10' }).del();
    if (userId) {
      await db('users').where({ id: userId }).del();
    }
  });

  test('Test Case 1: Salary 30000, 22 working days, 3 approved leave days -> daily 1363.64, 2 LOP days, deduction 2727.27', async () => {
    // 1. Set salary structure
    await payrollService.setSalaryStructure(employeeId, 30000, false, '2026-10-01');

    // 2. Insert leave request with 3 approved days (unpaid Loss of Pay / LOP)
    const lopType = await db('leave_types').where({ code: 'LOP' }).first();
    const leaveTypeId = lopType ? lopType.id : 4;
    const [reqId] = await db('leave_requests').insert({
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      from_date: '2026-10-12',
      to_date: '2026-10-14',
      days: 3,
      reason: 'Vacation',
      status: 'approved',
    });

    await db('leave_request_days').insert([
      { leave_request_id: reqId, date: '2026-10-12', day_type: 'full', status: 'approved' },
      { leave_request_id: reqId, date: '2026-10-13', day_type: 'full', status: 'approved' },
      { leave_request_id: reqId, date: '2026-10-14', day_type: 'full', status: 'approved' },
    ]);

    // 3. Generate payroll for month 2026-10
    const run = await payrollService.generatePayroll('2026-10');
    const item = run.items?.find((i) => i.employee_id === employeeId);

    expect(item).toBeDefined();
    expect(item?.monthly_salary).toBe(30000);
    expect(item?.working_days_in_month).toBeGreaterThan(0);
    expect(item?.approved_leave_days).toBe(3);
    expect(item?.free_leave_applied).toBe(1);
    expect(item?.lop_days).toBe(2);

    if (item?.working_days_in_month === 22) {
      expect(item.daily_salary).toBe(1363.64);
      expect(item.lop_deduction).toBe(2727.27);
    }
  });

  test('Test Case 2: Partly approved leave (1 approved, 1 rejected absent) -> 1 LOP day, deduction = 1 x daily salary', async () => {
    await db('leave_request_days').whereIn('leave_request_id', function () {
      this.select('id').from('leave_requests').where({ employee_id: employeeId });
    }).del();
    await db('leave_requests').where({ employee_id: employeeId }).del();
    await db('attendance').where({ employee_id: employeeId }).del();

    const lopType = await db('leave_types').where({ code: 'LOP' }).first();
    const leaveTypeId = lopType ? lopType.id : 4;
    const [reqId] = await db('leave_requests').insert({
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      from_date: '2026-10-15',
      to_date: '2026-10-16',
      days: 2,
      reason: 'Personal',
      status: 'partially_approved',
    });

    await db('leave_request_days').insert([
      { leave_request_id: reqId, date: '2026-10-15', day_type: 'full', status: 'approved' },
      { leave_request_id: reqId, date: '2026-10-16', day_type: 'full', status: 'rejected' },
    ]);

    await db('attendance').insert({
      employee_id: employeeId,
      date: '2026-10-16',
      status: 'absent',
      work_type: 'office',
      working_minutes: 0,
    });

    const run = await payrollService.generatePayroll('2026-10');
    const item = run.items?.find((i) => i.employee_id === employeeId);

    expect(item).toBeDefined();
    expect(item?.approved_leave_days).toBe(1);
    expect(item?.absent_days).toBe(1);
    expect(item?.free_leave_applied).toBe(1);
    expect(item?.lop_days).toBe(1);
    expect(item?.lop_deduction).toBe(item?.daily_salary);
  });

  test('Test Case 3: Annual package (/12) & Locked payroll cannot recalculate', async () => {
    await payrollService.setSalaryStructure(employeeId, 360000, true, '2026-10-01');

    const run = await payrollService.generatePayroll('2026-10');
    const item = run.items?.find((i) => i.employee_id === employeeId);

    expect(item?.monthly_salary).toBe(30000);

    await payrollService.updatePayrollRunStatus('2026-10', 'processed');
    await payrollService.lockPayrollRun('2026-10');

    await expect(payrollService.generatePayroll('2026-10')).rejects.toThrow(
      'Payroll for month 2026-10 is locked and cannot be recalculated.'
    );
  });

  test('Test Case 4: Admin adds incentives, bonus, allowances, overtime, PF and other deductions before run', async () => {
    // Unlock for testing adjustments
    await db('payroll_runs').where({ month: '2026-10' }).del();
    await db('payroll_items').where({ employee_id: employeeId }).del();
    await db('leave_request_days').whereIn('leave_request_id', function () {
      this.select('id').from('leave_requests').where({ employee_id: employeeId });
    }).del();
    await db('leave_requests').where({ employee_id: employeeId }).del();
    await db('attendance').where({ employee_id: employeeId }).del();

    // 1. Add adjustments via API
    const adjRes = await request(app)
      .post('/api/v1/payroll/adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employee_id: employeeId,
        month: '2026-10',
        incentives: 5000,
        bonus: 2000,
        allowances: 3000,
        overtime: 1500,
        pf: 3600, // Explicit PF
        other_deductions: 500,
        note: 'Sprint performance bonus and travel allowance',
      });

    expect(adjRes.status).toBe(201);
    expect(adjRes.body.data.incentives).toBe(5000);

    // 2. Run payroll
    const runRes = await request(app)
      .post('/api/v1/payroll/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ month: '2026-10' });

    expect(runRes.status).toBe(200);
    const item = runRes.body.data.items?.find((i: any) => i.employee_id === employeeId);
    expect(item).toBeDefined();

    // Gross = 30000 + 5000 + 2000 + 3000 + 1500 = 41500
    expect(item.gross_earning).toBe(41500);
    expect(item.pf_deduction).toBe(3600);
    expect(item.other_deductions).toBe(500);
    // Net = Gross - (PF + Other Deductions + LOP) = 41500 - (3600 + 500 + 0) = 37400
    expect(item.net_salary).toBe(37400);
  });

  test('Test Case 5: Payslip PDF download returns valid binary PDF', async () => {
    const item = await db('payroll_items').where({ employee_id: employeeId }).first();
    expect(item).toBeDefined();

    const pdfRes = await request(app)
      .get(`/api/v1/payroll/payslips/${item.id}/pdf`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.header['content-type']).toBe('application/pdf');
    expect(pdfRes.header['content-disposition']).toContain('.pdf');
    expect(pdfRes.body).toBeDefined();
  });

  test('Test Case 6: Status transitions: draft > processed > locked > paid and locked payroll cannot change', async () => {
    // Transition to processed
    const statusProcessed = await request(app)
      .post('/api/v1/payroll/runs/2026-10/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'processed' });
    expect(statusProcessed.status).toBe(200);
    expect(statusProcessed.body.data.status).toBe('processed');

    // Transition to locked
    const statusLocked = await request(app)
      .post('/api/v1/payroll/runs/2026-10/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'locked' });
    expect(statusLocked.status).toBe(200);
    expect(statusLocked.body.data.status).toBe('locked');

    // Locked payroll cannot change adjustments
    const adjBlocked = await request(app)
      .post('/api/v1/payroll/adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employee_id: employeeId,
        month: '2026-10',
        incentives: 1000,
      });
    expect(adjBlocked.status).toBe(400);

    // Transition to paid
    const statusPaid = await request(app)
      .post('/api/v1/payroll/runs/2026-10/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'paid' });
    expect(statusPaid.status).toBe(200);
    expect(statusPaid.body.data.status).toBe('paid');
  });

  test('Test Case 7: Paid leaves (CL/SL with is_paid = true) and WFH/PERM do not cause LOP deductions', async () => {
    await db('payroll_runs').where({ month: '2026-10' }).del();
    await db('payroll_items').where({ employee_id: employeeId }).del();
    await db('leave_request_days').whereIn('leave_request_id', function () {
      this.select('id').from('leave_requests').where({ employee_id: employeeId });
    }).del();
    await db('leave_requests').where({ employee_id: employeeId }).del();
    await db('attendance').where({ employee_id: employeeId }).del();

    await payrollService.setSalaryStructure(employeeId, 30000, false, '2026-10-01');

    // 1. Insert 3 days of approved Casual Leave (CL, is_paid = true)
    const clType = await db('leave_types').where({ code: 'CL' }).first();
    const [clReqId] = await db('leave_requests').insert({
      employee_id: employeeId,
      leave_type_id: clType.id,
      from_date: '2026-10-05',
      to_date: '2026-10-07',
      days: 3,
      reason: 'Family event',
      status: 'approved',
    });
    await db('leave_request_days').insert([
      { leave_request_id: clReqId, date: '2026-10-05', day_type: 'full', status: 'approved' },
      { leave_request_id: clReqId, date: '2026-10-06', day_type: 'full', status: 'approved' },
      { leave_request_id: clReqId, date: '2026-10-07', day_type: 'full', status: 'approved' },
    ]);

    // 2. Insert 2 days of approved WFH
    const wfhType = await db('leave_types').where({ code: 'WFH' }).first();
    if (wfhType) {
      const [wfhReqId] = await db('leave_requests').insert({
        employee_id: employeeId,
        leave_type_id: wfhType.id,
        from_date: '2026-10-08',
        to_date: '2026-10-09',
        days: 2,
        reason: 'Home setup',
        status: 'approved',
      });
      await db('leave_request_days').insert([
        { leave_request_id: wfhReqId, date: '2026-10-08', day_type: 'full', status: 'approved' },
        { leave_request_id: wfhReqId, date: '2026-10-09', day_type: 'full', status: 'approved' },
      ]);
    }

    const run = await payrollService.generatePayroll('2026-10');
    const item = run.items?.find((i) => i.employee_id === employeeId);

    expect(item).toBeDefined();
    // Genuinely unpaid leaves must be 0
    expect(item?.approved_leave_days).toBe(0);
    expect(item?.lop_days).toBe(0);
    expect(item?.lop_deduction).toBe(0);
  });

  test('Test Case 8: free_leave_per_month from company_settings applies to unpaid days', async () => {
    await db('payroll_runs').where({ month: '2026-10' }).del();
    await db('payroll_items').where({ employee_id: employeeId }).del();
    await db('leave_request_days').whereIn('leave_request_id', function () {
      this.select('id').from('leave_requests').where({ employee_id: employeeId });
    }).del();
    await db('leave_requests').where({ employee_id: employeeId }).del();
    await db('attendance').where({ employee_id: employeeId }).del();

    // Set company_settings free_leave_per_month to 2.0
    await db('company_settings').where({ id: 1 }).update({ free_leave_per_month: 2.0 });

    // Insert 3 days of LOP
    const lopType = await db('leave_types').where({ code: 'LOP' }).first();
    const [reqId] = await db('leave_requests').insert({
      employee_id: employeeId,
      leave_type_id: lopType.id,
      from_date: '2026-10-12',
      to_date: '2026-10-14',
      days: 3,
      reason: 'Emergency',
      status: 'approved',
    });
    await db('leave_request_days').insert([
      { leave_request_id: reqId, date: '2026-10-12', day_type: 'full', status: 'approved' },
      { leave_request_id: reqId, date: '2026-10-13', day_type: 'full', status: 'approved' },
      { leave_request_id: reqId, date: '2026-10-14', day_type: 'full', status: 'approved' },
    ]);

    const run = await payrollService.generatePayroll('2026-10');
    const item = run.items?.find((i) => i.employee_id === employeeId);

    expect(item).toBeDefined();
    expect(item?.approved_leave_days).toBe(3);
    expect(item?.free_leave_applied).toBe(2); // 2 free leaves allowed
    expect(item?.lop_days).toBe(1); // 3 - 2 = 1 LOP day

    // Revert company setting to 1.0
    await db('company_settings').where({ id: 1 }).update({ free_leave_per_month: 1.0 });
  });

  test('Test Case 9: setSalaryStructure validates Zod inputs and rejects retroactive effective_from', async () => {
    // 1. Reject non-existent employee
    await expect(payrollService.setSalaryStructure(999999, 50000)).rejects.toThrow();

    // 2. Reject non-positive or non-finite salary
    await expect(payrollService.setSalaryStructure(employeeId, 0)).rejects.toThrow();
    await expect(payrollService.setSalaryStructure(employeeId, -100)).rejects.toThrow();
    await expect(payrollService.setSalaryStructure(employeeId, Infinity)).rejects.toThrow();

    // 3. Reject invalid effective_from format
    await expect(payrollService.setSalaryStructure(employeeId, 50000, false, '12-10-2026')).rejects.toThrow();

    // 4. Set active salary structure at 2026-10-01
    await payrollService.setSalaryStructure(employeeId, 50000, false, '2026-10-01');

    // 5. Reject effective_from earlier than active structure
    await expect(
      payrollService.setSalaryStructure(employeeId, 60000, false, '2026-09-15')
    ).rejects.toThrow(/cannot be earlier than current active salary structure/);
  });

  test('Test Case 10: Status transitions must follow draft -> processed -> locked -> paid with maker-checker', async () => {
    await db('payroll_runs').where({ month: '2026-10' }).del();
    await db('payroll_items').where({ employee_id: employeeId }).del();

    // Generate run with real user (userId) as creator
    const run = await payrollService.generatePayroll('2026-10', userId);
    expect(run.status).toBe('draft');

    // 1. Cannot jump directly from draft to locked or paid
    await expect(payrollService.updatePayrollRunStatus('2026-10', 'locked', userId)).rejects.toThrow(
      /Invalid status transition/
    );
    await expect(payrollService.updatePayrollRunStatus('2026-10', 'paid', userId)).rejects.toThrow(
      /Invalid status transition/
    );

    // 2. Advance draft -> processed
    const processed = await payrollService.updatePayrollRunStatus('2026-10', 'processed', userId);
    expect(processed.status).toBe('processed');

    // 3. Maker-checker: Non-admin creator (userId) cannot lock or pay
    await expect(
      payrollService.updatePayrollRunStatus('2026-10', 'locked', { userId, roles: ['Employee'] })
    ).rejects.toThrow(/Maker-checker violation/);

    // 4. Admin CAN lock regardless of creator
    const locked = await payrollService.updatePayrollRunStatus('2026-10', 'locked', {
      userId,
      roles: ['Admin'],
    });
    expect(locked.status).toBe('locked');

    // 5. Locked cannot go back to draft
    await expect(payrollService.updatePayrollRunStatus('2026-10', 'draft', userId)).rejects.toThrow(
      /Invalid status transition/
    );

    // 6. Complete to paid
    const paid = await payrollService.updatePayrollRunStatus('2026-10', 'paid', {
      userId,
      roles: ['Admin'],
    });
    expect(paid.status).toBe('paid');
  });

  test('Test Case 11: Zod validation on payroll HTTP routes', async () => {
    // 1. Invalid month format in generate
    const res1 = await request(app)
      .post('/api/v1/payroll/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ month: 'invalid-month' });
    expect(res1.status).toBe(400);

    // 2. Negative adjustment
    const res2 = await request(app)
      .post('/api/v1/payroll/adjustments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        employee_id: employeeId,
        month: '2026-10',
        incentives: -500,
      });
    expect(res2.status).toBe(400);

    // 3. Invalid status transition enum
    const res3 = await request(app)
      .post('/api/v1/payroll/runs/2026-10/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'non_existent_status' });
    expect(res3.status).toBe(400);
  });

  test('Test Case 12: PF calculation applies configured pf_percent (12%) to basic salary (50% gross) up to wage cap', async () => {
    await db('payroll_runs').where({ month: '2026-10' }).del();
    await db('payroll_items').where({ employee_id: employeeId }).del();
    await db('payroll_adjustments').where({ employee_id: employeeId, month: '2026-10' }).del();
    await db('leave_request_days').whereIn('leave_request_id', function () {
      this.select('id').from('leave_requests').where({ employee_id: employeeId });
    }).del();
    await db('leave_requests').where({ employee_id: employeeId }).del();
    await db('attendance').where({ employee_id: employeeId }).del();
    await db('salary_structures').where({ employee_id: employeeId }).del();

    // 1. Monthly gross = 40,000 -> Basic = 20,000.
    // Statutory wage cap = 15,000 -> Eligible basic = min(20000, 15000) = 15,000.
    // PF = 15,000 * 12% = 1,800.
    await payrollService.setSalaryStructure(employeeId, 40000, false, '2026-10-01');

    const run = await payrollService.generatePayroll('2026-10');
    const item = run.items?.find((i) => i.employee_id === employeeId);

    expect(item).toBeDefined();
    expect(item?.monthly_salary).toBe(40000);
    expect(item?.pf_deduction).toBe(1800);
  });
});
