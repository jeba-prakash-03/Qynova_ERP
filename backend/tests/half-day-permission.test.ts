import request from 'supertest';
import createApp from '../src/app';
import db from '../src/db/knex';
import { leavesService } from '../src/modules/leaves/leaves.service';

const app = createApp();

describe('Task 5: Half-Day Leave & Permission Time Validation & Partial Approval', () => {
  let adminToken: string;
  let empId: number;
  let userId: number;
  let casualLeaveTypeId: number;
  let permLeaveTypeId: number;

  beforeAll(async () => {
    // 1. Login Admin
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@qynova.erp',
      password: 'Admin@123',
    });
    adminToken = loginRes.body?.data?.accessToken;

    // 2. Fetch leave type IDs
    const types = await db('leave_types').select('id', 'code');
    casualLeaveTypeId = types.find((t) => t.code === 'CL')?.id || 1;
    permLeaveTypeId = types.find((t) => t.code === 'PERM')?.id || 2;

    // 3. Clean test employee
    const existing = await db('users').where({ email: 'halfday_tester@qynova.erp' }).first();
    if (existing) {
      const empIds = (await db('employees').where({ user_id: existing.id }).select('id')).map((e) => e.id);
      if (empIds.length > 0) {
        await db('attendance').whereIn('employee_id', empIds).del();
        await db('leave_request_days').whereIn('leave_request_id', function () {
          this.select('id').from('leave_requests').whereIn('employee_id', empIds);
        }).del();
        await db('leave_requests').whereIn('employee_id', empIds).del();
        await db('leave_balances').whereIn('employee_id', empIds).del();
        await db('employees').where({ user_id: existing.id }).del();
      }
      await db('users').where({ id: existing.id }).del();
    }

    // 4. Insert user and employee
    const [uId] = await db('users').insert({
      email: 'halfday_tester@qynova.erp',
      password_hash: 'hash',
      status: 'active',
      must_change_password: 0,
    });
    userId = uId;

    const [eId] = await db('employees').insert({
      employee_code: 'EMP_HD_001',
      user_id: uId,
      first_name: 'HalfDay',
      last_name: 'Tester',
      email: 'halfday_tester@qynova.erp',
      joining_date: '2026-01-01',
      employment_type: 'full_time',
      status: 'active',
      lifecycle_stage: 'active',
    });
    empId = eId;

    // Initialize leave balance for CL
    await db('leave_balances').insert({
      employee_id: empId,
      leave_type_id: casualLeaveTypeId,
      year: 2026,
      allocated: 12,
      used: 0,
      pending: 0,
    });
  });

  afterAll(async () => {
    if (empId) {
      await db('attendance').where({ employee_id: empId }).del();
      await db('leave_request_days').whereIn('leave_request_id', function () {
        this.select('id').from('leave_requests').where({ employee_id: empId });
      }).del();
      await db('leave_requests').where({ employee_id: empId }).del();
      await db('leave_balances').where({ employee_id: empId }).del();
      await db('employees').where({ id: empId }).del();
    }
    if (userId) {
      await db('users').where({ id: userId }).del();
    }
  });

  test('Valid Half-Day First Half (09:30 - 14:00) is accepted', async () => {
    const req = await leavesService.applyLeave(
      empId,
      {
        leave_type_id: casualLeaveTypeId,
        from_date: '2026-10-20',
        to_date: '2026-10-20',
        is_half_day: true,
        half_day_session: 'first',
        from_time: '09:30',
        to_time: '14:00',
        reason: 'Personal errand first half',
      }
    );

    expect(req).toBeDefined();
    expect(req.days).toBe(0.5);
    expect(req.from_time).toBe('09:30');
    expect(req.to_time).toBe('14:00');
  });

  test('Valid Half-Day Second Half (14:00 - 18:30) on same date is allowed (no time overlap)', async () => {
    const req = await leavesService.applyLeave(
      empId,
      {
        leave_type_id: casualLeaveTypeId,
        from_date: '2026-10-20',
        to_date: '2026-10-20',
        is_half_day: true,
        half_day_session: 'second',
        from_time: '14:00',
        to_time: '18:30',
        reason: 'Personal errand second half',
      }
    );

    expect(req).toBeDefined();
    expect(req.days).toBe(0.5);
  });

  test('Overlapping time range on same date is blocked', async () => {
    await expect(
      leavesService.applyLeave(
        empId,
        {
          leave_type_id: casualLeaveTypeId,
          from_date: '2026-10-20',
          to_date: '2026-10-20',
          is_half_day: true,
          from_time: '11:00',
          to_time: '15:00',
          reason: 'Overlapping leave',
        }
      )
    ).rejects.toThrow();
  });

  test('Half-day times outside shift hours are blocked', async () => {
    await expect(
      leavesService.applyLeave(
        empId,
        {
          leave_type_id: casualLeaveTypeId,
          from_date: '2026-10-21',
          to_date: '2026-10-21',
          is_half_day: true,
          from_time: '08:00',
          to_time: '12:00',
          reason: 'Outside shift hours',
        }
      )
    ).rejects.toThrow();
  });

  test('Partial Approval: 2-day request with 1 day approved and 1 day rejected', async () => {
    // 1. Create a 2-day pending request on Oct 27 & Oct 28
    const req = await leavesService.applyLeave(
      empId,
      {
        leave_type_id: casualLeaveTypeId,
        from_date: '2026-10-27',
        to_date: '2026-10-28',
        is_half_day: false,
        reason: 'Multi-day vacation',
      }
    );

    // 2. Approve only 2026-10-27, reject 2026-10-28
    const updated = await leavesService.approveLeave(
      req.id,
      { id: 1, roles: ['Admin'], permissions: ['leave.approve'] } as any,
      {
        approved_dates: ['2026-10-27'],
        rejected_dates: ['2026-10-28'],
        decision_note: 'Approved 1 day due to workload',
      }
    );

    expect(updated.status).toBe('partially_approved');
    expect(updated.approved_days).toBe(1);

    // Verify attendance row exists ONLY for approved date 2026-10-27
    const attApproved = await db('attendance').where({ employee_id: empId, date: '2026-10-27' }).first();
    const attRejected = await db('attendance').where({ employee_id: empId, date: '2026-10-28' }).first();

    expect(attApproved).toBeDefined();
    expect(attApproved.status).toBe('leave');
    expect(attRejected).toBeUndefined();
  });
});
