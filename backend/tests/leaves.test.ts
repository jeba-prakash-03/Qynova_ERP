import request from 'supertest';
import { createApp } from '../src/app';
import db from '../src/db/knex';
import { leavesService } from '../src/modules/leaves/leaves.service';

const app = createApp();

describe('Leaves Module — Unit & API Tests', () => {
  let adminToken: string;
  let employeeToken: string;
  let managerToken: string;
  let employeeId: number;
  let managerEmployeeId: number;
  let clTypeId: number;
  let lopTypeId: number;
  let wfhTypeId: number;

  beforeAll(async () => {
    // 1. Admin login
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@qynova.erp', password: 'Admin@123' });
    adminToken = adminLogin.body.data.accessToken;

    // 2. Employee login
    const empLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'employee@qynova.erp', password: 'Employee@123' });
    employeeToken = empLogin.body.data.accessToken;
    employeeId = empLogin.body.data.user.employee.id;

    // 3. Manager login
    const mgrLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'manager@qynova.erp', password: 'Manager@123' });
    managerToken = mgrLogin.body.data.accessToken;
    managerEmployeeId = mgrLogin.body.data.user.employee.id;

    // Fetch leave types
    const typesRes = await request(app)
      .get('/api/v1/leave-types')
      .set('Authorization', `Bearer ${employeeToken}`);
    const types = typesRes.body.data;
    clTypeId = types.find((t: any) => t.code === 'CL').id;
    lopTypeId = types.find((t: any) => t.code === 'LOP').id;
    wfhTypeId = types.find((t: any) => t.code === 'WFH').id;

    // Allocate 12 days CL to employee for test year 2026
    await db('leave_balances')
      .where({ employee_id: employeeId, leave_type_id: clTypeId, year: 2026 })
      .delete();
    await db('leave_balances').insert({
      employee_id: employeeId,
      leave_type_id: clTypeId,
      year: 2026,
      allocated: 12.0,
      used: 0.0,
      pending: 0.0,
    });
  });

  describe('1. Working-day counting logic', () => {
    it('should accurately exclude weekends and holidays from working days count', async () => {
      // 2026-10-01 (Thu) to 2026-10-05 (Mon)
      // Oct 2 is Gandhi Jayanti (public holiday in seeds)
      // Oct 3 is Saturday (weekend)
      // Oct 4 is Sunday (weekend)
      // Oct 1 is Thursday (working day)
      // Oct 5 is Monday (working day)
      // Total working days should be 2: Oct 1 and Oct 5
      const result = await leavesService.calculateWorkingDays('2026-10-01', '2026-10-05');
      expect(result.days).toBe(2);
      expect(result.workingDates).toEqual(['2026-10-01', '2026-10-05']);
      expect(result.holidayDates).toContain('2026-10-02');
      expect(result.weekendDates).toContain('2026-10-03');
      expect(result.weekendDates).toContain('2026-10-04');
    });

    it('should count half-day as 0.5 for a valid working day', async () => {
      // 2026-10-01 is Thursday
      const result = await leavesService.calculateWorkingDays('2026-10-01', '2026-10-01', true);
      expect(result.days).toBe(0.5);
    });

    it('should return 0 working days if range only contains weekends', async () => {
      // 2026-10-03 to 2026-10-04 (Sat and Sun)
      const result = await leavesService.calculateWorkingDays('2026-10-03', '2026-10-04');
      expect(result.days).toBe(0);
      expect(result.workingDates).toEqual([]);
    });
  });

  describe('2. Overlap & Insufficient Balance Constraints', () => {
    const testFrom = '2026-11-16'; // Monday
    const testTo = '2026-11-17'; // Tuesday

    afterEach(async () => {
      // Clean up requests created in this block
      await db('leave_requests')
        .where({ employee_id: employeeId })
        .where('from_date', '>=', '2026-11-16')
        .where('to_date', '<=', '2026-11-25')
        .delete();
      // Reset balances
      await db('leave_balances')
        .where({ employee_id: employeeId, leave_type_id: clTypeId, year: 2026 })
        .update({ used: 0, pending: 0 });
    });

    it('should block overlapping leave requests for the same employee', async () => {
      // 1. Submit initial request
      const res1 = await request(app)
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leave_type_id: clTypeId,
          from_date: testFrom,
          to_date: testTo,
          reason: 'Initial leave request',
        });
      expect(res1.status).toBe(201);

      // 2. Submit overlapping request (e.g. 2026-11-17 to 2026-11-18)
      const res2 = await request(app)
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leave_type_id: clTypeId,
          from_date: '2026-11-17',
          to_date: '2026-11-18',
          reason: 'Overlapping request',
        });

      expect(res2.status).toBe(400);
      expect(res2.body.message).toMatch(/overlapping/i);
    });

    it('should block leave application if remaining balance is insufficient', async () => {
      // Set remaining balance to 1 day
      await db('leave_balances')
        .where({ employee_id: employeeId, leave_type_id: clTypeId, year: 2026 })
        .update({ allocated: 1.0, used: 0.0, pending: 0.0 });

      // Attempt to apply for 3 working days (2026-11-16 to 2026-11-18)
      const res = await request(app)
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leave_type_id: clTypeId,
          from_date: '2026-11-16',
          to_date: '2026-11-18',
          reason: 'Requesting 3 days with only 1 day quota',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/insufficient leave balance/i);
    });

    it('should allow LOP (unlimited unpaid leave) even with 0 allocated balance', async () => {
      // Ensure LOP balance is 0
      await db('leave_balances')
        .where({ employee_id: employeeId, leave_type_id: lopTypeId, year: 2026 })
        .delete();

      const res = await request(app)
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leave_type_id: lopTypeId,
          from_date: '2026-11-16',
          to_date: '2026-11-17',
          reason: 'Unpaid loss of pay request',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('pending');
    });
  });

  describe('3. Balance Transitions & Approvals (in DB Transaction)', () => {
    let requestId: number;
    const leaveFrom = '2026-11-23'; // Monday
    const leaveTo = '2026-11-24'; // Tuesday (2 working days)

    beforeEach(async () => {
      // Reset balance to 12
      await db('leave_balances')
        .where({ employee_id: employeeId, leave_type_id: clTypeId, year: 2026 })
        .update({ allocated: 12.0, used: 0.0, pending: 0.0 });

      // Clean requests
      await db('leave_requests')
        .where({ employee_id: employeeId })
        .where('from_date', '>=', leaveFrom)
        .delete();

      // Clean attendance for those dates
      await db('attendance')
        .where({ employee_id: employeeId })
        .whereIn('date', [leaveFrom, leaveTo])
        .delete();

      // Submit leave request
      const res = await request(app)
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leave_type_id: clTypeId,
          from_date: leaveFrom,
          to_date: leaveTo,
          reason: 'Vacation days',
        });

      requestId = res.body.data.id;
    });

    it('should increment pending on apply, and transition pending -> used on approve', async () => {
      // 1. Verify pending is 2.0 after apply
      const balAfterApply = await db('leave_balances')
        .where({ employee_id: employeeId, leave_type_id: clTypeId, year: 2026 })
        .first();
      expect(Number(balAfterApply.pending)).toBe(2.0);
      expect(Number(balAfterApply.used)).toBe(0.0);

      // 2. Manager approves the request
      const approveRes = await request(app)
        .patch(`/api/v1/leave-requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ decision_note: 'Approved for vacation' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('approved');

      // 3. Verify balance transitioned: pending decreased by 2, used increased by 2
      const balAfterApprove = await db('leave_balances')
        .where({ employee_id: employeeId, leave_type_id: clTypeId, year: 2026 })
        .first();
      expect(Number(balAfterApprove.pending)).toBe(0.0);
      expect(Number(balAfterApprove.used)).toBe(2.0);

      // 4. Verify attendance rows written with status = leave
      const attRows = await db('attendance')
        .where({ employee_id: employeeId })
        .whereIn('date', [leaveFrom, leaveTo]);
      expect(attRows.length).toBe(2);
      expect(attRows[0].status).toBe('leave');
      expect(attRows[1].status).toBe('leave');
    });

    it('should decrement pending on reject and require decision_note', async () => {
      // 1. Attempt reject without decision_note -> 400 Bad Request
      const rejectFail = await request(app)
        .patch(`/api/v1/leave-requests/${requestId}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ decision_note: '' });

      expect(rejectFail.status).toBe(400);

      // 2. Reject with valid decision_note
      const rejectSuccess = await request(app)
        .patch(`/api/v1/leave-requests/${requestId}/reject`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ decision_note: 'High project workload this week.' });

      expect(rejectSuccess.status).toBe(200);
      expect(rejectSuccess.body.data.status).toBe('rejected');

      // 3. Verify pending balance reverted back to 0
      const balAfterReject = await db('leave_balances')
        .where({ employee_id: employeeId, leave_type_id: clTypeId, year: 2026 })
        .first();
      expect(Number(balAfterReject.pending)).toBe(0.0);
      expect(Number(balAfterReject.used)).toBe(0.0);
    });
  });

  describe('4. Self-Approval Prevention', () => {
    let mgrRequestId: number;

    beforeEach(async () => {
      // Manager applies for their own leave
      const res = await request(app)
        .post('/api/v1/leave-requests')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          leave_type_id: clTypeId,
          from_date: '2026-12-01',
          to_date: '2026-12-01',
          reason: 'Manager personal work',
        });
      mgrRequestId = res.body.data.id;
    });

    afterEach(async () => {
      await db('leave_requests').where({ id: mgrRequestId }).delete();
    });

    it('should block a person from approving their own leave request', async () => {
      const res = await request(app)
        .patch(`/api/v1/leave-requests/${mgrRequestId}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ decision_note: 'Approving my own leave' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/cannot approve your own/i);
    });

    it('should allow Admin to approve manager leave request', async () => {
      const res = await request(app)
        .patch(`/api/v1/leave-requests/${mgrRequestId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision_note: 'Approved by Admin' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('approved');
    });
  });
});
