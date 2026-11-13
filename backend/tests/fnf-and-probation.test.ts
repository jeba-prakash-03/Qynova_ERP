import request from 'supertest';
import createApp from '../src/app';
import db from '../src/db/knex';
import { payrollService } from '../src/modules/payroll/payroll.service';
import { employeesService } from '../src/modules/employees/employees.service';

const app = createApp();

describe('Batch C: Full & Final (FnF) Settlement & Probation Milestone Alerts', () => {
  let adminToken: string;
  let testEmpId: number;
  let testUserId: number;
  let veteranEmpId: number;
  let veteranUserId: number;

  beforeAll(async () => {
    // 1. Admin Login
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@qynova.erp',
      password: 'Admin@123',
    });
    adminToken = loginRes.body?.data?.accessToken;

    // 2. Setup standard test employee (joining date 2024-01-01, exit 2026-10-15)
    const [uId] = await db('users').insert({
      email: `fnf_tester_${Date.now()}@qynova.erp`,
      password_hash: 'hash',
      status: 'active',
      must_change_password: 0,
    });
    testUserId = uId;

    const [eId] = await db('employees').insert({
      employee_code: `EMP_FNF_${Date.now().toString().slice(-4)}`,
      user_id: uId,
      first_name: 'FnF',
      last_name: 'Tester',
      email: `fnf_tester_${Date.now()}@qynova.erp`,
      joining_date: '2024-01-01',
      last_working_date: '2026-10-15',
      employment_type: 'full_time',
      status: 'active',
      lifecycle_stage: 'resigned',
    });
    testEmpId = eId;

    // Set salary structure: 66,000/month
    await payrollService.setSalaryStructure(testEmpId, 66000, false, '2024-01-01');

    // 3. Setup veteran employee with 6 years tenure (joining date 2020-01-01)
    const [vUId] = await db('users').insert({
      email: `veteran_${Date.now()}@qynova.erp`,
      password_hash: 'hash',
      status: 'active',
      must_change_password: 0,
    });
    veteranUserId = vUId;

    const [vEId] = await db('employees').insert({
      employee_code: `EMP_VET_${Date.now().toString().slice(-4)}`,
      user_id: vUId,
      first_name: 'Veteran',
      last_name: 'Staff',
      email: `veteran_${Date.now()}@qynova.erp`,
      joining_date: '2020-01-01',
      last_working_date: '2026-01-01',
      employment_type: 'full_time',
      status: 'active',
      lifecycle_stage: 'relieved',
    });
    veteranEmpId = vEId;

    // Set salary structure: 60,000/month
    await payrollService.setSalaryStructure(veteranEmpId, 60000, false, '2020-01-01');
  });

  afterAll(async () => {
    // Cleanup
    const empIds = [testEmpId, veteranEmpId].filter(Boolean);
    const userIds = [testUserId, veteranUserId].filter(Boolean);

    if (empIds.length > 0) {
      await db('salary_structures').whereIn('employee_id', empIds).del();
      await db('payroll_adjustments').whereIn('employee_id', empIds).del();
      await db('payroll_items').whereIn('employee_id', empIds).del();
      await db('leave_request_days').whereIn('leave_request_id', function () {
        this.select('id').from('leave_requests').whereIn('employee_id', empIds);
      }).del();
      await db('leave_requests').whereIn('employee_id', empIds).del();
      await db('leave_balances').whereIn('employee_id', empIds).del();
      await db('attendance').whereIn('employee_id', empIds).del();
      await db('employees').whereIn('id', empIds).del();
    }
    if (userIds.length > 0) {
      await db('users').whereIn('id', userIds).del();
    }
  });

  describe('1. Full & Final Settlement (FnF) Calculation Engine', () => {
    it('calculates accurate earned days and PL encashment for exiting employee', async () => {
      const res = await request(app)
        .post(`/api/v1/payroll/fnf/${testEmpId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          last_working_date: '2026-10-15',
          worked_days: 10,
          encash_leave_days: 5,
          notice_period_required_days: 30,
          notice_period_served_days: 30, // Full notice served
        });

      expect(res.status).toBe(200);
      const data = res.body.data;

      // Dynamic calendar daily rate check
      const expectedDailyRate = Math.round((66000 / data.salary.working_days_in_month) * 100) / 100;
      expect(data.salary.monthly_base).toBe(66000);
      expect(data.salary.daily_rate).toBe(expectedDailyRate);

      // Earned salary: 10 days * daily_rate
      const expectedEarned = Math.round(10 * expectedDailyRate * 100) / 100;
      expect(data.earnings.worked_days).toBe(10);
      expect(data.earnings.earned_salary).toBe(expectedEarned);

      // PL Encashment: 5 days * daily_rate
      const expectedPl = Math.round(5 * expectedDailyRate * 100) / 100;
      expect(data.earnings.pl_encashment_days).toBe(5);
      expect(data.earnings.pl_encashment_amount).toBe(expectedPl);

      // Tenure < 5 years: Not eligible for gratuity
      expect(data.earnings.gratuity_eligible).toBe(false);
      expect(data.earnings.gratuity_amount).toBe(0);

      // Net payable = expectedEarned + expectedPl
      expect(data.deductions.notice_shortfall_days).toBe(0);
      expect(data.deductions.notice_recovery_amount).toBe(0);
      expect(data.net_payable).toBe(Math.round((expectedEarned + expectedPl) * 100) / 100);
    });

    it('calculates Gratuity under Payment of Gratuity Act 1972 for employee with tenure >= 5 years', async () => {
      const res = await request(app)
        .post(`/api/v1/payroll/fnf/${veteranEmpId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          last_working_date: '2026-01-01',
          worked_days: 1,
          encash_leave_days: 0,
        });

      expect(res.status).toBe(200);
      const data = res.body.data;

      // 6 years continuous service (2020-01-01 to 2026-01-01)
      expect(data.employee.completed_years).toBe(6);
      expect(data.earnings.gratuity_eligible).toBe(true);

      // Gratuity formula: (15 * Last Drawn Basic * Completed Years) / 26
      // Base: 60,000 -> Basic = 30,000
      // Gratuity = (15 * 30,000 * 6) / 26 = 2,700,000 / 26 = 103,846.15
      expect(data.salary.basic_salary).toBe(30000);
      expect(data.earnings.gratuity_amount).toBe(103846.15);
      expect(data.net_payable).toBeGreaterThanOrEqual(103846.15);
    });

    it('recovers notice shortfall when employee does not serve full notice period', async () => {
      const res = await request(app)
        .post(`/api/v1/payroll/fnf/${testEmpId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          last_working_date: '2026-10-15',
          worked_days: 10,
          encash_leave_days: 0,
          notice_period_required_days: 30,
          notice_period_served_days: 10, // Shortfall of 20 days
        });

      expect(res.status).toBe(200);
      const data = res.body.data;

      const dailyRate = data.salary.daily_rate;
      const expectedShortfallRecovery = Math.round(20 * dailyRate * 100) / 100;
      expect(data.deductions.notice_shortfall_days).toBe(20);
      expect(data.deductions.notice_recovery_amount).toBe(expectedShortfallRecovery);

      // Shortfall recovery exceeds earned salary -> Net capped at 0 (never negative)
      expect(data.net_payable).toBe(0);
    });

    it('GET /api/v1/payroll/fnf/:id previews settlement without errors', async () => {
      const res = await request(app)
        .get(`/api/v1/payroll/fnf/${testEmpId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.employee.id).toBe(testEmpId);
      expect(res.body.data.salary.monthly_base).toBe(66000);
      expect(res.body.data.net_payable).toBeGreaterThanOrEqual(0);
    });
  });

  describe('2. Probation Milestone Review Alerts Engine', () => {
    let probationEmpId: number;
    let probationUserId: number;

    beforeAll(async () => {
      // Create an employee whose 3-month probation completes 5 days from today
      const today = new Date();
      // joining_date = today - 3 months + 5 days
      const targetJoining = new Date(today);
      targetJoining.setMonth(targetJoining.getMonth() - 3);
      targetJoining.setDate(targetJoining.getDate() + 5);
      const joiningDateStr = targetJoining.toISOString().split('T')[0];

      const [uId] = await db('users').insert({
        email: `probation_tester_${Date.now()}@qynova.erp`,
        password_hash: 'hash',
        status: 'active',
        must_change_password: 0,
      });
      probationUserId = uId;

      const [eId] = await db('employees').insert({
        employee_code: `EMP_PRB_${Date.now().toString().slice(-4)}`,
        user_id: uId,
        first_name: 'Probation',
        last_name: 'Reviewee',
        email: `probation_tester_${Date.now()}@qynova.erp`,
        joining_date: joiningDateStr,
        employment_type: 'full_time',
        status: 'active',
        lifecycle_stage: 'probation',
      });
      probationEmpId = eId;
    });

    afterAll(async () => {
      if (probationEmpId) {
        await db('notifications').where('event_key', 'like', `%employee:${probationEmpId}%`).del();
        await db('employees').where({ id: probationEmpId }).del();
      }
      if (probationUserId) {
        await db('users').where({ id: probationUserId }).del();
      }
    });

    it('identifies upcoming probation completions and dispatches review alerts', async () => {
      const res = await request(app)
        .post('/api/v1/employees/probation/check-alerts')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.alertedCount).toBeGreaterThanOrEqual(1);

      const found = res.body.data.employees.find((e: any) => e.employee_id === probationEmpId);
      expect(found).toBeDefined();
      expect(found.days_remaining).toBeLessThanOrEqual(15);
      expect(found.days_remaining).toBeGreaterThanOrEqual(0);

      // Verify notification in database
      const notif = await db('notifications')
        .where('event_key', 'like', `%employee:${probationEmpId}:probation_alert%`)
        .first();
      expect(notif).toBeDefined();
      expect(notif.title).toContain('Probation Review Due');
    });
  });

  describe('3. Timesheets Segregation of Duties & Project Enrichment', () => {
    let mgrToken: string;
    let empToken: string;
    let managerEmp: any;
    let devEmp: any;
    let mgrTimesheetId: number;
    let devTimesheetId: number;
    const testDate = '2026-10-25';

    beforeAll(async () => {
      const [mgrRes, empRes] = await Promise.all([
        request(app).post('/api/v1/auth/login').send({ email: 'manager@qynova.erp', password: 'Manager@123' }),
        request(app).post('/api/v1/auth/login').send({ email: 'employee@qynova.erp', password: 'Employee@123' }),
      ]);
      mgrToken = mgrRes.body?.data?.accessToken;
      empToken = empRes.body?.data?.accessToken;

      managerEmp = await db('employees').where({ email: 'manager@qynova.erp' }).first();
      devEmp = await db('employees').where({ email: 'employee@qynova.erp' }).first();

      // Clean up test date
      await db('timesheets').where({ date: testDate }).del();
    });

    afterAll(async () => {
      await db('timesheets').where({ date: testDate }).del();
    });

    it('blocks self-approval of timesheets with 403 Forbidden', async () => {
      // Manager logs timesheet for himself
      const tsRes = await request(app)
        .post('/api/v1/timesheets')
        .set('Authorization', `Bearer ${mgrToken}`)
        .send({
          date: testDate,
          hours: 4.0,
          task_description: 'Architecture review',
        });

      expect(tsRes.status).toBe(201);
      mgrTimesheetId = tsRes.body.data.id;

      // Manager attempts to approve own timesheet
      const approveRes = await request(app)
        .patch(`/api/v1/timesheets/${mgrTimesheetId}/approve`)
        .set('Authorization', `Bearer ${mgrToken}`)
        .send({ note: 'Self approve' });

      expect(approveRes.status).toBe(403);
      expect(approveRes.body.message).toContain('You cannot approve your own timesheet entry');
    });

    it('excludes own timesheets from pending approval inbox and includes project/task info for subordinates', async () => {
      const project = await db('projects').first();
      const task = await db('tasks').where({ project_id: project.id }).first();

      // Dev logs timesheet
      const devTsRes = await request(app)
        .post('/api/v1/timesheets')
        .set('Authorization', `Bearer ${empToken}`)
        .send({
          project_id: project.id,
          task_id: task?.id || null,
          date: testDate,
          hours: 4.0,
          task_description: 'Feature implementation',
        });

      expect(devTsRes.status).toBe(201);
      devTimesheetId = devTsRes.body.data.id;

      // Manager fetches pending timesheets
      const pendingRes = await request(app)
        .get('/api/v1/timesheets/pending')
        .set('Authorization', `Bearer ${mgrToken}`);

      expect(pendingRes.status).toBe(200);
      const pending = pendingRes.body.data;

      // Verify manager's own timesheet is NOT in the pending list
      const selfEntry = pending.find((t: any) => t.id === mgrTimesheetId);
      expect(selfEntry).toBeUndefined();

      // Verify dev's timesheet IS in the list and includes project details
      const devEntry = pending.find((t: any) => t.id === devTimesheetId);
      expect(devEntry).toBeDefined();
      expect(devEntry.project_name).toBe(project.name);
    });

    it('enforces 24-hour daily aggregated timesheet cap', async () => {
      // Dev already has 4.0 hours on testDate. Attempting to log 21 hours = 25 > 24
      const overRes = await request(app)
        .post('/api/v1/timesheets')
        .set('Authorization', `Bearer ${empToken}`)
        .send({
          date: testDate,
          hours: 21.0,
          task_description: 'Overtime push',
        });

      expect(overRes.status).toBe(400);
      expect(overRes.body.message).toContain('cannot exceed 24 hours');
    });
  });
});
