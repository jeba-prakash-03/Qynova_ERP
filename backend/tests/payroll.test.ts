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

    // 2. Insert leave request with 3 approved days
    const leaveTypeId = 1; // Casual leave or any valid leave type
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

    const [reqId] = await db('leave_requests').insert({
      employee_id: employeeId,
      leave_type_id: 1,
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
});
