import request from 'supertest';
import createApp from '../src/app';
import db from '../src/db/knex';
import { attendanceService } from '../src/modules/attendance/attendance.service';
import { leavesService } from '../src/modules/leaves/leaves.service';
import { payrollService } from '../src/modules/payroll/payroll.service';

const app = createApp();

describe('Task 4: Attendance & Modules Start From Joining Date', () => {
  let adminToken: string;
  let joinerEmpId: number;
  let joinerUserId: number;

  beforeAll(async () => {
    // 1. Authenticate Admin
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@qynova.erp',
      password: 'Admin@123',
    });
    adminToken = loginRes.body?.data?.accessToken;

    // 2. Clean previous test joiner
    const existing = await db('users').where({ email: 'joiner_test_15@qynova.erp' }).first();
    if (existing) {
      const empIds = (await db('employees').where({ user_id: existing.id }).select('id')).map((e) => e.id);
      if (empIds.length > 0) {
        await db('attendance').whereIn('employee_id', empIds).del();
        await db('leave_request_days').whereIn('leave_request_id', function () {
          this.select('id').from('leave_requests').whereIn('employee_id', empIds);
        }).del();
        await db('leave_requests').whereIn('employee_id', empIds).del();
        await db('salary_structures').whereIn('employee_id', empIds).del();
        await db('payroll_items').whereIn('employee_id', empIds).del();
        await db('employees').where({ user_id: existing.id }).del();
      }
      await db('users').where({ id: existing.id }).del();
    }

    // 3. Insert test joiner with joining_date = '2026-10-15'
    const [uId] = await db('users').insert({
      email: 'joiner_test_15@qynova.erp',
      password_hash: 'hash',
      status: 'active',
      must_change_password: 0,
    });
    joinerUserId = uId;

    const [eId] = await db('employees').insert({
      employee_code: 'EMP_JOIN_015',
      user_id: uId,
      first_name: 'MidMonth',
      last_name: 'Joiner',
      email: 'joiner_test_15@qynova.erp',
      joining_date: '2026-10-15',
      employment_type: 'full_time',
      status: 'active',
      lifecycle_stage: 'active',
    });
    joinerEmpId = eId;
  });

  afterAll(async () => {
    if (joinerEmpId) {
      await db('attendance').where({ employee_id: joinerEmpId }).del();
      await db('leave_request_days').whereIn('leave_request_id', function () {
        this.select('id').from('leave_requests').where({ employee_id: joinerEmpId });
      }).del();
      await db('leave_requests').where({ employee_id: joinerEmpId }).del();
      await db('salary_structures').where({ employee_id: joinerEmpId }).del();
      await db('payroll_items').where({ employee_id: joinerEmpId }).del();
      await db('employees').where({ id: joinerEmpId }).del();
    }
    if (joinerUserId) {
      await db('users').where({ id: joinerUserId }).del();
    }
  });

  test('Check-in and manual edit before joining date are blocked', async () => {
    // Attempt manual attendance edit for date 2026-10-10 (before joining_date 2026-10-15)
    await expect(
      attendanceService.createManualAttendance(
        {
          employee_id: joinerEmpId,
          date: '2026-10-10',
          status: 'present',
          reason: 'Manual punch test before joining',
        },
        joinerUserId
      )
    ).rejects.toThrow('Employee joined on 15 Oct 2026');
  });

  test('Leave application starting before joining date is blocked', async () => {
    await expect(
      leavesService.applyLeave(
        joinerEmpId,
        {
          leave_type_id: 1,
          from_date: '2026-10-10',
          to_date: '2026-10-16',
          reason: 'Vacation before joining',
        }
      )
    ).rejects.toThrow('Leave cannot be applied for dates before joining date (15 Oct 2026).');
  });

  test('Daily Attendance Sheet excludes joiner before joining_date and includes them on/after joining_date', async () => {
    // Date before joining date: 2026-10-10
    const sheetBefore = await attendanceService.getDailySheet({ date: '2026-10-10' });
    const foundBefore = sheetBefore.items.find((i) => i.employee_id === joinerEmpId);
    expect(foundBefore).toBeUndefined();

    // Date on joining date: 2026-10-15
    const sheetOn = await attendanceService.getDailySheet({ date: '2026-10-15' });
    const foundOn = sheetOn.items.find((i) => i.employee_id === joinerEmpId);
    expect(foundOn).toBeDefined();
  });

  test('Relieved employee is excluded after last_working_date', async () => {
    // Set last_working_date = '2026-10-20' and status = inactive
    await db('employees').where({ id: joinerEmpId }).update({
      status: 'inactive',
      lifecycle_stage: 'relieved',
      last_working_date: '2026-10-20',
    });

    const sheetAfterRelieved = await attendanceService.getDailySheet({ date: '2026-10-25' });
    const foundAfter = sheetAfterRelieved.items.find((i) => i.employee_id === joinerEmpId);
    expect(foundAfter).toBeUndefined();
  });
});
